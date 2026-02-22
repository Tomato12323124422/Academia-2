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

// GET CHILDREN LINKED TO GUARDIAN
router.get('/children', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'parent') {
            return res.status(403).json({ message: 'Only parents can access this' });
        }

        // Get linked children
        const { data: links, error } = await supabase
            .from('parent_student_links')
            .select(`
                *,
                student:users!student_id(id, full_name, email, role)
            `)
            .eq('parent_id', req.user.id);

        if (error) {
            return res.status(500).json({ message: error.message });
        }

        const children = links?.map(link => ({
            id: link.student?.id,
            full_name: link.student?.full_name,
            email: link.student?.email,
            relationship: link.relationship
        })) || [];

        res.json({ children });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET CHILD'S GRADES
router.get('/child/:childId/grades', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'parent') {
            return res.status(403).json({ message: 'Only parents can access this' });
        }

        // Verify parent is linked to this child
        const { data: link, linkError } = await supabase
            .from('parent_student_links')
            .select('*')
            .eq('parent_id', req.user.id)
            .eq('student_id', req.params.childId)
            .single();

        if (linkError || !link) {
            return res.status(403).json({ message: 'Not authorized to view this student\'s grades' });
        }

        // Get student's submissions with grades
        const { data: submissions, error } = await supabase
            .from('submissions')
            .select(`
                *,
                assignment:assignments(
                    id,
                    title,
                    points,
                    course:courses(id, title, category)
                )
            `)
            .eq('student_id', req.params.childId)
            .not('grade', 'is', null)
            .order('graded_at', { ascending: false });

        if (error) {
            return res.status(500).json({ message: error.message });
        }

        // Calculate grades
        let totalPoints = 0;
        let earnedPoints = 0;
        
        const gradesWithCourse = (submissions || []).map(submission => {
            const points = submission.assignment?.points || 100;
            const earned = submission.grade || 0;
            totalPoints += points;
            earnedPoints += earned;
            
            return {
                id: submission.id,
                assignment_title: submission.assignment?.title || 'Unknown',
                course_name: submission.assignment?.course?.title || 'Unknown',
                course_category: submission.assignment?.course?.category || 'General',
                points: points,
                grade: earned,
                percentage: Math.round((earned / points) * 100),
                feedback: submission.feedback,
                submitted_at: submission.submitted_at,
                graded_at: submission.graded_at
            };
        });

        const overallGrade = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

        res.json({ 
            grades: gradesWithCourse,
            overall: {
                total_points: totalPoints,
                earned_points: earnedPoints,
                percentage: overallGrade,
                letter_grade: getLetterGrade(overallGrade)
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET CHILD'S ATTENDANCE
router.get('/child/:childId/attendance', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'parent') {
            return res.status(403).json({ message: 'Only parents can access this' });
        }

        // Verify parent is linked to this child
        const { data: link, linkError } = await supabase
            .from('parent_student_links')
            .select('*')
            .eq('parent_id', req.user.id)
            .eq('student_id', req.params.childId)
            .single();

        if (linkError || !link) {
            return res.status(403).json({ message: 'Not authorized to view this student\'s attendance' });
        }

        // Get student's attendance records
        const { data: attendance, error } = await supabase
            .from('attendance')
            .select(`
                *,
                session:sessions(*, course:courses(title))
            `)
            .eq('student_id', req.params.childId)
            .order('marked_at', { ascending: false });

        if (error) {
            return res.status(500).json({ message: error.message });
        }

        // Calculate attendance summary
        const total = attendance?.length || 0;
        const present = attendance?.filter(a => a.status === 'present').length || 0;
        const absent = attendance?.filter(a => a.status === 'absent').length || 0;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;

        res.json({ 
            attendance: attendance || [],
            summary: {
                total,
                present,
                absent,
                rate
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET CHILD'S ACHIEVEMENTS
router.get('/child/:childId/achievements', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'parent') {
            return res.status(403).json({ message: 'Only parents can access this' });
        }

        // Verify parent is linked to this child
        const { data: link, linkError } = await supabase
            .from('parent_student_links')
            .select('*')
            .eq('parent_id', req.user.id)
            .eq('student_id', req.params.childId)
            .single();

        if (linkError || !link) {
            return res.status(403).json({ message: 'Not authorized to view this student\'s achievements' });
        }

        // Get student's stats
        const { data: stats, statsError } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', req.params.childId)
            .single();

        // Get student's badges
        const { data: badges, badgesError } = await supabase
            .from('user_badges')
            .select('*, badge:badges(*)')
            .eq('user_id', req.params.childId);

        if (badgesError) {
            return res.status(500).json({ message: badgesError.message });
        }

        const achievements = (badges || []).map(ub => ({
            id: ub.badge?.id,
            name: ub.badge?.name,
            description: ub.badge?.description,
            icon: ub.badge?.icon,
            earned_at: ub.earned_at
        }));

        res.json({ 
            achievements,
            stats: {
                xp: stats?.xp || 0,
                level: Math.floor(Math.sqrt((stats?.xp || 0) / 100)) + 1,
                streak_days: stats?.streak_days || 0
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET CHILD'S PROGRESS SUMMARY
router.get('/child/:childId/summary', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'parent') {
            return res.status(403).json({ message: 'Only parents can access this' });
        }

        // Verify parent is linked to this child
        const { data: link, linkError } = await supabase
            .from('parent_student_links')
            .select('*')
            .eq('parent_id', req.user.id)
            .eq('student_id', req.params.childId)
            .single();

        if (linkError || !link) {
            return res.status(403).json({ message: 'Not authorized to view this student\'s progress' });
        }

        // Get enrollments (courses)
        const { data: enrollments } = await supabase
            .from('enrollments')
            .select('course_id')
            .eq('student_id', req.params.childId);

        const courseCount = enrollments?.length || 0;

        // Get grades
        const { data: submissions } = await supabase
            .from('submissions')
            .select('grade, assignment:assignments(points)')
            .eq('student_id', req.params.childId)
            .not('grade', 'is', null);

        let totalPoints = 0;
        let earnedPoints = 0;
        
        submissions?.forEach(sub => {
            const points = sub.assignment?.points || 100;
            totalPoints += points;
            earnedPoints += sub.grade || 0;
        });

        const gradeAverage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

        // Get attendance
        const { data: attendance } = await supabase
            .from('attendance')
            .select('status')
            .eq('student_id', req.params.childId);

        const totalSessions = attendance?.length || 0;
        const presentSessions = attendance?.filter(a => a.status === 'present').length || 0;
        const attendanceRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

        // Get stats
        const { data: stats } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', req.params.childId)
            .single();

        res.json({
            summary: {
                courses_enrolled: courseCount,
                grade_average: gradeAverage,
                letter_grade: getLetterGrade(gradeAverage),
                attendance_rate: attendanceRate,
                xp: stats?.xp || 0,
                level: Math.floor(Math.sqrt((stats?.xp || 0) / 100)) + 1,
                streak_days: stats?.streak_days || 0
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Helper function to get letter grade
function getLetterGrade(percentage) {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
}

module.exports = router;
