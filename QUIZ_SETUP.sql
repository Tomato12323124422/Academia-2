-- ============================================
-- MASENO UNIVERSITY LMS - QUIZ FEATURE SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Quizzes Table
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    time_limit INTEGER DEFAULT 30, -- minutes
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Quiz Questions Table
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of strings ["Option A", "Option B", ...]
    correct_option INTEGER NOT NULL, -- Index 0-3
    marks INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Quiz Submissions Table
CREATE TABLE IF NOT EXISTS quiz_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total_marks INTEGER NOT NULL,
    submitted_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(quiz_id, student_id)
);

-- 4. Enable Row Level Security
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;

-- 5. Policies for quizzes
-- Allow teachers to manage their own quizzes
CREATE POLICY "Teachers can manage their own quizzes"
ON quizzes FOR ALL
USING (auth.uid() = teacher_id);

-- Allow students to view quizzes for courses they are enrolled in
CREATE POLICY "Students can view enrolled quizzes"
ON quizzes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM enrollments 
        WHERE course_id = quizzes.course_id 
        AND student_id = auth.uid()
    )
);

-- 6. Policies for quiz_questions
CREATE POLICY "Teachers can manage questions for their quizzes"
ON quiz_questions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM quizzes 
        WHERE id = quiz_questions.quiz_id 
        AND teacher_id = auth.uid()
    )
);

CREATE POLICY "Students can view questions for enrolled quizzes"
ON quiz_questions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM quizzes q
        JOIN enrollments e ON q.course_id = e.course_id
        WHERE q.id = quiz_questions.quiz_id 
        AND e.student_id = auth.uid()
    )
);

-- 7. Policies for quiz_submissions
CREATE POLICY "Students can manage their own submissions"
ON quiz_submissions FOR ALL
USING (student_id = auth.uid());

CREATE POLICY "Teachers can view submissions for their quizzes"
ON quiz_submissions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM quizzes
        WHERE id = quiz_submissions.quiz_id
        AND teacher_id = auth.uid()
    )
);

-- 8. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz ON quiz_submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student ON quiz_submissions(student_id);

SELECT 'Quiz feature setup successful!' as status;
