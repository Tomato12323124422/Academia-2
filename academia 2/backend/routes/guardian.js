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
            .select(`*, student:users!student_id(id, full_name, email, role)`)
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

// SEARCH STUDENT BY EMAIL (for preview before linking)
router.get('/search-student-by-email', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'parent') {
            return res.status(403).json({ message: 'Only parents can search for students' });
        }

        const email = req.query.email;

        if (!email || email.length < 2) {
            return res.status(400).json({ message: 'Please enter at least 2 characters' });
        }

        // Search student by email (case insensitive)
        const { data: student, error } = await supabase
            .from('users')
            .select('id, full_name, email, role')
            .ilike('email', `%${email}%`)
            .eq('role', 'student')
            .limit(10);

        if (error) {
            return res.status(500).json({ message: error.message });
        }

        if (!student || student.length === 0) {
            return res.status(404).json({ message: 'No student found with this email' });
        }

        // Check if already linked for each student
        const studentsWithLinkStatus = await Promise.all(student.map(async (s) => {
            const { data: existingLink } = await supabase
                .from('parent_student_links')
                .select('*')
                .eq('parent_id', req.user.id)
                .eq('student_id', s.id)
                .single();

            return {
                id: s.id,
                full_name: s.full_name,
                email: s.email,
                alreadyLinked: !!existingLink
            };
        }));

        res.json({ students: studentsWithLinkStatus });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// LINK CHILD BY EMAIL
router.post('/link-by-email', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'parent') {
            return res.status(403).json({ message: 'Only parents can link to students' });
        }

        const { email, relationship } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Student email is required' });
        }

        // Find student by email
        const { data: student, studentError } = await supabase
            .from('users')
            .select('id, full_name, email, role')
            .eq('email', email.toLowerCase())
            .eq('role', 'student')
            .single();

        if (studentError || !student) {
            return res.status(404).json({ message: 'Student not found with this email' });
        }

        // Check if already linked
        const { data: existingLink } = await supabase
            .from('parent_student_links')
            .select('*')
            .eq('parent_id', req.user.id)
            .eq('student_id', student.id)
            .single();

        if (existingLink) {
            return res.status(400).json({ message: 'This student is already linked to your account' });
        }

        // Create the link
        const { data: link, error } = await supabase
            .from('parent_student_links')
            .insert([{
                parent_id: req.user.id,
                student_id: student.id,
                relationship: relationship || 'Child'
            }])
            .select()
            .single();

        if (error) {
            return res.status(500).json({ message: error.message });
        }

        res.json({
            message: 'Student linked successfully!',
            child: {
                id: student.id,
                full_name: student.full_name,
                email: student.email,
                relationship: relationship || 'Child'
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET CHILD'S ENROLLED COURSES
router.get('/child/:childId/courses', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'parent') {
            return res.status(403).json({ message: 'Only parents can access this' });
        }

        // Verify parent is linked to this child
        const { data: link } = await supabase
            .from('parent_student_links')
            .select('*')
            .eq('parent_id', req.user.id)
            .eq('student_id', req.params.childId)
            .single();

        if (!link) {
            return res.status(403).json({ message: 'Not authorized to view this student\'s courses' });
        }

        // Get enrolled courses
        const { data: enrollments, error } = await supabase
            .from('enrollments')
            .select('*, course:courses(*, teacher:users(full_name))')
            .eq('student_id', req.params.childId);

        if (error) {
            return res.status(500).json({ message: error.message });
        }

        const courses = (enrollments || []).map(e => ({
            id: e.course?.id,
            title: e.course?.title || 'Unknown',
            description: e.course?.description,
            category: e.course?.category,
            duration: e.course?.duration,
            teacher: e.course?.teacher?.full_name || 'Unknown',
            enrolled_at: e.enrolled_at
        }));

        res.json({ courses });

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
        const { data: link } = await supabase
            .from('parent_student_links')
            .select('*')
            .eq('parent_id', req.user.id)
            .eq('student_id', req.params.childId)
            .single();

        if (!link) {
            return res.status(403).json({ message: 'Not authorized to view this student\'s grades' });
        }

        // Get student's submissions with grades
        const { data: submissions, error } = await supabase
            .from('submissions')
            .select('*, assignment:assignments(*, course:courses(title))')
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
        const { data: link } = await supabase
            .from('parent_student_links')
            .select('*')
            .eq('parent_id', req.user.id)
            .eq('student_id', req.params.childId)
            .single();

        if (!link) {
            return res.status(403).json({ message: 'Not authorized to view this student\'s attendance' });
        }

        // Get student's attendance records
        const { data: attendance, error } = await supabase
            .from('attendance')
            .select('*, session:sessions(*, course:courses(title))')
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
        const { data: link } = await supabase
            .from('parent_student_links')
            .select('*')
            .eq('parent_id', req.user.id)
            .eq('student_id', req.params.childId)
            .single();

        if (!link) {
            return res.status(403).json({ message: 'Not authorized to view this student\'s achievements' });
        }

        // Get student's stats
        const { data: stats } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', req.params.childId)
            .single();

        // Get student's badges
        const { data: badges } = await supabase
            .from('user_badges')
            .select('*, badge:badges(*)')
            .eq('user_id', req.params.childId);

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

// GET CHILD'S SUBMITTED ASSIGNMENTS
router.get('/child/:childId/assignments', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'parent') {
            return res.status(403).json({ message: 'Only parents can access this' });
        }

        // Verify parent is linked to this child
        const { data: link } = await supabase
            .from('parent_student_links')
            .select('*')
            .eq('parent_id', req.user.id)
            .eq('student_id', req.params.childId)
            .single();

        if (!link) {
            return res.status(403).json({ message: 'Not authorized to view this student\'s assignments' });
        }

        // Get submissions with assignment details
        const { data: submissions, error } = await supabase
            .from('submissions')
            .select('*, assignment:assignments(*, course:courses(title))')
            .eq('student_id', req.params.childId)
            .order('submitted_at', { ascending: false });

        if (error) {
            return res.status(500).json({ message: error.message });
        }

        const assignments = (submissions || []).map(sub => ({
            id: sub.id,
            title: sub.assignment?.title || 'Unknown',
            description: sub.assignment?.description,
            course_name: sub.assignment?.course?.title || 'Unknown',
            due_date: sub.assignment?.due_date,
            points: sub.assignment?.points || 100,
            grade: sub.grade,
            status: sub.status,
            submitted_at: sub.submitted_at,
            graded_at: sub.graded_at
        }));

        res.json({ assignments });

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
