-- ACADEMIA LMS - Complete Database Schema
-- Run this in Supabase SQL Editor (copy the entire content)

-- ============================================
-- 1. USERS TABLE (core)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
