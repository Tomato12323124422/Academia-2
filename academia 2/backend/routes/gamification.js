const express = require('express');
const router = express.Router();
const supabase = require('../utils/db');

// Middleware to verify JWT token
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token provided' });

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
        
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', decoded.id);

        if (error || !user || user.length === 0) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        req.user = user[0];
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// GET USER'S XP AND STATS (also called stats)
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        // Get or create user stats
        let { data: stats, error } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', req.user.id)
            .single();

        if (error || !stats) {
            // Create default stats
            const { data: newStats, insertError } = await supabase
                .from('user_stats')
                .insert([{ 
                    user_id: req.user.id,
                    xp: 0,
                    level: 1
                }])
                .select()
                .single();

            if (insertError) {
                return res.status(500).json({ message: insertError.message });
            }

            stats = newStats;
        }

        // Get badges count
        const { count: badgesCount } = await supabase
            .from('user_badges')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.user.id);

        // Calculate level from XP
        const level = calculateLevel(stats.xp || 0);

        res.json({
            stats: {
                xp: stats.xp || 0,
                level: level,
                badges_earned: badgesCount || 0,
                streak_days: stats.streak_days || 0
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Keep the my-stats endpoint too for compatibility
router.get('/my-stats', authMiddleware, async (req, res) => {
    try {
        // Get or create user stats
        let { data: stats, error } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', req.user.id)
            .single();

        if (error || !stats) {
            // Create default stats
            const { data: newStats, insertError } = await supabase
                .from('user_stats')
                .insert([{ 
                    user_id: req.user.id,
                    xp: 0,
                    level: 1
                }])
                .select()
                .single();

            if (insertError) {
                return res.status(500).json({ message: insertError.message });
            }

            stats = newStats;
        }

        // Get badges
        const { data: badges } = await supabase
            .from('user_badges')
            .select('*, badge:badges(*)')
            .eq('user_id', req.user.id);

        // Calculate level from XP
        const level = calculateLevel(stats.xp || 0);

        res.json({
            xp: stats.xp || 0,
            level: level,
            badges: badges || [],
            streak_days: stats.streak_days || 0,
            last_activity: stats.last_activity
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Helper function to calculate level from XP
function calculateLevel(xp) {
    // Level formula: level = floor(sqrt(xp / 100)) + 1
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}

// GET LEADERBOARD
router.get('/leaderboard', authMiddleware, async (req, res) => {
    try {
        const { course_id } = req.query;

        let query = supabase
            .from('user_stats')
            .select(`
                *,
                user:users(id, full_name, email, role)
            `)
            .order('xp', { ascending: false })
            .limit(20);

        const { data: stats, error } = await query;

        if (error) {
            return res.status(500).json({ message: error.message });
        }

        // Get all user IDs
        const userIds = stats.map(s => s.user_id);

        // Get attendance rates for all users (if they are students)
        let attendanceRates = {};
        
        if (course_id) {
            // Get attendance for specific course
            const { data: enrollments } = await supabase
                .from('enrollments')
                .select('student_id')
                .eq('course_id', course_id);

            const studentIds = enrollments?.map(e => e.student_id) || [];
            
            // Get sessions for this course
            const { data: sessions } = await supabase
                .from('sessions')
                .select('id')
                .eq('course_id', course_id)
                .eq('status', 'ended');

            const sessionIds = sessions?.map(s => s.id) || [];

            if (sessionIds.length > 0) {
                // Get attendance records
                const { data: attendance } = await supabase
                    .from('attendance')
                    .select('session_id, student_id')
                    .in('session_id', sessionIds)
                    .in('student_id', studentIds);

                // Calculate rate per student
                studentIds.forEach(studentId => {
                    const total = attendance?.filter(a => a.session_id === sessionIds.find(sid => 
                        attendance.some(a => a.student_id === studentId && a.session_id === sid)
                    )).length || 0;
                    const present = attendance?.filter(a => 
                        a.student_id === studentId && a.status === 'present'
                    ).length || 0;
                    
                    attendanceRates[studentId] = sessionIds.length > 0 ? 
                        Math.round((present / sessionIds.length) * 100) : 0;
                });
            }
        } else {
            // Overall attendance
            const { data: allAttendance } = await supabase
                .from('attendance')
                .select('student_id, status');

            const studentAttendance = {};
            allAttendance?.forEach(a => {
                if (!studentAttendance[a.student_id]) {
                    studentAttendance[a.student_id] = { total: 0, present: 0 };
                }
                studentAttendance[a.student_id].total++;
                if (a.status === 'present') {
                    studentAttendance[a.student_id].present++;
                }
            });

            Object.keys(studentAttendance).forEach(studentId => {
                const { total, present } = studentAttendance[studentId];
                attendanceRates[studentId] = total > 0 ? 
                    Math.round((present / total) * 100) : 0;
            });
        }

        // Format leaderboard data
        const leaderboard = stats.map((s, index) => ({
            rank: index + 1,
            user_id: s.user_id,
            full_name: s.user?.full_name || 'Unknown',
            email: s.user?.email || '',
            xp: s.xp || 0,
            level: calculateLevel(s.xp || 0),
            badges: 0, // Will be populated separately if needed
            attendance_rate: attendanceRates[s.user_id] || 0
        }));

        res.json({ leaderboard });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ADD XP TO USER
router.post('/add-xp', authMiddleware, async (req, res) => {
    try {
        const { xp_amount, reason } = req.body;

        if (!xp_amount || xp_amount <= 0) {
            return res.status(400).json({ message: 'Valid XP amount required' });
        }

        // Get current stats
        let { data: stats, error } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', req.user.id)
            .single();

        const newXP = (stats?.xp || 0) + xp_amount;
        const newLevel = calculateLevel(newXP);
        const oldLevel = stats ? calculateLevel(stats.xp || 0) : 1;
        const leveledUp = newLevel > oldLevel;

        if (stats) {
            // Update existing
            const { data, updateError } = await supabase
                .from('user_stats')
                .update({ 
                    xp: newXP,
                    level: newLevel,
                    last_activity: new Date().toISOString()
                })
                .eq('user_id', req.user.id)
                .select()
                .single();

            if (updateError) {
                return res.status(500).json({ message: updateError.message });
            }

            res.json({
                message: leveledUp ? `Level up! Now level ${newLevel}` : `Added ${xp_amount} XP`,
                xp: newXP,
                level: newLevel,
                leveled_up: leveledUp,
                reason: reason
            });
        } else {
            // Create new
            const { data, insertError } = await supabase
                .from('user_stats')
                .insert([{
                    user_id: req.user.id,
                    xp: newXP,
                    level: newLevel,
                    last_activity: new Date().toISOString()
                }])
                .select()
                .single();

            if (insertError) {
                return res.status(500).json({ message: insertError.message });
            }

            res.json({
                message: leveledUp ? `Level up! Now level ${newLevel}` : `Added ${xp_amount} XP`,
                xp: newXP,
                level: newLevel,
                leveled_up: leveledUp,
                reason: reason
            });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET ALL AVAILABLE BADGES
router.get('/badges', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('badges')
            .select('*')
            .order('xp_required', { ascending: true });

        if (error) {
            return res.status(500).json({ message: error.message });
        }

        res.json({ badges: data || [] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// CHECK AND AWARD BADGES
router.post('/check-badges', authMiddleware, async (req, res) => {
    try {
        // Get user stats
        const { data: stats } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', req.user.id)
            .single();

        const currentXP = stats?.xp || 0;

        // Get all badges user doesn't have yet
        const { data: userBadges } = await supabase
            .from('user_badges')
            .select('badge_id')
            .eq('user_id', req.user.id);

        const earnedBadgeIds = userBadges?.map(ub => ub.badge_id) || [];

        // Get badges that user qualifies for
        const { data: qualifyingBadges } = await supabase
            .from('badges')
            .select('*')
            .lte('xp_required', currentXP)
            .not('id', 'in', earnedBadgeIds.length > 0 ? earnedBadgeIds : [0]);

        // Award new badges
        const newBadges = [];
        for (const badge of qualifyingBadges || []) {
            const { data: userBadge, error } = await supabase
                .from('user_badges')
                .insert([{
                    user_id: req.user.id,
                    badge_id: badge.id,
                    earned_at: new Date().toISOString()
                }])
                .select('*, badge:badges(*)')
                .single();

            if (!error && userBadge) {
                newBadges.push(userBadge);
            }
        }

        res.json({
            new_badges: newBadges,
            total_badges: (userBadges?.length || 0) + newBadges.length
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
