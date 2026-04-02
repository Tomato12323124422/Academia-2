-- Complete ACADEMIA LMS Schema
-- Run ALL in Supabase SQL Editor

-- 1. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS sessions (
    id BIGSERIAL PRIMARY KEY, 
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date TIMESTAMP DEFAULT NOW(),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    zoom_link TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended')),
    topic TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT,
    reg_no TEXT,
    status TEXT DEFAULT 'present',
    marked_at TIMESTAMP DEFAULT NOW()
);

-- 3. RLS Policies (Admin bypass)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Sessions policies
CREATE POLICY "Teachers can manage their sessions" ON sessions FOR ALL USING (teacher_id
