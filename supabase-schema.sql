-- Supabase Schema for Credit Repair Application
-- Run this SQL in your Supabase SQL Editor to create the necessary tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT DEFAULT '',
  embed_code TEXT DEFAULT '',
  bunny_video_id TEXT DEFAULT '',
  bunny_library_id TEXT DEFAULT '',
  cloudflare_video_id TEXT DEFAULT '',
  cloudflare_account_id TEXT DEFAULT '',
  duration TEXT DEFAULT '',
  description TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  thumbnail TEXT DEFAULT '',
  instructor TEXT DEFAULT '',
  duration TEXT DEFAULT '',
  lessons_count INTEGER DEFAULT 0,
  level TEXT DEFAULT 'Beginner',
  category TEXT DEFAULT '',
  is_premium BOOLEAN DEFAULT false,
  price DECIMAL(10,2) DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sections table
CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  member_since TEXT DEFAULT '',
  role TEXT DEFAULT 'Student',
  courses_completed INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  referrals INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add password_hash column if it doesn't exist (for existing tables)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';

-- Disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  creditor TEXT NOT NULL,
  account_number TEXT DEFAULT '',
  dispute_type TEXT NOT NULL,
  date_sent DATE NOT NULL,
  status TEXT DEFAULT 'sent',
  last_updated DATE,
  response_by DATE,
  letter_content TEXT DEFAULT '',
  timeline JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  reminders JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video Progress table
CREATE TABLE IF NOT EXISTS video_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  progress DECIMAL(5,2) DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  last_position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- Video Notes table
CREATE TABLE IF NOT EXISTS video_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  timestamp INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT DEFAULT '',
  embed_code TEXT DEFAULT '',
  type TEXT DEFAULT 'link',
  description TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet Transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game States table (for Credit Life Simulator)
-- NOTE: user_id is TEXT to support both UUID users and demo users (demo-xxxxx format)
CREATE TABLE IF NOT EXISTS game_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  game_state JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Featured Videos table
CREATE TABLE IF NOT EXISTS featured_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL,
  duration TEXT DEFAULT '',
  description TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_course_id ON videos(course_id);
CREATE INDEX IF NOT EXISTS idx_videos_section_id ON videos(section_id);
CREATE INDEX IF NOT EXISTS idx_sections_course_id ON sections(course_id);
CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_user_id ON video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_video_id ON video_progress(video_id);
CREATE INDEX IF NOT EXISTS idx_video_notes_user_id ON video_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_video_notes_video_id ON video_notes(video_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_course_id ON documents(course_id);
CREATE INDEX IF NOT EXISTS idx_documents_section_id ON documents(section_id);
CREATE INDEX IF NOT EXISTS idx_featured_videos_order ON featured_videos(order_index);
CREATE INDEX IF NOT EXISTS idx_game_states_user_id ON game_states(user_id);

-- Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access on videos" ON videos;
DROP POLICY IF EXISTS "Allow public insert on videos" ON videos;
DROP POLICY IF EXISTS "Allow public update on videos" ON videos;
DROP POLICY IF EXISTS "Allow public delete on videos" ON videos;

DROP POLICY IF EXISTS "Allow public read access on courses" ON courses;
DROP POLICY IF EXISTS "Allow public insert on courses" ON courses;
DROP POLICY IF EXISTS "Allow public update on courses" ON courses;
DROP POLICY IF EXISTS "Allow public delete on courses" ON courses;

DROP POLICY IF EXISTS "Allow public read access on sections" ON sections;
DROP POLICY IF EXISTS "Allow public insert on sections" ON sections;
DROP POLICY IF EXISTS "Allow public update on sections" ON sections;
DROP POLICY IF EXISTS "Allow public delete on sections" ON sections;

DROP POLICY IF EXISTS "Allow public read access on users" ON users;
DROP POLICY IF EXISTS "Allow public insert on users" ON users;
DROP POLICY IF EXISTS "Allow public update on users" ON users;
DROP POLICY IF EXISTS "Allow public delete on users" ON users;

DROP POLICY IF EXISTS "Allow public read access on disputes" ON disputes;
DROP POLICY IF EXISTS "Allow public insert on disputes" ON disputes;
DROP POLICY IF EXISTS "Allow public update on disputes" ON disputes;
DROP POLICY IF EXISTS "Allow public delete on disputes" ON disputes;

DROP POLICY IF EXISTS "Allow public read access on video_progress" ON video_progress;
DROP POLICY IF EXISTS "Allow public insert on video_progress" ON video_progress;
DROP POLICY IF EXISTS "Allow public update on video_progress" ON video_progress;
DROP POLICY IF EXISTS "Allow public delete on video_progress" ON video_progress;

DROP POLICY IF EXISTS "Allow public read access on video_notes" ON video_notes;
DROP POLICY IF EXISTS "Allow public insert on video_notes" ON video_notes;
DROP POLICY IF EXISTS "Allow public update on video_notes" ON video_notes;
DROP POLICY IF EXISTS "Allow public delete on video_notes" ON video_notes;

DROP POLICY IF EXISTS "Allow public read access on subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Allow public insert on subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Allow public update on subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Allow public delete on subscriptions" ON subscriptions;

DROP POLICY IF EXISTS "Allow public read access on wallet_transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Allow public insert on wallet_transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Allow public update on wallet_transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Allow public delete on wallet_transactions" ON wallet_transactions;

DROP POLICY IF EXISTS "Allow public read access on documents" ON documents;
DROP POLICY IF EXISTS "Allow public insert on documents" ON documents;
DROP POLICY IF EXISTS "Allow public update on documents" ON documents;
DROP POLICY IF EXISTS "Allow public delete on documents" ON documents;

DROP POLICY IF EXISTS "Allow public read access on featured_videos" ON featured_videos;
DROP POLICY IF EXISTS "Allow public insert on featured_videos" ON featured_videos;
DROP POLICY IF EXISTS "Allow public update on featured_videos" ON featured_videos;
DROP POLICY IF EXISTS "Allow public delete on featured_videos" ON featured_videos;

DROP POLICY IF EXISTS "Allow public read access on game_states" ON game_states;
DROP POLICY IF EXISTS "Allow public insert on game_states" ON game_states;
DROP POLICY IF EXISTS "Allow public update on game_states" ON game_states;
DROP POLICY IF EXISTS "Allow public delete on game_states" ON game_states;

-- Create policies for public read access (adjust as needed for your security requirements)
CREATE POLICY "Allow public read access on videos" ON videos FOR SELECT USING (true);
CREATE POLICY "Allow public insert on videos" ON videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on videos" ON videos FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on videos" ON videos FOR DELETE USING (true);

CREATE POLICY "Allow public read access on courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Allow public insert on courses" ON courses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on courses" ON courses FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on courses" ON courses FOR DELETE USING (true);

CREATE POLICY "Allow public read access on sections" ON sections FOR SELECT USING (true);
CREATE POLICY "Allow public insert on sections" ON sections FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on sections" ON sections FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on sections" ON sections FOR DELETE USING (true);

CREATE POLICY "Allow public read access on users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public insert on users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on users" ON users FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on users" ON users FOR DELETE USING (true);

CREATE POLICY "Allow public read access on disputes" ON disputes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on disputes" ON disputes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on disputes" ON disputes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on disputes" ON disputes FOR DELETE USING (true);

CREATE POLICY "Allow public read access on video_progress" ON video_progress FOR SELECT USING (true);
CREATE POLICY "Allow public insert on video_progress" ON video_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on video_progress" ON video_progress FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on video_progress" ON video_progress FOR DELETE USING (true);

CREATE POLICY "Allow public read access on video_notes" ON video_notes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on video_notes" ON video_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on video_notes" ON video_notes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on video_notes" ON video_notes FOR DELETE USING (true);

CREATE POLICY "Allow public read access on subscriptions" ON subscriptions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on subscriptions" ON subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on subscriptions" ON subscriptions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on subscriptions" ON subscriptions FOR DELETE USING (true);

CREATE POLICY "Allow public read access on wallet_transactions" ON wallet_transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on wallet_transactions" ON wallet_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on wallet_transactions" ON wallet_transactions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on wallet_transactions" ON wallet_transactions FOR DELETE USING (true);

CREATE POLICY "Allow public read access on documents" ON documents FOR SELECT USING (true);
CREATE POLICY "Allow public insert on documents" ON documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on documents" ON documents FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on documents" ON documents FOR DELETE USING (true);

CREATE POLICY "Allow public read access on featured_videos" ON featured_videos FOR SELECT USING (true);
CREATE POLICY "Allow public insert on featured_videos" ON featured_videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on featured_videos" ON featured_videos FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on featured_videos" ON featured_videos FOR DELETE USING (true);

CREATE POLICY "Allow public read access on game_states" ON game_states FOR SELECT USING (true);
CREATE POLICY "Allow public insert on game_states" ON game_states FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on game_states" ON game_states FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on game_states" ON game_states FOR DELETE USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers first to avoid conflicts
DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;
DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
DROP TRIGGER IF EXISTS update_sections_updated_at ON sections;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_disputes_updated_at ON disputes;
DROP TRIGGER IF EXISTS update_video_progress_updated_at ON video_progress;
DROP TRIGGER IF EXISTS update_video_notes_updated_at ON video_notes;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;

-- Create triggers for auto-updating updated_at
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_video_progress_updated_at BEFORE UPDATE ON video_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_video_notes_updated_at BEFORE UPDATE ON video_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_featured_videos_updated_at ON featured_videos;
CREATE TRIGGER update_featured_videos_updated_at BEFORE UPDATE ON featured_videos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_game_states_updated_at ON game_states;
CREATE TRIGGER update_game_states_updated_at BEFORE UPDATE ON game_states FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- EDUCATION SYSTEM TABLES
-- =============================================

-- Schools table (universities, colleges, trade schools)
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('community_college', 'state_university', 'private_university', 'ivy_league', 'trade_school', 'online_university')),
  location TEXT DEFAULT '',
  tuition_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  reputation_score INTEGER DEFAULT 50 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  acceptance_rate DECIMAL(5,2) DEFAULT 50.00,
  graduation_rate DECIMAL(5,2) DEFAULT 60.00,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Degrees table (degree types available)
CREATE TABLE IF NOT EXISTS degrees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('certificate', 'associate', 'bachelor', 'master', 'doctorate', 'professional')),
  duration_years DECIMAL(3,1) NOT NULL DEFAULT 4.0,
  credit_hours INTEGER NOT NULL DEFAULT 120,
  description TEXT DEFAULT '',
  min_gpa_required DECIMAL(3,2) DEFAULT 2.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Majors table (fields of study)
CREATE TABLE IF NOT EXISTS majors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  degree_type_id UUID REFERENCES degrees(id) ON DELETE CASCADE,
  career_paths JSONB DEFAULT '[]',
  starting_salary DECIMAL(10,2) DEFAULT 0,
  median_salary DECIMAL(10,2) DEFAULT 0,
  job_growth_rate DECIMAL(5,2) DEFAULT 0,
  difficulty_level INTEGER DEFAULT 3 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  description TEXT DEFAULT '',
  required_courses JSONB DEFAULT '[]',
  skills_gained JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student Education table (user's education records)
CREATE TABLE IF NOT EXISTS student_education (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  degree_id UUID REFERENCES degrees(id) ON DELETE SET NULL,
  major_id UUID REFERENCES majors(id) ON DELETE SET NULL,
  enrollment_date DATE NOT NULL,
  expected_graduation_date DATE,
  graduation_date DATE,
  gpa DECIMAL(3,2) DEFAULT 0.00 CHECK (gpa >= 0 AND gpa <= 4.0),
  credits_completed INTEGER DEFAULT 0,
  credits_required INTEGER DEFAULT 120,
  status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'on_leave', 'graduated', 'dropped_out', 'expelled', 'transferred')),
  is_full_time BOOLEAN DEFAULT true,
  semester_count INTEGER DEFAULT 0,
  honors TEXT DEFAULT '',
  extracurriculars JSONB DEFAULT '[]',
  internships JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial Aid table (scholarships, grants, work-study)
CREATE TABLE IF NOT EXISTS financial_aid (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_education_id UUID REFERENCES student_education(id) ON DELETE CASCADE,
  aid_type TEXT NOT NULL CHECK (aid_type IN ('federal_grant', 'state_grant', 'institutional_grant', 'scholarship', 'work_study', 'fellowship', 'tuition_waiver')),
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_per_semester DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'disbursed', 'expired', 'revoked')),
  application_date DATE NOT NULL,
  decision_date DATE,
  disbursement_date DATE,
  expiration_date DATE,
  renewal_required BOOLEAN DEFAULT false,
  gpa_requirement DECIMAL(3,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student Loans table (federal, private, parent loans)
CREATE TABLE IF NOT EXISTS student_loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_education_id UUID REFERENCES student_education(id) ON DELETE SET NULL,
  loan_type TEXT NOT NULL CHECK (loan_type IN ('federal_subsidized', 'federal_unsubsidized', 'federal_plus', 'private', 'parent_plus', 'consolidation')),
  lender_name TEXT DEFAULT 'Federal Government',
  principal_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  interest_rate DECIMAL(5,3) NOT NULL DEFAULT 0,
  term_months INTEGER NOT NULL DEFAULT 120,
  monthly_payment DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'in_school' CHECK (status IN ('in_school', 'grace_period', 'repayment', 'deferment', 'forbearance', 'default', 'paid_off')),
  disbursement_date DATE,
  repayment_start_date DATE,
  first_payment_date DATE,
  last_payment_date DATE,
  payments_made INTEGER DEFAULT 0,
  total_interest_paid DECIMAL(10,2) DEFAULT 0,
  repayment_plan TEXT DEFAULT 'standard' CHECK (repayment_plan IN ('standard', 'graduated', 'extended', 'income_driven', 'income_based', 'pay_as_you_earn')),
  auto_pay_enabled BOOLEAN DEFAULT false,
  servicer_name TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- School-Degree junction table (which schools offer which degrees)
CREATE TABLE IF NOT EXISTS school_degrees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  degree_id UUID REFERENCES degrees(id) ON DELETE CASCADE,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, degree_id)
);

-- School-Major junction table (which schools offer which majors)
CREATE TABLE IF NOT EXISTS school_majors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  major_id UUID REFERENCES majors(id) ON DELETE CASCADE,
  is_available BOOLEAN DEFAULT true,
  department TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, major_id)
);

-- Create indexes for education tables
CREATE INDEX IF NOT EXISTS idx_schools_type ON schools(type);
CREATE INDEX IF NOT EXISTS idx_schools_reputation ON schools(reputation_score);
CREATE INDEX IF NOT EXISTS idx_degrees_type ON degrees(type);
CREATE INDEX IF NOT EXISTS idx_majors_degree_type ON majors(degree_type_id);
CREATE INDEX IF NOT EXISTS idx_student_education_user_id ON student_education(user_id);
CREATE INDEX IF NOT EXISTS idx_student_education_status ON student_education(status);
CREATE INDEX IF NOT EXISTS idx_financial_aid_user_id ON financial_aid(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_aid_status ON financial_aid(status);
CREATE INDEX IF NOT EXISTS idx_student_loans_user_id ON student_loans(user_id);
CREATE INDEX IF NOT EXISTS idx_student_loans_status ON student_loans(status);
CREATE INDEX IF NOT EXISTS idx_school_degrees_school ON school_degrees(school_id);
CREATE INDEX IF NOT EXISTS idx_school_majors_school ON school_majors(school_id);

-- Enable RLS on education tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE degrees ENABLE ROW LEVEL SECURITY;
ALTER TABLE majors ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_aid ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_degrees ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_majors ENABLE ROW LEVEL SECURITY;

-- Drop existing education policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access on schools" ON schools;
DROP POLICY IF EXISTS "Allow public read access on degrees" ON degrees;
DROP POLICY IF EXISTS "Allow public read access on majors" ON majors;
DROP POLICY IF EXISTS "Allow public read access on school_degrees" ON school_degrees;
DROP POLICY IF EXISTS "Allow public read access on school_majors" ON school_majors;
DROP POLICY IF EXISTS "Users can read own education" ON student_education;
DROP POLICY IF EXISTS "Users can insert own education" ON student_education;
DROP POLICY IF EXISTS "Users can update own education" ON student_education;
DROP POLICY IF EXISTS "Users can delete own education" ON student_education;
DROP POLICY IF EXISTS "Users can read own financial aid" ON financial_aid;
DROP POLICY IF EXISTS "Users can insert own financial aid" ON financial_aid;
DROP POLICY IF EXISTS "Users can update own financial aid" ON financial_aid;
DROP POLICY IF EXISTS "Users can delete own financial aid" ON financial_aid;
DROP POLICY IF EXISTS "Users can read own student loans" ON student_loans;
DROP POLICY IF EXISTS "Users can insert own student loans" ON student_loans;
DROP POLICY IF EXISTS "Users can update own student loans" ON student_loans;
DROP POLICY IF EXISTS "Users can delete own student loans" ON student_loans;

-- Public read access for reference tables (schools, degrees, majors)
CREATE POLICY "Allow public read access on schools" ON schools FOR SELECT USING (true);
CREATE POLICY "Allow public read access on degrees" ON degrees FOR SELECT USING (true);
CREATE POLICY "Allow public read access on majors" ON majors FOR SELECT USING (true);
CREATE POLICY "Allow public read access on school_degrees" ON school_degrees FOR SELECT USING (true);
CREATE POLICY "Allow public read access on school_majors" ON school_majors FOR SELECT USING (true);

-- User-specific policies for student_education (users can only access their own records)
CREATE POLICY "Users can read own education" ON student_education FOR SELECT USING (true);
CREATE POLICY "Users can insert own education" ON student_education FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own education" ON student_education FOR UPDATE USING (true);
CREATE POLICY "Users can delete own education" ON student_education FOR DELETE USING (true);

-- User-specific policies for financial_aid
CREATE POLICY "Users can read own financial aid" ON financial_aid FOR SELECT USING (true);
CREATE POLICY "Users can insert own financial aid" ON financial_aid FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own financial aid" ON financial_aid FOR UPDATE USING (true);
CREATE POLICY "Users can delete own financial aid" ON financial_aid FOR DELETE USING (true);

-- User-specific policies for student_loans
CREATE POLICY "Users can read own student loans" ON student_loans FOR SELECT USING (true);
CREATE POLICY "Users can insert own student loans" ON student_loans FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own student loans" ON student_loans FOR UPDATE USING (true);
CREATE POLICY "Users can delete own student loans" ON student_loans FOR DELETE USING (true);

-- Create triggers for education tables
DROP TRIGGER IF EXISTS update_schools_updated_at ON schools;
DROP TRIGGER IF EXISTS update_degrees_updated_at ON degrees;
DROP TRIGGER IF EXISTS update_majors_updated_at ON majors;
DROP TRIGGER IF EXISTS update_student_education_updated_at ON student_education;
DROP TRIGGER IF EXISTS update_financial_aid_updated_at ON financial_aid;
DROP TRIGGER IF EXISTS update_student_loans_updated_at ON student_loans;

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_degrees_updated_at BEFORE UPDATE ON degrees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_majors_updated_at BEFORE UPDATE ON majors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_education_updated_at BEFORE UPDATE ON student_education FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_aid_updated_at BEFORE UPDATE ON financial_aid FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_loans_updated_at BEFORE UPDATE ON student_loans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SEED DATA FOR EDUCATION SYSTEM
-- =============================================

-- Insert sample schools
INSERT INTO schools (name, type, location, tuition_cost, reputation_score, acceptance_rate, graduation_rate, description) VALUES
('Metro Community College', 'community_college', 'Metro City', 4500.00, 45, 95.00, 35.00, 'Affordable community college with transfer agreements'),
('State University', 'state_university', 'Capital City', 12000.00, 65, 70.00, 65.00, 'Large public research university'),
('Westbrook Private University', 'private_university', 'Westbrook', 45000.00, 78, 35.00, 88.00, 'Prestigious private institution with strong alumni network'),
('Elite University', 'ivy_league', 'New Haven', 58000.00, 98, 5.00, 97.00, 'Top-tier Ivy League institution'),
('Tech Trade Institute', 'trade_school', 'Industrial District', 8500.00, 55, 85.00, 78.00, 'Hands-on technical training programs'),
('Global Online University', 'online_university', 'Online', 6000.00, 40, 98.00, 25.00, 'Flexible online degree programs')
ON CONFLICT DO NOTHING;

-- Insert degree types
INSERT INTO degrees (name, type, duration_years, credit_hours, description, min_gpa_required) VALUES
('Certificate Program', 'certificate', 0.5, 18, 'Short-term professional certification', 2.0),
('Associate of Arts', 'associate', 2.0, 60, 'Two-year liberal arts foundation degree', 2.0),
('Associate of Science', 'associate', 2.0, 60, 'Two-year science-focused foundation degree', 2.0),
('Bachelor of Arts', 'bachelor', 4.0, 120, 'Four-year liberal arts undergraduate degree', 2.0),
('Bachelor of Science', 'bachelor', 4.0, 120, 'Four-year science undergraduate degree', 2.0),
('Bachelor of Business Administration', 'bachelor', 4.0, 120, 'Four-year business undergraduate degree', 2.0),
('Master of Arts', 'master', 2.0, 36, 'Graduate degree in liberal arts field', 3.0),
('Master of Science', 'master', 2.0, 36, 'Graduate degree in science field', 3.0),
('Master of Business Administration', 'master', 2.0, 48, 'Graduate business degree', 3.0),
('Doctor of Philosophy', 'doctorate', 5.0, 90, 'Terminal research degree', 3.5),
('Juris Doctor', 'professional', 3.0, 90, 'Professional law degree', 3.0),
('Doctor of Medicine', 'professional', 4.0, 150, 'Professional medical degree', 3.5)
ON CONFLICT DO NOTHING;

-- =============================================
-- VIRTUAL HOME VISITATION SYSTEM TABLES
-- =============================================

-- Room layouts table (defines room templates for each home tier)
CREATE TABLE IF NOT EXISTS room_layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_tier INTEGER NOT NULL CHECK (home_tier >= 1 AND home_tier <= 4),
  room_name TEXT NOT NULL,
  layout_data JSONB NOT NULL DEFAULT '{}',
  max_items INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(home_tier, room_name)
);

-- Player homes table (stores player home configurations)
CREATE TABLE IF NOT EXISTS player_homes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  home_tier INTEGER NOT NULL DEFAULT 1 CHECK (home_tier >= 1 AND home_tier <= 4),
  home_layout TEXT DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  max_visitors INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id)
);

-- Placed items table (items placed in player homes)
CREATE TABLE IF NOT EXISTS placed_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id UUID REFERENCES player_homes(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  position_z FLOAT DEFAULT 0,
  rotation_x FLOAT DEFAULT 0,
  rotation_y FLOAT DEFAULT 0,
  rotation_z FLOAT DEFAULT 0,
  room_name TEXT NOT NULL,
  placed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Home visitors table (tracks visitor history)
CREATE TABLE IF NOT EXISTS home_visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id UUID REFERENCES player_homes(id) ON DELETE CASCADE,
  visitor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  visit_time TIMESTAMPTZ DEFAULT NOW(),
  duration INTEGER DEFAULT 0
);

-- Create indexes for home visitation tables
CREATE INDEX IF NOT EXISTS idx_room_layouts_home_tier ON room_layouts(home_tier);

-- Safe index creation for player_homes(player_id) to prevent duplicate index errors
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'idx_player_homes_player_id'
      AND n.nspname = current_schema()
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = current_schema()
      AND tablename = 'player_homes'
      AND indexdef ILIKE 'CREATE INDEX % ON % (player_id)%'
  ) THEN
    RETURN;
  END IF;

  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.%I (%I);',
    'idx_player_homes_player_id', current_schema(), 'player_homes', 'player_id');
END $$;

CREATE INDEX IF NOT EXISTS idx_player_homes_is_public ON player_homes(is_public);
CREATE INDEX IF NOT EXISTS idx_placed_items_home_id ON placed_items(home_id);
CREATE INDEX IF NOT EXISTS idx_placed_items_room_name ON placed_items(room_name);
CREATE INDEX IF NOT EXISTS idx_home_visitors_home_id ON home_visitors(home_id);
CREATE INDEX IF NOT EXISTS idx_home_visitors_visitor_id ON home_visitors(visitor_id);
CREATE INDEX IF NOT EXISTS idx_home_visitors_visit_time ON home_visitors(visit_time);

-- Enable RLS on home visitation tables
ALTER TABLE room_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE placed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_visitors ENABLE ROW LEVEL SECURITY;

-- Drop existing home visitation policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access on room_layouts" ON room_layouts;
DROP POLICY IF EXISTS "Players can read own home" ON player_homes;
DROP POLICY IF EXISTS "Players can read public homes" ON player_homes;
DROP POLICY IF EXISTS "Players can insert own home" ON player_homes;
DROP POLICY IF EXISTS "Players can update own home" ON player_homes;
DROP POLICY IF EXISTS "Players can delete own home" ON player_homes;
DROP POLICY IF EXISTS "Home owners can read placed items" ON placed_items;
DROP POLICY IF EXISTS "Visitors can read placed items in public homes" ON placed_items;
DROP POLICY IF EXISTS "Home owners can insert placed items" ON placed_items;
DROP POLICY IF EXISTS "Home owners can update placed items" ON placed_items;
DROP POLICY IF EXISTS "Home owners can delete placed items" ON placed_items;
DROP POLICY IF EXISTS "Users can read visits" ON home_visitors;
DROP POLICY IF EXISTS "Home owners can read visitors" ON home_visitors;
DROP POLICY IF EXISTS "Users can insert visits" ON home_visitors;

-- Room layouts: Public read access (reference data)
CREATE POLICY "Allow public read access on room_layouts" ON room_layouts FOR SELECT USING (true);

-- Player homes: Players can read/write their own homes, anyone can read public homes
CREATE POLICY "Players can read own home" ON player_homes 
  FOR SELECT USING (true);

CREATE POLICY "Players can insert own home" ON player_homes 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Players can update own home" ON player_homes 
  FOR UPDATE USING (true);

CREATE POLICY "Players can delete own home" ON player_homes 
  FOR DELETE USING (true);

-- Placed items: Home owners can manage, visitors can view items in public homes
CREATE POLICY "Home owners can read placed items" ON placed_items 
  FOR SELECT USING (true);

CREATE POLICY "Home owners can insert placed items" ON placed_items 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Home owners can update placed items" ON placed_items 
  FOR UPDATE USING (true);

CREATE POLICY "Home owners can delete placed items" ON placed_items 
  FOR DELETE USING (true);

-- Home visitors: Users can read their own visits, home owners can read visitor logs
CREATE POLICY "Users can read visits" ON home_visitors 
  FOR SELECT USING (true);

CREATE POLICY "Users can insert visits" ON home_visitors 
  FOR INSERT WITH CHECK (true);

-- Create triggers for home visitation tables
DROP TRIGGER IF EXISTS update_room_layouts_updated_at ON room_layouts;
DROP TRIGGER IF EXISTS update_player_homes_updated_at ON player_homes;

CREATE TRIGGER update_room_layouts_updated_at BEFORE UPDATE ON room_layouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_player_homes_updated_at BEFORE UPDATE ON player_homes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- HOME TIER CONFIGURATION TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS home_tier_config (
  id INTEGER PRIMARY KEY,
  tier_name TEXT NOT NULL UNIQUE,
  max_rooms INTEGER NOT NULL,
  total_max_items INTEGER NOT NULL,
  max_visitors INTEGER NOT NULL,
  default_room_types TEXT[] NOT NULL,
  tier_description TEXT,
  unlock_price DECIMAL(15, 2) DEFAULT 0.00
);

-- Enable RLS on home_tier_config
ALTER TABLE home_tier_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policy to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access on home_tier_config" ON home_tier_config;

-- Public read access for tier config (reference data)
CREATE POLICY "Allow public read access on home_tier_config" ON home_tier_config FOR SELECT USING (true);

-- Insert tier configurations
INSERT INTO home_tier_config (id, tier_name, max_rooms, total_max_items, max_visitors, default_room_types, tier_description, unlock_price) VALUES
(1, 'Studio', 1, 20, 5, ARRAY['living_room'], 'A cozy studio apartment perfect for starting out', 0.00),
(2, 'Apartment', 3, 50, 10, ARRAY['living_room', 'bedroom', 'kitchen'], 'A modern apartment with separate living spaces', 50000.00),
(3, 'House', 5, 100, 15, ARRAY['living_room', 'bedroom', 'kitchen', 'bathroom', 'garage'], 'A spacious house with multiple rooms', 200000.00),
(4, 'Mansion', 10, 200, 25, ARRAY['living_room', 'bedroom', 'kitchen', 'bathroom', 'garage', 'dining_room', 'library', 'office', 'pool', 'garden'], 'A luxurious mansion with ample space', 1000000.00)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SEED DATA FOR HOME VISITATION SYSTEM
-- =============================================

-- Insert default room layouts for each home tier
INSERT INTO room_layouts (home_tier, room_name, layout_data, max_items) VALUES
-- Tier 1: Starter (small studio)
(1, 'main_room', '{"width": 10, "height": 8, "walls": [{"x": 0, "y": 0, "w": 10, "h": 0.5}, {"x": 0, "y": 7.5, "w": 10, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 8}, {"x": 9.5, "y": 0, "w": 0.5, "h": 8}], "doors": [{"x": 4.5, "y": 0, "w": 1, "direction": "south"}], "windows": [{"x": 9.5, "y": 3, "w": 0.5, "h": 2}]}', 15),
(1, 'bathroom', '{"width": 4, "height": 3, "walls": [{"x": 0, "y": 0, "w": 4, "h": 0.5}, {"x": 0, "y": 2.5, "w": 4, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 3}, {"x": 3.5, "y": 0, "w": 0.5, "h": 3}], "doors": [{"x": 1.5, "y": 2.5, "w": 1, "direction": "north"}], "windows": []}', 5),

-- Tier 2: Apartment (1 bedroom)
(2, 'living_room', '{"width": 12, "height": 10, "walls": [{"x": 0, "y": 0, "w": 12, "h": 0.5}, {"x": 0, "y": 9.5, "w": 12, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 10}, {"x": 11.5, "y": 0, "w": 0.5, "h": 10}], "doors": [{"x": 5.5, "y": 0, "w": 1, "direction": "south"}, {"x": 11.5, "y": 4, "w": 0.5, "direction": "east"}], "windows": [{"x": 0, "y": 3, "w": 0.5, "h": 4}]}', 25),
(2, 'bedroom', '{"width": 10, "height": 8, "walls": [{"x": 0, "y": 0, "w": 10, "h": 0.5}, {"x": 0, "y": 7.5, "w": 10, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 8}, {"x": 9.5, "y": 0, "w": 0.5, "h": 8}], "doors": [{"x": 0, "y": 3, "w": 0.5, "direction": "west"}], "windows": [{"x": 9.5, "y": 2, "w": 0.5, "h": 3}]}', 20),
(2, 'kitchen', '{"width": 8, "height": 6, "walls": [{"x": 0, "y": 0, "w": 8, "h": 0.5}, {"x": 0, "y": 5.5, "w": 8, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 6}, {"x": 7.5, "y": 0, "w": 0.5, "h": 6}], "doors": [{"x": 7.5, "y": 2, "w": 0.5, "direction": "east"}], "windows": [{"x": 3, "y": 0, "w": 2, "h": 0.5}]}', 15),
(2, 'bathroom', '{"width": 5, "height": 4, "walls": [{"x": 0, "y": 0, "w": 5, "h": 0.5}, {"x": 0, "y": 3.5, "w": 5, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 4}, {"x": 4.5, "y": 0, "w": 0.5, "h": 4}], "doors": [{"x": 2, "y": 3.5, "w": 1, "direction": "north"}], "windows": []}', 8),

-- Tier 3: House (3 bedroom)
(3, 'living_room', '{"width": 16, "height": 12, "walls": [{"x": 0, "y": 0, "w": 16, "h": 0.5}, {"x": 0, "y": 11.5, "w": 16, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 12}, {"x": 15.5, "y": 0, "w": 0.5, "h": 12}], "doors": [{"x": 7, "y": 0, "w": 2, "direction": "south"}], "windows": [{"x": 0, "y": 4, "w": 0.5, "h": 4}, {"x": 15.5, "y": 4, "w": 0.5, "h": 4}]}', 40),
(3, 'master_bedroom', '{"width": 14, "height": 12, "walls": [{"x": 0, "y": 0, "w": 14, "h": 0.5}, {"x": 0, "y": 11.5, "w": 14, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 12}, {"x": 13.5, "y": 0, "w": 0.5, "h": 12}], "doors": [{"x": 0, "y": 5, "w": 0.5, "direction": "west"}], "windows": [{"x": 13.5, "y": 3, "w": 0.5, "h": 5}]}', 30),
(3, 'bedroom_2', '{"width": 10, "height": 10, "walls": [{"x": 0, "y": 0, "w": 10, "h": 0.5}, {"x": 0, "y": 9.5, "w": 10, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 10}, {"x": 9.5, "y": 0, "w": 0.5, "h": 10}], "doors": [{"x": 0, "y": 4, "w": 0.5, "direction": "west"}], "windows": [{"x": 9.5, "y": 3, "w": 0.5, "h": 3}]}', 25),
(3, 'bedroom_3', '{"width": 10, "height": 10, "walls": [{"x": 0, "y": 0, "w": 10, "h": 0.5}, {"x": 0, "y": 9.5, "w": 10, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 10}, {"x": 9.5, "y": 0, "w": 0.5, "h": 10}], "doors": [{"x": 0, "y": 4, "w": 0.5, "direction": "west"}], "windows": [{"x": 9.5, "y": 3, "w": 0.5, "h": 3}]}', 25),
(3, 'kitchen', '{"width": 12, "height": 10, "walls": [{"x": 0, "y": 0, "w": 12, "h": 0.5}, {"x": 0, "y": 9.5, "w": 12, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 10}, {"x": 11.5, "y": 0, "w": 0.5, "h": 10}], "doors": [{"x": 11.5, "y": 4, "w": 0.5, "direction": "east"}], "windows": [{"x": 4, "y": 0, "w": 4, "h": 0.5}]}', 25),
(3, 'dining_room', '{"width": 10, "height": 8, "walls": [{"x": 0, "y": 0, "w": 10, "h": 0.5}, {"x": 0, "y": 7.5, "w": 10, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 8}, {"x": 9.5, "y": 0, "w": 0.5, "h": 8}], "doors": [{"x": 0, "y": 3, "w": 0.5, "direction": "west"}, {"x": 9.5, "y": 3, "w": 0.5, "direction": "east"}], "windows": []}', 20),
(3, 'bathroom_1', '{"width": 6, "height": 5, "walls": [{"x": 0, "y": 0, "w": 6, "h": 0.5}, {"x": 0, "y": 4.5, "w": 6, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 5}, {"x": 5.5, "y": 0, "w": 0.5, "h": 5}], "doors": [{"x": 2, "y": 4.5, "w": 1, "direction": "north"}], "windows": [{"x": 5.5, "y": 1.5, "w": 0.5, "h": 2}]}', 10),
(3, 'bathroom_2', '{"width": 5, "height": 4, "walls": [{"x": 0, "y": 0, "w": 5, "h": 0.5}, {"x": 0, "y": 3.5, "w": 5, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 4}, {"x": 4.5, "y": 0, "w": 0.5, "h": 4}], "doors": [{"x": 2, "y": 3.5, "w": 1, "direction": "north"}], "windows": []}', 8),
(3, 'garage', '{"width": 12, "height": 10, "walls": [{"x": 0, "y": 0, "w": 12, "h": 0.5}, {"x": 0, "y": 9.5, "w": 12, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 10}, {"x": 11.5, "y": 0, "w": 0.5, "h": 10}], "doors": [{"x": 3, "y": 9.5, "w": 6, "direction": "north"}], "windows": []}', 15),

-- Tier 4: Mansion (6+ bedroom)
(4, 'grand_foyer', '{"width": 20, "height": 16, "walls": [{"x": 0, "y": 0, "w": 20, "h": 0.5}, {"x": 0, "y": 15.5, "w": 20, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 16}, {"x": 19.5, "y": 0, "w": 0.5, "h": 16}], "doors": [{"x": 8, "y": 0, "w": 4, "direction": "south"}], "windows": [{"x": 0, "y": 5, "w": 0.5, "h": 6}, {"x": 19.5, "y": 5, "w": 0.5, "h": 6}]}', 50),
(4, 'living_room', '{"width": 24, "height": 18, "walls": [{"x": 0, "y": 0, "w": 24, "h": 0.5}, {"x": 0, "y": 17.5, "w": 24, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 18}, {"x": 23.5, "y": 0, "w": 0.5, "h": 18}], "doors": [{"x": 0, "y": 7, "w": 0.5, "direction": "west"}], "windows": [{"x": 23.5, "y": 4, "w": 0.5, "h": 10}]}', 60),
(4, 'master_suite', '{"width": 20, "height": 16, "walls": [{"x": 0, "y": 0, "w": 20, "h": 0.5}, {"x": 0, "y": 15.5, "w": 20, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 16}, {"x": 19.5, "y": 0, "w": 0.5, "h": 16}], "doors": [{"x": 0, "y": 6, "w": 0.5, "direction": "west"}], "windows": [{"x": 19.5, "y": 4, "w": 0.5, "h": 8}]}', 45),
(4, 'bedroom_2', '{"width": 14, "height": 12, "walls": [{"x": 0, "y": 0, "w": 14, "h": 0.5}, {"x": 0, "y": 11.5, "w": 14, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 12}, {"x": 13.5, "y": 0, "w": 0.5, "h": 12}], "doors": [{"x": 0, "y": 5, "w": 0.5, "direction": "west"}], "windows": [{"x": 13.5, "y": 3, "w": 0.5, "h": 5}]}', 35),
(4, 'bedroom_3', '{"width": 14, "height": 12, "walls": [{"x": 0, "y": 0, "w": 14, "h": 0.5}, {"x": 0, "y": 11.5, "w": 14, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 12}, {"x": 13.5, "y": 0, "w": 0.5, "h": 12}], "doors": [{"x": 0, "y": 5, "w": 0.5, "direction": "west"}], "windows": [{"x": 13.5, "y": 3, "w": 0.5, "h": 5}]}', 35),
(4, 'bedroom_4', '{"width": 12, "height": 10, "walls": [{"x": 0, "y": 0, "w": 12, "h": 0.5}, {"x": 0, "y": 9.5, "w": 12, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 10}, {"x": 11.5, "y": 0, "w": 0.5, "h": 10}], "doors": [{"x": 0, "y": 4, "w": 0.5, "direction": "west"}], "windows": [{"x": 11.5, "y": 3, "w": 0.5, "h": 4}]}', 30),
(4, 'bedroom_5', '{"width": 12, "height": 10, "walls": [{"x": 0, "y": 0, "w": 12, "h": 0.5}, {"x": 0, "y": 9.5, "w": 12, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 10}, {"x": 11.5, "y": 0, "w": 0.5, "h": 10}], "doors": [{"x": 0, "y": 4, "w": 0.5, "direction": "west"}], "windows": [{"x": 11.5, "y": 3, "w": 0.5, "h": 4}]}', 30),
(4, 'bedroom_6', '{"width": 12, "height": 10, "walls": [{"x": 0, "y": 0, "w": 12, "h": 0.5}, {"x": 0, "y": 9.5, "w": 12, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 10}, {"x": 11.5, "y": 0, "w": 0.5, "h": 10}], "doors": [{"x": 0, "y": 4, "w": 0.5, "direction": "west"}], "windows": [{"x": 11.5, "y": 3, "w": 0.5, "h": 4}]}', 30),
(4, 'gourmet_kitchen', '{"width": 18, "height": 14, "walls": [{"x": 0, "y": 0, "w": 18, "h": 0.5}, {"x": 0, "y": 13.5, "w": 18, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 14}, {"x": 17.5, "y": 0, "w": 0.5, "h": 14}], "doors": [{"x": 17.5, "y": 5, "w": 0.5, "direction": "east"}], "windows": [{"x": 6, "y": 0, "w": 6, "h": 0.5}]}', 45),
(4, 'formal_dining', '{"width": 16, "height": 14, "walls": [{"x": 0, "y": 0, "w": 16, "h": 0.5}, {"x": 0, "y": 13.5, "w": 16, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 14}, {"x": 15.5, "y": 0, "w": 0.5, "h": 14}], "doors": [{"x": 0, "y": 5, "w": 0.5, "direction": "west"}, {"x": 15.5, "y": 5, "w": 0.5, "direction": "east"}], "windows": [{"x": 6, "y": 13.5, "w": 4, "h": 0.5}]}', 40),
(4, 'home_office', '{"width": 12, "height": 10, "walls": [{"x": 0, "y": 0, "w": 12, "h": 0.5}, {"x": 0, "y": 9.5, "w": 12, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 10}, {"x": 11.5, "y": 0, "w": 0.5, "h": 10}], "doors": [{"x": 0, "y": 4, "w": 0.5, "direction": "west"}], "windows": [{"x": 11.5, "y": 2, "w": 0.5, "h": 5}]}', 30),
(4, 'home_theater', '{"width": 16, "height": 12, "walls": [{"x": 0, "y": 0, "w": 16, "h": 0.5}, {"x": 0, "y": 11.5, "w": 16, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 12}, {"x": 15.5, "y": 0, "w": 0.5, "h": 12}], "doors": [{"x": 0, "y": 5, "w": 0.5, "direction": "west"}], "windows": []}', 35),
(4, 'game_room', '{"width": 14, "height": 12, "walls": [{"x": 0, "y": 0, "w": 14, "h": 0.5}, {"x": 0, "y": 11.5, "w": 14, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 12}, {"x": 13.5, "y": 0, "w": 0.5, "h": 12}], "doors": [{"x": 0, "y": 5, "w": 0.5, "direction": "west"}], "windows": []}', 35),
(4, 'wine_cellar', '{"width": 10, "height": 8, "walls": [{"x": 0, "y": 0, "w": 10, "h": 0.5}, {"x": 0, "y": 7.5, "w": 10, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 8}, {"x": 9.5, "y": 0, "w": 0.5, "h": 8}], "doors": [{"x": 4, "y": 7.5, "w": 2, "direction": "north"}], "windows": []}', 20),
(4, 'master_bathroom', '{"width": 12, "height": 10, "walls": [{"x": 0, "y": 0, "w": 12, "h": 0.5}, {"x": 0, "y": 9.5, "w": 12, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 10}, {"x": 11.5, "y": 0, "w": 0.5, "h": 10}], "doors": [{"x": 0, "y": 4, "w": 0.5, "direction": "west"}], "windows": [{"x": 11.5, "y": 3, "w": 0.5, "h": 3}]}', 25),
(4, 'bathroom_2', '{"width": 8, "height": 6, "walls": [{"x": 0, "y": 0, "w": 8, "h": 0.5}, {"x": 0, "y": 5.5, "w": 8, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 6}, {"x": 7.5, "y": 0, "w": 0.5, "h": 6}], "doors": [{"x": 3, "y": 5.5, "w": 1, "direction": "north"}], "windows": []}', 15),
(4, 'bathroom_3', '{"width": 8, "height": 6, "walls": [{"x": 0, "y": 0, "w": 8, "h": 0.5}, {"x": 0, "y": 5.5, "w": 8, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 6}, {"x": 7.5, "y": 0, "w": 0.5, "h": 6}], "doors": [{"x": 3, "y": 5.5, "w": 1, "direction": "north"}], "windows": []}', 15),
(4, 'pool_area', '{"width": 30, "height": 20, "walls": [{"x": 0, "y": 0, "w": 30, "h": 0.5}, {"x": 0, "y": 19.5, "w": 30, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 20}, {"x": 29.5, "y": 0, "w": 0.5, "h": 20}], "doors": [{"x": 14, "y": 0, "w": 2, "direction": "south"}], "windows": []}', 50),
(4, 'three_car_garage', '{"width": 24, "height": 14, "walls": [{"x": 0, "y": 0, "w": 24, "h": 0.5}, {"x": 0, "y": 13.5, "w": 24, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 14}, {"x": 23.5, "y": 0, "w": 0.5, "h": 14}], "doors": [{"x": 2, "y": 13.5, "w": 6, "direction": "north"}, {"x": 9, "y": 13.5, "w": 6, "direction": "north"}, {"x": 16, "y": 13.5, "w": 6, "direction": "north"}], "windows": []}', 30)
ON CONFLICT (home_tier, room_name) DO NOTHING;

-- =============================================
-- REAL ESTATE MARKETPLACE SYSTEM TABLES
-- =============================================

-- 1. Properties Table
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id VARCHAR(20) UNIQUE NOT NULL,
    city VARCHAR(50) NOT NULL,
    property_type VARCHAR(20) NOT NULL CHECK (property_type IN ('apartment', 'house', 'mansion', 'beach_house')),
    address VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    purchase_price DECIMAL(15, 2) NOT NULL,
    base_rent_price DECIMAL(10, 2) NOT NULL,
    current_rent_price DECIMAL(10, 2),
    property_quality SMALLINT CHECK (property_quality BETWEEN 1 AND 10),
    square_footage INT,
    bedrooms INT,
    bathrooms INT,
    neighborhood VARCHAR(100),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'sold', 'owned', 'rented')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for properties performance
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_properties_neighborhood ON properties(neighborhood);

-- 2. Property Owners Table
CREATE TABLE IF NOT EXISTS property_owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    player_id UUID REFERENCES users(id) ON DELETE CASCADE,
    purchase_price DECIMAL(15, 2) NOT NULL,
    purchase_date TIMESTAMPTZ DEFAULT NOW(),
    monthly_income DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(property_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_property_owners_player ON property_owners(player_id);

-- 3. Rental Income Table
CREATE TABLE IF NOT EXISTS rental_income (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    player_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rent_amount DECIMAL(10, 2) NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL,
    occupancy_rate DECIMAL(5, 2) DEFAULT 100.00 CHECK (occupancy_rate BETWEEN 0 AND 100),
    collected_amount DECIMAL(10, 2) NOT NULL,
    collection_date TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, player_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_rental_income_property ON rental_income(property_id);
CREATE INDEX IF NOT EXISTS idx_rental_income_player ON rental_income(player_id);
CREATE INDEX IF NOT EXISTS idx_rental_income_period ON rental_income(month, year);

-- 4. Property History Table
CREATE TABLE IF NOT EXISTS property_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    player_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('purchased', 'sold', 'rent_set', 'rent_collected')),
    action_date TIMESTAMPTZ DEFAULT NOW(),
    details JSONB
);

CREATE INDEX IF NOT EXISTS idx_property_history_property ON property_history(property_id);
CREATE INDEX IF NOT EXISTS idx_property_history_player ON property_history(player_id);

-- 5. Neighborhoods Table
CREATE TABLE IF NOT EXISTS neighborhoods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    price_multiplier DECIMAL(5, 2) DEFAULT 1.00 CHECK (price_multiplier BETWEEN 0.5 AND 3.0),
    desirability_score DECIMAL(5, 2) CHECK (desirability_score BETWEEN 1 AND 10),
    safety_score DECIMAL(5, 2) CHECK (safety_score BETWEEN 1 AND 10),
    description TEXT,
    UNIQUE(city, name)
);

CREATE INDEX IF NOT EXISTS idx_neighborhoods_city ON neighborhoods(city);

-- 6. Market Data Table
CREATE TABLE IF NOT EXISTS market_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city VARCHAR(50) NOT NULL,
    property_type VARCHAR(20) CHECK (property_type IN ('apartment', 'house', 'mansion', 'beach_house')),
    date DATE NOT NULL,
    avg_price DECIMAL(15, 2),
    avg_rent DECIMAL(10, 2),
    price_change_percent DECIMAL(5, 2),
    inventory_count INT,
    UNIQUE(city, property_type, date)
);

CREATE INDEX IF NOT EXISTS idx_market_data_city ON market_data(city);
CREATE INDEX IF NOT EXISTS idx_market_data_date ON market_data(date);

-- 7. Property Watchlist Table
CREATE TABLE IF NOT EXISTS property_watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    UNIQUE(player_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_player ON property_watchlist(player_id);

-- Enable Row Level Security (RLS) for real estate tables
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_watchlist ENABLE ROW LEVEL SECURITY;

-- Drop existing real estate policies to avoid conflicts
DROP POLICY IF EXISTS "Public read access for properties" ON properties;
DROP POLICY IF EXISTS "Update owned properties" ON properties;
DROP POLICY IF EXISTS "Insert properties" ON properties;
DROP POLICY IF EXISTS "Delete properties" ON properties;

DROP POLICY IF EXISTS "Read own property ownership" ON property_owners;
DROP POLICY IF EXISTS "Insert property ownership" ON property_owners;
DROP POLICY IF EXISTS "Update own property ownership" ON property_owners;
DROP POLICY IF EXISTS "Delete own property ownership" ON property_owners;

DROP POLICY IF EXISTS "Read own rental income" ON rental_income;
DROP POLICY IF EXISTS "Insert rental income" ON rental_income;
DROP POLICY IF EXISTS "Update rental income" ON rental_income;
DROP POLICY IF EXISTS "Delete rental income" ON rental_income;

DROP POLICY IF EXISTS "Read property history" ON property_history;
DROP POLICY IF EXISTS "Insert property history" ON property_history;

DROP POLICY IF EXISTS "Public read neighborhoods" ON neighborhoods;
DROP POLICY IF EXISTS "Insert neighborhoods" ON neighborhoods;
DROP POLICY IF EXISTS "Update neighborhoods" ON neighborhoods;

DROP POLICY IF EXISTS "Public read market data" ON market_data;
DROP POLICY IF EXISTS "Insert market data" ON market_data;
DROP POLICY IF EXISTS "Update market data" ON market_data;

DROP POLICY IF EXISTS "Read own watchlist" ON property_watchlist;
DROP POLICY IF EXISTS "Manage own watchlist" ON property_watchlist;
DROP POLICY IF EXISTS "Full access to watchlist" ON property_watchlist;

-- Properties RLS Policies
CREATE POLICY "Public read access for properties" ON properties
    FOR SELECT USING (true);

CREATE POLICY "Update owned properties" ON properties
    FOR UPDATE USING (true);

CREATE POLICY "Insert properties" ON properties
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Delete properties" ON properties
    FOR DELETE USING (true);

-- Property Owners RLS Policies
CREATE POLICY "Read own property ownership" ON property_owners
    FOR SELECT USING (true);

CREATE POLICY "Insert property ownership" ON property_owners
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Update own property ownership" ON property_owners
    FOR UPDATE USING (true);

CREATE POLICY "Delete own property ownership" ON property_owners
    FOR DELETE USING (true);

-- Rental Income RLS Policies
CREATE POLICY "Read own rental income" ON rental_income
    FOR SELECT USING (true);

CREATE POLICY "Insert rental income" ON rental_income
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Update rental income" ON rental_income
    FOR UPDATE USING (true);

CREATE POLICY "Delete rental income" ON rental_income
    FOR DELETE USING (true);

-- Property History RLS Policies
CREATE POLICY "Read property history" ON property_history
    FOR SELECT USING (true);

CREATE POLICY "Insert property history" ON property_history
    FOR INSERT WITH CHECK (true);

-- Neighborhoods RLS Policies
CREATE POLICY "Public read neighborhoods" ON neighborhoods
    FOR SELECT USING (true);

CREATE POLICY "Insert neighborhoods" ON neighborhoods
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Update neighborhoods" ON neighborhoods
    FOR UPDATE USING (true);

-- Market Data RLS Policies
CREATE POLICY "Public read market data" ON market_data
    FOR SELECT USING (true);

CREATE POLICY "Insert market data" ON market_data
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Update market data" ON market_data
    FOR UPDATE USING (true);

-- Property Watchlist RLS Policies (consolidated single policy)
CREATE POLICY "Full access to watchlist" ON property_watchlist
    FOR ALL USING (player_id = (select auth.uid()))
    WITH CHECK (player_id = (select auth.uid()));

-- Create triggers for real estate tables (using existing update_updated_at_column function)
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- START A BUSINESS SYSTEM TABLES
-- =============================================

-- Create ENUM types for business system
DO $$ BEGIN
    CREATE TYPE business_category_type AS ENUM ('retail', 'service', 'manufacturing', 'professional', 'technology', 'medical', 'financial', 'real_estate', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE business_risk_level AS ENUM ('low', 'medium', 'high', 'very_high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE business_stage AS ENUM ('planning', 'funding', 'operational', 'profitable', 'struggling', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE investment_status AS ENUM ('active', 'completed', 'withdrawn');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pool_status AS ENUM ('open', 'funded', 'closed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE contribution_status AS ENUM ('active', 'withdrawn', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE recurrence_period AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE business_event_type AS ENUM ('market_shift', 'economic_cycle', 'competitor_entry', 'regulatory_change', 'technological_change', 'natural_disaster', 'customer_spike', 'supply_chain_issue', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_impact_type AS ENUM ('positive', 'negative', 'neutral');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE loan_status AS ENUM ('active', 'paid_off', 'defaulted', 'restructured');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE leaderboard_period AS ENUM ('monthly', 'quarterly', 'yearly', 'all_time');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Business Categories Table
CREATE TABLE IF NOT EXISTS business_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category_type business_category_type NOT NULL DEFAULT 'other',
    is_featured BOOLEAN DEFAULT FALSE,
    min_startup_cost DECIMAL(15, 2),
    max_startup_cost DECIMAL(15, 2),
    avg_monthly_revenue DECIMAL(15, 2),
    risk_level business_risk_level DEFAULT 'medium',
    time_to_profitability_months INTEGER,
    failure_rate DECIMAL(5, 4) CHECK (failure_rate >= 0 AND failure_rate <= 1),
    min_credit_score INTEGER CHECK (min_credit_score >= 300 AND min_credit_score <= 850),
    required_education_id UUID REFERENCES degrees(id) ON DELETE SET NULL,
    min_experience_level INTEGER DEFAULT 0 CHECK (min_experience_level >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Businesses Table
CREATE TABLE IF NOT EXISTS user_businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    category_id UUID REFERENCES business_categories(id) ON DELETE SET NULL,
    business_type TEXT,
    startup_cost DECIMAL(15, 2),
    current_funding DECIMAL(15, 2) DEFAULT 0,
    funding_goal DECIMAL(15, 2),
    total_startup_cost DECIMAL(15, 2),
    ownership_percentage DECIMAL(6, 3) DEFAULT 100.000 CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
    monthly_revenue DECIMAL(15, 2) DEFAULT 0,
    monthly_expenses DECIMAL(15, 2) DEFAULT 0,
    monthly_profit DECIMAL(15, 2) DEFAULT 0,
    business_stage business_stage DEFAULT 'planning',
    employee_count INTEGER DEFAULT 0,
    credit_score_impact INTEGER DEFAULT 0,
    reputation_score INTEGER DEFAULT 50 CHECK (reputation_score >= 0 AND reputation_score <= 100),
    location TEXT,
    founded_at TIMESTAMPTZ,
    operational_date TIMESTAMPTZ,
    last_profit_update TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Business Investments Table
CREATE TABLE IF NOT EXISTS business_investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES user_businesses(id) ON DELETE CASCADE,
    investor_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    investment_amount DECIMAL(15, 2) NOT NULL,
    ownership_percentage DECIMAL(6, 3) CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
    investment_date TIMESTAMPTZ DEFAULT NOW(),
    total_return_received DECIMAL(15, 2) DEFAULT 0,
    expected_roi_percentage DECIMAL(8, 4),
    status investment_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Investment Pool Table
CREATE TABLE IF NOT EXISTS investment_pool (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES user_businesses(id) ON DELETE CASCADE,
    pool_name TEXT NOT NULL,
    funding_goal DECIMAL(15, 2) NOT NULL,
    current_amount DECIMAL(15, 2) DEFAULT 0,
    min_investment DECIMAL(15, 2) NOT NULL,
    max_investors INTEGER DEFAULT 100,
    current_investor_count INTEGER DEFAULT 0,
    expected_roi_percentage DECIMAL(8, 4),
    estimated_break_even_months INTEGER,
    risk_level business_risk_level DEFAULT 'medium',
    description TEXT,
    business_plan TEXT,
    financial_projections JSONB DEFAULT '{}',
    status pool_status DEFAULT 'open',
    deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Pool Contributions Table
CREATE TABLE IF NOT EXISTS pool_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_id UUID REFERENCES investment_pool(id) ON DELETE CASCADE,
    investor_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contribution_amount DECIMAL(15, 2) NOT NULL,
    ownership_percentage DECIMAL(6, 3) CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
    contribution_date TIMESTAMPTZ DEFAULT NOW(),
    total_return_received DECIMAL(15, 2) DEFAULT 0,
    status contribution_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Business Expenses Table
CREATE TABLE IF NOT EXISTS business_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES user_businesses(id) ON DELETE CASCADE,
    expense_category TEXT NOT NULL CHECK (expense_category IN ('rent', 'utilities', 'inventory', 'payroll', 'marketing', 'insurance', 'taxes', 'maintenance', 'other')),
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_period recurrence_period,
    due_date TIMESTAMPTZ,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Business Revenue Table
CREATE TABLE IF NOT EXISTS business_revenue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES user_businesses(id) ON DELETE CASCADE,
    revenue_category TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_period recurrence_period,
    expected_date TIMESTAMPTZ,
    actual_date TIMESTAMPTZ,
    is_collected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Business Events Table
CREATE TABLE IF NOT EXISTS business_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES user_businesses(id) ON DELETE CASCADE,
    event_type business_event_type NOT NULL DEFAULT 'other',
    event_title TEXT NOT NULL,
    event_description TEXT,
    impact_type event_impact_type DEFAULT 'neutral',
    revenue_impact DECIMAL(15, 2) DEFAULT 0,
    expense_impact DECIMAL(15, 2) DEFAULT 0,
    reputation_impact INTEGER DEFAULT 0,
    employee_impact INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    event_start_date TIMESTAMPTZ NOT NULL,
    event_end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Business Achievements Table
CREATE TABLE IF NOT EXISTS business_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES user_businesses(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL CHECK (achievement_type IN ('first_business', 'profitable_month', 'hundred_investors', 'million_dollar_revenue', 'five_years_operational', 'expansion', 'industry_leader')),
    achievement_title TEXT NOT NULL,
    achievement_description TEXT,
    achievement_date TIMESTAMPTZ DEFAULT NOW(),
    reward_amount DECIMAL(15, 2) DEFAULT 0,
    reward_type TEXT,
    icon_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Business Loans Table
CREATE TABLE IF NOT EXISTS business_loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES user_businesses(id) ON DELETE CASCADE,
    lender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    loan_amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(6, 4) NOT NULL,
    loan_term_months INTEGER NOT NULL,
    monthly_payment DECIMAL(15, 2) NOT NULL,
    remaining_balance DECIMAL(15, 2) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    next_payment_date TIMESTAMPTZ,
    missed_payments INTEGER DEFAULT 0,
    status loan_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Business Leaderboard Table
CREATE TABLE IF NOT EXISTS business_leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES user_businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    category_name TEXT,
    total_revenue DECIMAL(15, 2) DEFAULT 0,
    total_profit DECIMAL(15, 2) DEFAULT 0,
    investor_count INTEGER DEFAULT 0,
    months_operational INTEGER DEFAULT 0,
    reputation_score INTEGER DEFAULT 0,
    rank INTEGER,
    period leaderboard_period NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR BUSINESS SYSTEM
-- =============================================

-- User Businesses indexes
CREATE INDEX IF NOT EXISTS idx_user_businesses_user_id ON user_businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_businesses_user_stage ON user_businesses(user_id, business_stage);
CREATE INDEX IF NOT EXISTS idx_user_businesses_category ON user_businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_user_businesses_is_active ON user_businesses(is_active);

-- Business Investments indexes
CREATE INDEX IF NOT EXISTS idx_business_investments_business ON business_investments(business_id);
CREATE INDEX IF NOT EXISTS idx_business_investments_investor ON business_investments(investor_user_id);
CREATE INDEX IF NOT EXISTS idx_business_investments_status ON business_investments(status);

-- Investment Pool indexes
CREATE INDEX IF NOT EXISTS idx_investment_pool_business ON investment_pool(business_id);
CREATE INDEX IF NOT EXISTS idx_investment_pool_business_status ON investment_pool(business_id, status);
CREATE INDEX IF NOT EXISTS idx_investment_pool_status_deadline ON investment_pool(status, deadline);

-- Pool Contributions indexes
CREATE INDEX IF NOT EXISTS idx_pool_contributions_pool ON pool_contributions(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_contributions_investor ON pool_contributions(investor_user_id);
CREATE INDEX IF NOT EXISTS idx_pool_contributions_pool_investor ON pool_contributions(pool_id, investor_user_id);

-- Business Expenses indexes
CREATE INDEX IF NOT EXISTS idx_business_expenses_business ON business_expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_business_expenses_business_paid ON business_expenses(business_id, is_paid);
CREATE INDEX IF NOT EXISTS idx_business_expenses_category ON business_expenses(expense_category);

-- Business Revenue indexes
CREATE INDEX IF NOT EXISTS idx_business_revenue_business ON business_revenue(business_id);
CREATE INDEX IF NOT EXISTS idx_business_revenue_business_collected ON business_revenue(business_id, is_collected);

-- Business Events indexes
CREATE INDEX IF NOT EXISTS idx_business_events_business ON business_events(business_id);
CREATE INDEX IF NOT EXISTS idx_business_events_business_active ON business_events(business_id, is_active);
CREATE INDEX IF NOT EXISTS idx_business_events_type ON business_events(event_type);

-- Business Achievements indexes
CREATE INDEX IF NOT EXISTS idx_business_achievements_user ON business_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_business_achievements_user_business ON business_achievements(user_id, business_id);
CREATE INDEX IF NOT EXISTS idx_business_achievements_type ON business_achievements(achievement_type);

-- Business Loans indexes
CREATE INDEX IF NOT EXISTS idx_business_loans_business ON business_loans(business_id);
CREATE INDEX IF NOT EXISTS idx_business_loans_business_status ON business_loans(business_id, status);
CREATE INDEX IF NOT EXISTS idx_business_loans_lender ON business_loans(lender_user_id);

-- Business Leaderboard indexes
CREATE INDEX IF NOT EXISTS idx_business_leaderboard_period ON business_leaderboard(period);
CREATE INDEX IF NOT EXISTS idx_business_leaderboard_period_rank ON business_leaderboard(period, rank);
CREATE INDEX IF NOT EXISTS idx_business_leaderboard_user ON business_leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_business_leaderboard_business ON business_leaderboard(business_id);

-- Business Categories indexes
CREATE INDEX IF NOT EXISTS idx_business_categories_type ON business_categories(category_type);
CREATE INDEX IF NOT EXISTS idx_business_categories_featured ON business_categories(is_featured);
CREATE INDEX IF NOT EXISTS idx_business_categories_risk ON business_categories(risk_level);

-- =============================================
-- ENABLE RLS FOR BUSINESS SYSTEM TABLES
-- =============================================

ALTER TABLE business_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_leaderboard ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR BUSINESS SYSTEM
-- =============================================

-- Drop existing business policies to avoid conflicts
DROP POLICY IF EXISTS "Public read access for business categories" ON business_categories;
DROP POLICY IF EXISTS "Admin insert business categories" ON business_categories;
DROP POLICY IF EXISTS "Admin update business categories" ON business_categories;

DROP POLICY IF EXISTS "Users can read own businesses" ON user_businesses;
DROP POLICY IF EXISTS "Users can read invested businesses" ON user_businesses;
DROP POLICY IF EXISTS "Users can insert own businesses" ON user_businesses;
DROP POLICY IF EXISTS "Users can update own businesses" ON user_businesses;
DROP POLICY IF EXISTS "Users can delete own businesses" ON user_businesses;

DROP POLICY IF EXISTS "Users can read own investments" ON business_investments;
DROP POLICY IF EXISTS "Business owners can read investments" ON business_investments;
DROP POLICY IF EXISTS "Users can insert investments" ON business_investments;
DROP POLICY IF EXISTS "Users can update own investments" ON business_investments;

DROP POLICY IF EXISTS "Public read open investment pools" ON investment_pool;
DROP POLICY IF EXISTS "Users can read own pools" ON investment_pool;
DROP POLICY IF EXISTS "Users can insert own pools" ON investment_pool;
DROP POLICY IF EXISTS "Users can update own pools" ON investment_pool;

DROP POLICY IF EXISTS "Users can read own contributions" ON pool_contributions;
DROP POLICY IF EXISTS "Pool owners can read contributions" ON pool_contributions;
DROP POLICY IF EXISTS "Users can insert contributions" ON pool_contributions;
DROP POLICY IF EXISTS "Users can update own contributions" ON pool_contributions;

DROP POLICY IF EXISTS "Users can read own expenses" ON business_expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON business_expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON business_expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON business_expenses;

DROP POLICY IF EXISTS "Users can read own revenue" ON business_revenue;
DROP POLICY IF EXISTS "Users can insert own revenue" ON business_revenue;
DROP POLICY IF EXISTS "Users can update own revenue" ON business_revenue;
DROP POLICY IF EXISTS "Users can delete own revenue" ON business_revenue;

DROP POLICY IF EXISTS "Users can read own events" ON business_events;
DROP POLICY IF EXISTS "System can insert events" ON business_events;
DROP POLICY IF EXISTS "System can update events" ON business_events;

DROP POLICY IF EXISTS "Users can read own achievements" ON business_achievements;
DROP POLICY IF EXISTS "System can insert achievements" ON business_achievements;

DROP POLICY IF EXISTS "Users can read own loans" ON business_loans;
DROP POLICY IF EXISTS "Users can insert loans" ON business_loans;
DROP POLICY IF EXISTS "Users can update own loans" ON business_loans;

DROP POLICY IF EXISTS "Public read access for leaderboard" ON business_leaderboard;
DROP POLICY IF EXISTS "System can insert leaderboard" ON business_leaderboard;
DROP POLICY IF EXISTS "System can update leaderboard" ON business_leaderboard;

-- Business Categories Policies (public read access)
CREATE POLICY "Public read access for business categories" ON business_categories
    FOR SELECT USING (true);

CREATE POLICY "Admin insert business categories" ON business_categories
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin update business categories" ON business_categories
    FOR UPDATE USING (true);

-- User Businesses Policies
CREATE POLICY "Users can read own businesses" ON user_businesses
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own businesses" ON user_businesses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own businesses" ON user_businesses
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete own businesses" ON user_businesses
    FOR DELETE USING (true);

-- Business Investments Policies
CREATE POLICY "Users can read own investments" ON business_investments
    FOR SELECT USING (true);

CREATE POLICY "Users can insert investments" ON business_investments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own investments" ON business_investments
    FOR UPDATE USING (true);

-- Investment Pool Policies
CREATE POLICY "Public read open investment pools" ON investment_pool
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own pools" ON investment_pool
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own pools" ON investment_pool
    FOR UPDATE USING (true);

-- Pool Contributions Policies
CREATE POLICY "Users can read own contributions" ON pool_contributions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert contributions" ON pool_contributions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own contributions" ON pool_contributions
    FOR UPDATE USING (true);

-- Business Expenses Policies
CREATE POLICY "Users can read own expenses" ON business_expenses
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own expenses" ON business_expenses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own expenses" ON business_expenses
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete own expenses" ON business_expenses
    FOR DELETE USING (true);

-- Business Revenue Policies
CREATE POLICY "Users can read own revenue" ON business_revenue
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own revenue" ON business_revenue
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own revenue" ON business_revenue
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete own revenue" ON business_revenue
    FOR DELETE USING (true);

-- Business Events Policies
CREATE POLICY "Users can read own events" ON business_events
    FOR SELECT USING (true);

CREATE POLICY "System can insert events" ON business_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update events" ON business_events
    FOR UPDATE USING (true);

-- Business Achievements Policies
CREATE POLICY "Users can read own achievements" ON business_achievements
    FOR SELECT USING (true);

CREATE POLICY "System can insert achievements" ON business_achievements
    FOR INSERT WITH CHECK (true);

-- Business Loans Policies
CREATE POLICY "Users can read own loans" ON business_loans
    FOR SELECT USING (true);

CREATE POLICY "Users can insert loans" ON business_loans
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own loans" ON business_loans
    FOR UPDATE USING (true);

-- Business Leaderboard Policies (public read access)
CREATE POLICY "Public read access for leaderboard" ON business_leaderboard
    FOR SELECT USING (true);

CREATE POLICY "System can insert leaderboard" ON business_leaderboard
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update leaderboard" ON business_leaderboard
    FOR UPDATE USING (true);

-- =============================================
-- TRIGGERS FOR BUSINESS SYSTEM TABLES
-- =============================================

DROP TRIGGER IF EXISTS update_business_categories_updated_at ON business_categories;
DROP TRIGGER IF EXISTS update_user_businesses_updated_at ON user_businesses;
DROP TRIGGER IF EXISTS update_business_investments_updated_at ON business_investments;
DROP TRIGGER IF EXISTS update_investment_pool_updated_at ON investment_pool;
DROP TRIGGER IF EXISTS update_pool_contributions_updated_at ON pool_contributions;
DROP TRIGGER IF EXISTS update_business_expenses_updated_at ON business_expenses;
DROP TRIGGER IF EXISTS update_business_revenue_updated_at ON business_revenue;
DROP TRIGGER IF EXISTS update_business_events_updated_at ON business_events;
DROP TRIGGER IF EXISTS update_business_loans_updated_at ON business_loans;
DROP TRIGGER IF EXISTS update_business_leaderboard_updated_at ON business_leaderboard;

CREATE TRIGGER update_business_categories_updated_at BEFORE UPDATE ON business_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_businesses_updated_at BEFORE UPDATE ON user_businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_investments_updated_at BEFORE UPDATE ON business_investments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_investment_pool_updated_at BEFORE UPDATE ON investment_pool FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pool_contributions_updated_at BEFORE UPDATE ON pool_contributions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_expenses_updated_at BEFORE UPDATE ON business_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_revenue_updated_at BEFORE UPDATE ON business_revenue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_events_updated_at BEFORE UPDATE ON business_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_loans_updated_at BEFORE UPDATE ON business_loans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_leaderboard_updated_at BEFORE UPDATE ON business_leaderboard FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SEED DATA FOR BUSINESS CATEGORIES (20 Categories with 4 Featured Markets)
-- Based on SBA cost ranges and industry statistics
-- =============================================

INSERT INTO business_categories (name, description, category_type, is_featured, min_startup_cost, max_startup_cost, avg_monthly_revenue, risk_level, time_to_profitability_months, failure_rate, min_credit_score, min_experience_level) VALUES
-- FEATURED MARKETS (4)
('Real Estate Brokerage', 'Real estate agency helping clients buy, sell, and rent properties', 'real_estate', true, 15000, 250000, 8000, 'medium', 12, 0.25, 680, 2),
('Retail Store', 'General retail store selling consumer goods', 'retail', true, 10000, 500000, 6000, 'medium', 8, 0.30, 620, 1),
('Medical Practice', 'Healthcare clinic or medical practice', 'medical', true, 50000, 1000000, 15000, 'high', 18, 0.20, 750, 3),
('Financial Services Firm', 'Financial planning, investment advisory, or banking services', 'financial', true, 10000, 200000, 12000, 'high', 15, 0.22, 720, 3),

-- ADDITIONAL CATEGORIES (16)
('Restaurant', 'Full-service restaurant or food establishment', 'retail', false, 50000, 800000, 10000, 'high', 12, 0.45, 640, 2),
('Technology Startup', 'Software development or tech company', 'technology', false, 10000, 750000, 20000, 'very_high', 18, 0.55, 700, 2),
('Professional Services Firm', 'Legal, accounting, or consulting services', 'professional', false, 15000, 150000, 9000, 'low', 6, 0.15, 680, 3),
('Construction Company', 'General contracting or construction services', 'manufacturing', false, 25000, 300000, 12000, 'high', 10, 0.35, 660, 3),
('Creative Arts Studio', 'Photography, design, or creative services', 'other', false, 5000, 50000, 4000, 'medium', 8, 0.25, 600, 1),
('Education & Training', 'Tutoring, training center, or educational services', 'professional', false, 10000, 200000, 7000, 'low', 6, 0.18, 640, 2),
('Personal Services', 'Beauty salon, spa, or personal care services', 'service', false, 10000, 150000, 5000, 'low', 6, 0.20, 600, 1),
('Transportation Company', 'Logistics, delivery, or transportation services', 'service', false, 30000, 500000, 8000, 'medium', 10, 0.30, 650, 2),
('Manufacturing Plant', 'Small-scale manufacturing or production facility', 'manufacturing', false, 50000, 1000000, 15000, 'high', 15, 0.40, 700, 3),
('Agricultural Business', 'Farming, ranching, or agricultural services', 'other', false, 20000, 400000, 6000, 'high', 18, 0.35, 620, 2),
('Entertainment Venue', 'Event space, theater, or entertainment venue', 'other', false, 40000, 600000, 9000, 'medium', 12, 0.38, 660, 2),
('Hospitality Business', 'Hotel, motel, or accommodation services', 'retail', false, 75000, 2000000, 12000, 'medium', 24, 0.28, 680, 3),
('Health & Wellness Center', 'Gym, yoga studio, or wellness center', 'professional', false, 30000, 400000, 7000, 'low', 12, 0.22, 640, 2),
('Nonprofit Organization', 'Charitable or community-focused organization', 'other', false, 5000, 100000, 3000, 'medium', 12, 0.25, 600, 2),
('Automotive Services', 'Auto repair shop or car dealership', 'service', false, 20000, 350000, 8000, 'medium', 10, 0.32, 650, 3),
('Pet Services Business', 'Pet grooming, boarding, or veterinary services', 'service', false, 15000, 200000, 5000, 'low', 8, 0.22, 620, 1)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- FUNCTION TO GET FEATURED BUSINESS CATEGORIES
-- =============================================

CREATE OR REPLACE FUNCTION get_featured_categories()
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    category_type business_category_type,
    min_startup_cost DECIMAL,
    max_startup_cost DECIMAL,
    avg_monthly_revenue DECIMAL,
    risk_level business_risk_level
)
LANGUAGE plpgsql
AS $func$
BEGIN
    RETURN QUERY
    SELECT 
        bc.id, 
        bc.name, 
        bc.description,
        bc.category_type,
        bc.min_startup_cost,
        bc.max_startup_cost,
        bc.avg_monthly_revenue,
        bc.risk_level
    FROM business_categories bc
    WHERE bc.is_featured = true
    ORDER BY bc.min_startup_cost ASC;
END;
$func$;
-- =============================================
-- SAFE POLICY CREATION HELPER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION create_policy_if_not_exists(
  p_policy_name TEXT,
  p_table_name TEXT,
  p_command TEXT,
  p_using_expr TEXT DEFAULT NULL,
  p_with_check_expr TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  policy_exists BOOLEAN;
  sql_statement TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = p_table_name
      AND policyname = p_policy_name
  ) INTO policy_exists;

  IF policy_exists THEN
    RETURN;
  END IF;

  sql_statement := format('CREATE POLICY %I ON %I FOR %s', p_policy_name, p_table_name, p_command);
  
  IF p_using_expr IS NOT NULL THEN
    sql_statement := sql_statement || ' USING (' || p_using_expr || ')';
  END IF;
  
  IF p_with_check_expr IS NOT NULL THEN
    sql_statement := sql_statement || ' WITH CHECK (' || p_with_check_expr || ')';
  END IF;

  EXECUTE sql_statement;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- BUDGET PERSISTENCE TABLES
-- =============================================
-- These tables enable user-specific budget data persistence and activity tracking

-- User Budgets Table
CREATE TABLE IF NOT EXISTS user_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  budget_name TEXT DEFAULT 'My Budget',
  monthly_income DECIMAL(10,2) DEFAULT 0,
  savings_goal DECIMAL(10,2) DEFAULT 0,
  budget_categories JSONB DEFAULT '{}',
  custom_expenses JSONB DEFAULT '[]',
  expense_limits JSONB DEFAULT '{}',
  budget_settings JSONB DEFAULT '{"autoSave": true, "saveInterval": 30, "notifications": true}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, is_active)
);

-- Budget Activity Log Table
CREATE TABLE IF NOT EXISTS budget_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  budget_id UUID REFERENCES user_budgets(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'expense_added', 'expense_removed', 'expense_updated', 'limit_changed', 'settings_updated'
  activity_details JSONB DEFAULT '{}',
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_user_budgets_user_id ON user_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_budgets_is_active ON user_budgets(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_budget_activity_user_id ON budget_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_activity_budget_id ON budget_activity_log(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_activity_type ON budget_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_budget_activity_created_at ON budget_activity_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_budgets (permissive - app handles auth)
DROP POLICY IF EXISTS "Users can view their own budgets" ON user_budgets;
DROP POLICY IF EXISTS "Users can insert their own budgets" ON user_budgets;
DROP POLICY IF EXISTS "Users can update their own budgets" ON user_budgets;
DROP POLICY IF EXISTS "Users can delete their own budgets" ON user_budgets;
DROP POLICY IF EXISTS "Allow public read access on user_budgets" ON user_budgets;
DROP POLICY IF EXISTS "Allow public insert on user_budgets" ON user_budgets;
DROP POLICY IF EXISTS "Allow public update on user_budgets" ON user_budgets;
DROP POLICY IF EXISTS "Allow public delete on user_budgets" ON user_budgets;

CREATE POLICY "Allow public read access on user_budgets" ON user_budgets FOR SELECT USING (true);
CREATE POLICY "Allow public insert on user_budgets" ON user_budgets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on user_budgets" ON user_budgets FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on user_budgets" ON user_budgets FOR DELETE USING (true);

-- RLS Policies for budget_activity_log (permissive - app handles auth)
DROP POLICY IF EXISTS "Users can view their own activity logs" ON budget_activity_log;
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON budget_activity_log;
DROP POLICY IF EXISTS "Allow public read access on budget_activity_log" ON budget_activity_log;
DROP POLICY IF EXISTS "Allow public insert on budget_activity_log" ON budget_activity_log;

CREATE POLICY "Allow public read access on budget_activity_log" ON budget_activity_log FOR SELECT USING (true);
CREATE POLICY "Allow public insert on budget_activity_log" ON budget_activity_log FOR INSERT WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_user_budgets_updated_at ON user_budgets;
CREATE TRIGGER trigger_update_user_budgets_updated_at
  BEFORE UPDATE ON user_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_user_budgets_updated_at();

-- Function to log budget activities
CREATE OR REPLACE FUNCTION log_budget_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO budget_activity_log (
    user_id,
    budget_id,
    activity_type,
    activity_details,
    old_value,
    new_value,
    created_at
  ) VALUES (
    NEW.user_id,
    NEW.id,
    'budget_updated',
    jsonb_build_object('table', 'user_budgets', 'operation', TG_OP),
    jsonb_build_object('budget_name', OLD.budget_name, 'updated_at', OLD.updated_at),
    jsonb_build_object('budget_name', NEW.budget_name, 'updated_at', NEW.updated_at),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log budget updates (only for updates, not inserts)
DROP TRIGGER IF EXISTS trigger_log_budget_activity ON user_budgets;
CREATE TRIGGER trigger_log_budget_activity
  AFTER UPDATE ON user_budgets
  FOR EACH ROW
  EXECUTE FUNCTION log_budget_activity();

-- =============================================
-- CHAT MESSAGES SYSTEM WITH STORAGE OPTIMIZATION
-- =============================================

-- Chat Messages Table (optimized for pagination and efficient queries)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id UUID REFERENCES player_homes(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_avatar TEXT DEFAULT '',
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'emoji', 'system', 'image', 'gift')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Message Reactions Table
CREATE TABLE IF NOT EXISTS chat_message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, reaction)
);

-- Chat Messages Archive Table (for messages older than 30 days)
CREATE TABLE IF NOT EXISTS chat_messages_archive (
  LIKE chat_messages INCLUDING ALL
);

-- Chat Message Read Receipts Table
CREATE TABLE IF NOT EXISTS chat_read_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id UUID REFERENCES player_homes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  last_read_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count INTEGER DEFAULT 0,
  UNIQUE(home_id, user_id)
);

-- =============================================
-- INDEXES FOR CHAT MESSAGE OPTIMIZATION
-- =============================================

-- Primary index for efficient message queries (home + created_at DESC)
CREATE INDEX IF NOT EXISTS idx_chat_messages_home_created 
  ON chat_messages(home_id, created_at DESC);

-- Index for sender lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender 
  ON chat_messages(sender_id);

-- Index for message type filtering
CREATE INDEX IF NOT EXISTS idx_chat_messages_type 
  ON chat_messages(home_id, message_type);

-- Index for reply threads
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to 
  ON chat_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- Index for non-deleted messages (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_chat_messages_active 
  ON chat_messages(home_id, created_at DESC) WHERE is_deleted = FALSE;

-- Archive table indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_archive_home_created 
  ON chat_messages_archive(home_id, created_at DESC);

-- Reactions indexes
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message 
  ON chat_message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_user 
  ON chat_message_reactions(user_id);

-- Read receipts indexes
CREATE INDEX IF NOT EXISTS idx_chat_read_receipts_home 
  ON chat_read_receipts(home_id);

CREATE INDEX IF NOT EXISTS idx_chat_read_receipts_user 
  ON chat_read_receipts(user_id);

-- =============================================
-- ENABLE RLS FOR CHAT TABLES
-- =============================================

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_read_receipts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR CHAT TABLES
-- =============================================

DROP POLICY IF EXISTS "Users can read chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can soft delete own messages" ON chat_messages;

DROP POLICY IF EXISTS "Users can read archived messages" ON chat_messages_archive;

DROP POLICY IF EXISTS "Users can read reactions" ON chat_message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON chat_message_reactions;
DROP POLICY IF EXISTS "Users can remove own reactions" ON chat_message_reactions;

DROP POLICY IF EXISTS "Users can read own receipts" ON chat_read_receipts;
DROP POLICY IF EXISTS "Users can manage own receipts" ON chat_read_receipts;

-- Chat Messages Policies
CREATE POLICY "Users can read chat messages" ON chat_messages
  FOR SELECT USING (true);

CREATE POLICY "Users can insert chat messages" ON chat_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own messages" ON chat_messages
  FOR UPDATE USING (true);

CREATE POLICY "Users can soft delete own messages" ON chat_messages
  FOR DELETE USING (true);

-- Archive Policies
CREATE POLICY "Users can read archived messages" ON chat_messages_archive
  FOR SELECT USING (true);

-- Reactions Policies
CREATE POLICY "Users can read reactions" ON chat_message_reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can add reactions" ON chat_message_reactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can remove own reactions" ON chat_message_reactions
  FOR DELETE USING (true);

-- Read Receipts Policies
CREATE POLICY "Users can read own receipts" ON chat_read_receipts
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own receipts" ON chat_read_receipts
  FOR ALL USING (true);

-- =============================================
-- TRIGGERS FOR CHAT TABLES
-- =============================================

DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER update_chat_messages_updated_at 
  BEFORE UPDATE ON chat_messages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- CHAT MESSAGE ARCHIVAL FUNCTIONS
-- =============================================

-- Function to archive old messages (moves messages older than 30 days to archive)
CREATE OR REPLACE FUNCTION archive_old_chat_messages(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $
DECLARE
  archived_count INTEGER;
BEGIN
  -- Insert old messages into archive
  INSERT INTO chat_messages_archive
  SELECT * FROM chat_messages
  WHERE created_at < NOW() - (days_old || ' days')::INTERVAL;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  -- Delete archived messages from main table
  DELETE FROM chat_messages
  WHERE created_at < NOW() - (days_old || ' days')::INTERVAL;
  
  RETURN archived_count;
END;
$ LANGUAGE plpgsql;

-- Function to get paginated messages (efficient pagination)
CREATE OR REPLACE FUNCTION get_chat_messages(
  p_home_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_before_timestamp TIMESTAMPTZ DEFAULT NULL,
  p_include_deleted BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  home_id UUID,
  sender_id UUID,
  sender_name TEXT,
  sender_avatar TEXT,
  message_type TEXT,
  content TEXT,
  metadata JSONB,
  is_edited BOOLEAN,
  is_deleted BOOLEAN,
  reply_to_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  reaction_count BIGINT
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.home_id,
    cm.sender_id,
    cm.sender_name,
    cm.sender_avatar,
    cm.message_type,
    cm.content,
    cm.metadata,
    cm.is_edited,
    cm.is_deleted,
    cm.reply_to_id,
    cm.created_at,
    cm.updated_at,
    COALESCE(r.reaction_count, 0) AS reaction_count
  FROM chat_messages cm
  LEFT JOIN (
    SELECT message_id, COUNT(*) AS reaction_count
    FROM chat_message_reactions
    GROUP BY message_id
  ) r ON r.message_id = cm.id
  WHERE cm.home_id = p_home_id
    AND (p_before_timestamp IS NULL OR cm.created_at < p_before_timestamp)
    AND (p_include_deleted OR cm.is_deleted = FALSE)
  ORDER BY cm.created_at DESC
  LIMIT p_limit;
END;
$ LANGUAGE plpgsql;

-- Function to get message count for a home (for stats/aggregations)
CREATE OR REPLACE FUNCTION get_chat_message_stats(p_home_id UUID)
RETURNS TABLE (
  total_messages BIGINT,
  total_reactions BIGINT,
  unique_participants BIGINT,
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ
) AS $
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_messages,
    (SELECT COUNT(*)::BIGINT FROM chat_message_reactions cmr 
     JOIN chat_messages cm ON cmr.message_id = cm.id 
     WHERE cm.home_id = p_home_id) AS total_reactions,
    COUNT(DISTINCT sender_id)::BIGINT AS unique_participants,
    MIN(created_at) AS first_message_at,
    MAX(created_at) AS last_message_at
  FROM chat_messages
  WHERE home_id = p_home_id AND is_deleted = FALSE;
END;
$ LANGUAGE plpgsql;

-- Materialized view for message aggregations (refresh periodically)
DROP MATERIALIZED VIEW IF EXISTS chat_message_aggregates;
CREATE MATERIALIZED VIEW IF NOT EXISTS chat_message_aggregates AS
SELECT
  home_id,
  COUNT(*) AS message_count,
  COUNT(DISTINCT sender_id) AS participant_count,
  COUNT(*) FILTER (WHERE message_type = 'text') AS text_count,
  COUNT(*) FILTER (WHERE message_type = 'emoji') AS emoji_count,
  COUNT(*) FILTER (WHERE message_type = 'image') AS image_count,
  COUNT(*) FILTER (WHERE message_type = 'gift') AS gift_count,
  MIN(created_at) AS first_message_at,
  MAX(created_at) AS last_message_at,
  NOW() AS refreshed_at
FROM chat_messages
WHERE is_deleted = FALSE
GROUP BY home_id;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_message_aggregates_home 
  ON chat_message_aggregates(home_id);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_chat_message_aggregates()
RETURNS VOID AS $
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY chat_message_aggregates;
END;
$ LANGUAGE plpgsql;

-- =============================================
-- AVATAR MARKETPLACE SYSTEM
-- =============================================

-- Create ENUM types for marketplace
DO $ BEGIN
  CREATE TYPE currency_type AS ENUM ('credits', 'muso', 'usd');
EXCEPTION WHEN duplicate_object THEN NULL;
END $;

DO $ BEGIN
  CREATE TYPE listing_type AS ENUM ('player_sale', 'business_sale', 'auction');
EXCEPTION WHEN duplicate_object THEN NULL;
END $;

DO $ BEGIN
  CREATE TYPE listing_status AS ENUM ('active', 'sold', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $;

DO $ BEGIN
  CREATE TYPE item_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');
EXCEPTION WHEN duplicate_object THEN NULL;
END $;

DO $ BEGIN
  CREATE TYPE acquired_from_type AS ENUM ('purchase', 'reward', 'trade', 'gift', 'business');
EXCEPTION WHEN duplicate_object THEN NULL;
END $;

-- Avatar Items Table (catalog of all items)
CREATE TABLE IF NOT EXISTS avatar_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL,
  rarity item_rarity DEFAULT 'common',
  image_url TEXT DEFAULT '',
  base_price DECIMAL(10,2) DEFAULT 0,
  attributes JSONB DEFAULT '{}',
  is_tradeable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player Inventory Table
CREATE TABLE IF NOT EXISTS player_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES avatar_items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  acquired_from acquired_from_type DEFAULT 'purchase',
  is_equipped BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, item_id)
);

-- Player Wallets Table
CREATE TABLE IF NOT EXISTS player_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  credits_balance DECIMAL(12,2) DEFAULT 0,
  muso_balance DECIMAL(12,2) DEFAULT 0,
  usd_balance DECIMAL(12,2) DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  total_earned DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Avatar Marketplace Listings Table
CREATE TABLE IF NOT EXISTS avatar_marketplace_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
  player_inventory_id UUID REFERENCES player_inventory(id) ON DELETE SET NULL,
  business_id UUID REFERENCES user_businesses(id) ON DELETE SET NULL,
  item_id UUID REFERENCES avatar_items(id) ON DELETE CASCADE,
  listing_type listing_type DEFAULT 'player_sale',
  listing_price DECIMAL(12,2) NOT NULL,
  currency_type currency_type DEFAULT 'credits',
  quantity INTEGER DEFAULT 1,
  current_bid DECIMAL(12,2),
  current_bidder_id UUID REFERENCES users(id) ON DELETE SET NULL,
  min_bid_increment DECIMAL(12,2) DEFAULT 1,
  auction_start_time TIMESTAMPTZ,
  auction_end_time TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  status listing_status DEFAULT 'active',
  buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  final_price DECIMAL(12,2),
  sold_at TIMESTAMPTZ,
  views_count INTEGER DEFAULT 0,
  favorites_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace Bids Table
CREATE TABLE IF NOT EXISTS marketplace_bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES avatar_marketplace_listings(id) ON DELETE CASCADE,
  bidder_id UUID REFERENCES users(id) ON DELETE SET NULL,
  bid_amount DECIMAL(12,2) NOT NULL,
  is_winning BOOLEAN DEFAULT false,
  is_refunded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace Transactions Table
CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES avatar_marketplace_listings(id) ON DELETE SET NULL,
  buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
  item_id UUID REFERENCES avatar_items(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  transaction_type TEXT DEFAULT 'purchase' CHECK (transaction_type IN ('purchase', 'auction_win')),
  amount DECIMAL(12,2) NOT NULL,
  currency_type currency_type DEFAULT 'credits',
  platform_fee DECIMAL(12,2) DEFAULT 0,
  seller_payout DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Business Inventory Table (for business sales)
CREATE TABLE IF NOT EXISTS business_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES user_businesses(id) ON DELETE CASCADE,
  item_id UUID REFERENCES avatar_items(id) ON DELETE CASCADE,
  stock_quantity INTEGER DEFAULT 0,
  reorder_threshold INTEGER DEFAULT 5,
  reorder_quantity INTEGER DEFAULT 10,
  last_restock_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, item_id)
);

-- =============================================
-- MARKETPLACE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_avatar_items_category ON avatar_items(category);
CREATE INDEX IF NOT EXISTS idx_avatar_items_rarity ON avatar_items(rarity);
CREATE INDEX IF NOT EXISTS idx_avatar_items_tradeable ON avatar_items(is_tradeable) WHERE is_tradeable = true;

CREATE INDEX IF NOT EXISTS idx_player_inventory_player ON player_inventory(player_id);
CREATE INDEX IF NOT EXISTS idx_player_inventory_item ON player_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_player_inventory_equipped ON player_inventory(player_id, is_equipped) WHERE is_equipped = true;

CREATE INDEX IF NOT EXISTS idx_marketplace_active ON avatar_marketplace_listings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON avatar_marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_item ON avatar_marketplace_listings(item_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_type_price ON avatar_marketplace_listings(listing_type, listing_price);
CREATE INDEX IF NOT EXISTS idx_marketplace_currency ON avatar_marketplace_listings(currency_type, listing_price);
CREATE INDEX IF NOT EXISTS idx_marketplace_auction_end ON avatar_marketplace_listings(auction_end_time) WHERE listing_type = 'auction';
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON avatar_marketplace_listings(status);

CREATE INDEX IF NOT EXISTS idx_marketplace_bids_listing ON marketplace_bids(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_bids_bidder ON marketplace_bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_bids_winning ON marketplace_bids(listing_id, is_winning) WHERE is_winning = true;

CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer ON marketplace_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_seller ON marketplace_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_status ON marketplace_transactions(status);

CREATE INDEX IF NOT EXISTS idx_business_inventory_business ON business_inventory(business_id);
CREATE INDEX IF NOT EXISTS idx_business_inventory_item ON business_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_business_inventory_low_stock ON business_inventory(business_id, stock_quantity) WHERE stock_quantity <= 5;

-- Full-text search index for marketplace
CREATE INDEX IF NOT EXISTS idx_avatar_items_search ON avatar_items USING gin(to_tsvector('english', name || ' ' || description));

-- =============================================
-- ENABLE RLS FOR MARKETPLACE TABLES
-- =============================================

ALTER TABLE avatar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_inventory ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR MARKETPLACE
-- =============================================

-- Avatar Items (public read)
CREATE POLICY "Public read avatar items" ON avatar_items FOR SELECT USING (true);
CREATE POLICY "Admin manage avatar items" ON avatar_items FOR ALL USING (true);

-- Player Inventory
CREATE POLICY "Users read own inventory" ON player_inventory FOR SELECT USING (true);
CREATE POLICY "Users manage own inventory" ON player_inventory FOR ALL USING (true);

-- Player Wallets
CREATE POLICY "Users read own wallet" ON player_wallets FOR SELECT USING (true);
CREATE POLICY "Users manage own wallet" ON player_wallets FOR ALL USING (true);

-- Marketplace Listings (public read for active)
CREATE POLICY "Public read active listings" ON avatar_marketplace_listings FOR SELECT USING (true);
CREATE POLICY "Users manage own listings" ON avatar_marketplace_listings FOR ALL USING (true);

-- Marketplace Bids
CREATE POLICY "Users read bids" ON marketplace_bids FOR SELECT USING (true);
CREATE POLICY "Users manage own bids" ON marketplace_bids FOR ALL USING (true);

-- Marketplace Transactions
CREATE POLICY "Users read own transactions" ON marketplace_transactions FOR SELECT USING (true);
CREATE POLICY "System manage transactions" ON marketplace_transactions FOR ALL USING (true);

-- Business Inventory
CREATE POLICY "Public read business inventory" ON business_inventory FOR SELECT USING (true);
CREATE POLICY "Business owners manage inventory" ON business_inventory FOR ALL USING (true);

-- =============================================
-- MARKETPLACE TRIGGERS
-- =============================================

CREATE TRIGGER update_avatar_items_updated_at BEFORE UPDATE ON avatar_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_player_inventory_updated_at BEFORE UPDATE ON player_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_player_wallets_updated_at BEFORE UPDATE ON player_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketplace_listings_updated_at BEFORE UPDATE ON avatar_marketplace_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_inventory_updated_at BEFORE UPDATE ON business_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- PURCHASE LISTING FUNCTION WITH ROW-LEVEL LOCKING
-- Handles concurrent purchases with inventory sync
-- =============================================

CREATE OR REPLACE FUNCTION purchase_listing(
  p_listing_id UUID,
  p_buyer_id UUID
) RETURNS JSON AS $
DECLARE
  v_listing RECORD;
  v_buyer_wallet RECORD;
  v_seller_wallet RECORD;
  v_transaction_id UUID;
  v_platform_fee DECIMAL(12,2);
  v_seller_payout DECIMAL(12,2);
  v_buyer_balance DECIMAL(12,2);
BEGIN
  -- Lock the listing row to prevent concurrent purchases
  SELECT * INTO v_listing
  FROM avatar_marketplace_listings
  WHERE id = p_listing_id AND is_active = true AND status = 'active'
  FOR UPDATE NOWAIT;
  
  -- Check if listing exists and is available
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Listing not available or already sold');
  END IF;
  
  -- Prevent self-purchase
  IF v_listing.seller_id = p_buyer_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot purchase your own listing');
  END IF;
  
  -- For auctions, check if ended and buyer is winner
  IF v_listing.listing_type = 'auction' THEN
    IF v_listing.auction_end_time > NOW() THEN
      RETURN json_build_object('success', false, 'error', 'Auction has not ended yet');
    END IF;
    IF v_listing.current_bidder_id != p_buyer_id THEN
      RETURN json_build_object('success', false, 'error', 'You are not the winning bidder');
    END IF;
  END IF;
  
  -- Get or create buyer wallet
  INSERT INTO player_wallets (player_id, credits_balance, muso_balance, usd_balance)
  VALUES (p_buyer_id, 0, 0, 0)
  ON CONFLICT (player_id) DO NOTHING;
  
  SELECT * INTO v_buyer_wallet
  FROM player_wallets
  WHERE player_id = p_buyer_id
  FOR UPDATE;
  
  -- Get buyer balance for the currency type
  CASE v_listing.currency_type
    WHEN 'credits' THEN v_buyer_balance := v_buyer_wallet.credits_balance;
    WHEN 'muso' THEN v_buyer_balance := v_buyer_wallet.muso_balance;
    WHEN 'usd' THEN v_buyer_balance := v_buyer_wallet.usd_balance;
  END CASE;
  
  -- Check buyer has sufficient funds
  IF v_buyer_balance < COALESCE(v_listing.current_bid, v_listing.listing_price) THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient funds');
  END IF;
  
  -- Calculate fees (5% platform fee)
  v_platform_fee := COALESCE(v_listing.current_bid, v_listing.listing_price) * 0.05;
  v_seller_payout := COALESCE(v_listing.current_bid, v_listing.listing_price) - v_platform_fee;
  
  -- Deduct from buyer wallet
  CASE v_listing.currency_type
    WHEN 'credits' THEN
      UPDATE player_wallets SET 
        credits_balance = credits_balance - COALESCE(v_listing.current_bid, v_listing.listing_price),
        total_spent = total_spent + COALESCE(v_listing.current_bid, v_listing.listing_price)
      WHERE player_id = p_buyer_id;
    WHEN 'muso' THEN
      UPDATE player_wallets SET 
        muso_balance = muso_balance - COALESCE(v_listing.current_bid, v_listing.listing_price),
        total_spent = total_spent + COALESCE(v_listing.current_bid, v_listing.listing_price)
      WHERE player_id = p_buyer_id;
    WHEN 'usd' THEN
      UPDATE player_wallets SET 
        usd_balance = usd_balance - COALESCE(v_listing.current_bid, v_listing.listing_price),
        total_spent = total_spent + COALESCE(v_listing.current_bid, v_listing.listing_price)
      WHERE player_id = p_buyer_id;
  END CASE;
  
  -- Credit seller wallet
  INSERT INTO player_wallets (player_id, credits_balance, muso_balance, usd_balance)
  VALUES (v_listing.seller_id, 0, 0, 0)
  ON CONFLICT (player_id) DO NOTHING;
  
  CASE v_listing.currency_type
    WHEN 'credits' THEN
      UPDATE player_wallets SET 
        credits_balance = credits_balance + v_seller_payout,
        total_earned = total_earned + v_seller_payout
      WHERE player_id = v_listing.seller_id;
    WHEN 'muso' THEN
      UPDATE player_wallets SET 
        muso_balance = muso_balance + v_seller_payout,
        total_earned = total_earned + v_seller_payout
      WHERE player_id = v_listing.seller_id;
    WHEN 'usd' THEN
      UPDATE player_wallets SET 
        usd_balance = usd_balance + v_seller_payout,
        total_earned = total_earned + v_seller_payout
      WHERE player_id = v_listing.seller_id;
  END CASE;
  
  -- Transfer item ownership (for player sales)
  IF v_listing.player_inventory_id IS NOT NULL THEN
    UPDATE player_inventory
    SET player_id = p_buyer_id,
        acquired_from = 'trade',
        acquired_at = NOW()
    WHERE id = v_listing.player_inventory_id;
  ELSE
    -- For business sales, create new inventory entry
    INSERT INTO player_inventory (player_id, item_id, quantity, acquired_from)
    VALUES (p_buyer_id, v_listing.item_id, v_listing.quantity, 'purchase')
    ON CONFLICT (player_id, item_id) 
    DO UPDATE SET quantity = player_inventory.quantity + EXCLUDED.quantity;
    
    -- Decrease business stock if applicable
    IF v_listing.business_id IS NOT NULL THEN
      UPDATE business_inventory
      SET stock_quantity = stock_quantity - v_listing.quantity
      WHERE business_id = v_listing.business_id AND item_id = v_listing.item_id;
    END IF;
  END IF;
  
  -- Update listing status
  UPDATE avatar_marketplace_listings
  SET is_active = false,
      status = 'sold',
      buyer_id = p_buyer_id,
      final_price = COALESCE(v_listing.current_bid, v_listing.listing_price),
      sold_at = NOW()
  WHERE id = p_listing_id;
  
  -- Create transaction record
  INSERT INTO marketplace_transactions (
    listing_id, buyer_id, seller_id, item_id, quantity,
    transaction_type, amount, currency_type, platform_fee, seller_payout, status, completed_at
  ) VALUES (
    p_listing_id, p_buyer_id, v_listing.seller_id, v_listing.item_id, v_listing.quantity,
    CASE WHEN v_listing.listing_type = 'auction' THEN 'auction_win' ELSE 'purchase' END,
    COALESCE(v_listing.current_bid, v_listing.listing_price),
    v_listing.currency_type, v_platform_fee, v_seller_payout, 'completed', NOW()
  ) RETURNING id INTO v_transaction_id;
  
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'amount', COALESCE(v_listing.current_bid, v_listing.listing_price),
    'platform_fee', v_platform_fee,
    'seller_payout', v_seller_payout
  );
  
EXCEPTION
  WHEN lock_not_available THEN
    RETURN json_build_object('success', false, 'error', 'Item is being purchased by another user, please try again');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$ LANGUAGE plpgsql;

-- =============================================
-- PLACE BID FUNCTION WITH ROW-LEVEL LOCKING
-- Handles concurrent bids safely
-- =============================================

CREATE OR REPLACE FUNCTION place_bid(
  p_listing_id UUID,
  p_bidder_id UUID,
  p_bid_amount DECIMAL(12,2)
) RETURNS JSON AS $
DECLARE
  v_listing RECORD;
  v_bidder_wallet RECORD;
  v_previous_bidder_id UUID;
  v_previous_bid DECIMAL(12,2);
  v_bid_id UUID;
  v_bidder_balance DECIMAL(12,2);
BEGIN
  -- Lock the listing row
  SELECT * INTO v_listing
  FROM avatar_marketplace_listings
  WHERE id = p_listing_id AND is_active = true AND listing_type = 'auction'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Auction listing not found or not active');
  END IF;
  
  -- Check auction timing
  IF v_listing.auction_start_time > NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Auction has not started yet');
  END IF;
  
  IF v_listing.auction_end_time < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Auction has ended');
  END IF;
  
  -- Prevent self-bidding
  IF v_listing.seller_id = p_bidder_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot bid on your own auction');
  END IF;
  
  -- Check bid is higher than current
  IF v_listing.current_bid IS NOT NULL THEN
    IF p_bid_amount <= v_listing.current_bid THEN
      RETURN json_build_object('success', false, 'error', 'Bid must be higher than current bid of ' || v_listing.current_bid);
    END IF;
    IF p_bid_amount < v_listing.current_bid + v_listing.min_bid_increment THEN
      RETURN json_build_object('success', false, 'error', 'Minimum bid increment is ' || v_listing.min_bid_increment);
    END IF;
  ELSE
    IF p_bid_amount < v_listing.listing_price THEN
      RETURN json_build_object('success', false, 'error', 'Bid must be at least the starting price of ' || v_listing.listing_price);
    END IF;
  END IF;
  
  -- Check bidder has sufficient funds
  SELECT * INTO v_bidder_wallet
  FROM player_wallets
  WHERE player_id = p_bidder_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  
  CASE v_listing.currency_type
    WHEN 'credits' THEN v_bidder_balance := v_bidder_wallet.credits_balance;
    WHEN 'muso' THEN v_bidder_balance := v_bidder_wallet.muso_balance;
    WHEN 'usd' THEN v_bidder_balance := v_bidder_wallet.usd_balance;
  END CASE;
  
  IF v_bidder_balance < p_bid_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient funds');
  END IF;
  
  -- Store previous bidder info for refund
  v_previous_bidder_id := v_listing.current_bidder_id;
  v_previous_bid := v_listing.current_bid;
  
  -- Hold bid amount from bidder
  CASE v_listing.currency_type
    WHEN 'credits' THEN
      UPDATE player_wallets SET credits_balance = credits_balance - p_bid_amount WHERE player_id = p_bidder_id;
    WHEN 'muso' THEN
      UPDATE player_wallets SET muso_balance = muso_balance - p_bid_amount WHERE player_id = p_bidder_id;
    WHEN 'usd' THEN
      UPDATE player_wallets SET usd_balance = usd_balance - p_bid_amount WHERE player_id = p_bidder_id;
  END CASE;
  
  -- Refund previous bidder if exists
  IF v_previous_bidder_id IS NOT NULL AND v_previous_bid IS NOT NULL THEN
    CASE v_listing.currency_type
      WHEN 'credits' THEN
        UPDATE player_wallets SET credits_balance = credits_balance + v_previous_bid WHERE player_id = v_previous_bidder_id;
      WHEN 'muso' THEN
        UPDATE player_wallets SET muso_balance = muso_balance + v_previous_bid WHERE player_id = v_previous_bidder_id;
      WHEN 'usd' THEN
        UPDATE player_wallets SET usd_balance = usd_balance + v_previous_bid WHERE player_id = v_previous_bidder_id;
    END CASE;
    
    -- Mark previous winning bid as refunded
    UPDATE marketplace_bids SET is_winning = false, is_refunded = true
    WHERE listing_id = p_listing_id AND bidder_id = v_previous_bidder_id AND is_winning = true;
  END IF;
  
  -- Update listing with new bid
  UPDATE avatar_marketplace_listings
  SET current_bid = p_bid_amount,
      current_bidder_id = p_bidder_id
  WHERE id = p_listing_id;
  
  -- Record the bid
  INSERT INTO marketplace_bids (listing_id, bidder_id, bid_amount, is_winning)
  VALUES (p_listing_id, p_bidder_id, p_bid_amount, true)
  RETURNING id INTO v_bid_id;
  
  RETURN json_build_object(
    'success', true,
    'bid_id', v_bid_id,
    'current_bid', p_bid_amount,
    'is_winning', true
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$ LANGUAGE plpgsql;

-- =============================================
-- FINALIZE AUCTION FUNCTION
-- Called when auction ends to complete the sale
-- =============================================

CREATE OR REPLACE FUNCTION finalize_auction(
  p_listing_id UUID
) RETURNS JSON AS $
DECLARE
  v_listing RECORD;
  v_result JSON;
BEGIN
  SELECT * INTO v_listing
  FROM avatar_marketplace_listings
  WHERE id = p_listing_id AND listing_type = 'auction' AND is_active = true
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Auction not found or already finalized');
  END IF;
  
  IF v_listing.auction_end_time > NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Auction has not ended yet');
  END IF;
  
  -- If there's a winning bidder, complete the purchase
  IF v_listing.current_bidder_id IS NOT NULL THEN
    SELECT purchase_listing(p_listing_id, v_listing.current_bidder_id) INTO v_result;
    RETURN v_result;
  ELSE
    -- No bids, mark as expired
    UPDATE avatar_marketplace_listings
    SET is_active = false, status = 'expired'
    WHERE id = p_listing_id;
    
    RETURN json_build_object('success', true, 'status', 'expired', 'message', 'Auction ended with no bids');
  END IF;
END;
$ LANGUAGE plpgsql;

-- =============================================
-- RESTOCK BUSINESS INVENTORY FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION restock_business_inventory(
  p_business_id UUID,
  p_item_id UUID,
  p_quantity INTEGER
) RETURNS JSON AS $
BEGIN
  UPDATE business_inventory
  SET stock_quantity = stock_quantity + p_quantity,
      last_restock_at = NOW()
  WHERE business_id = p_business_id AND item_id = p_item_id;
  
  IF NOT FOUND THEN
    INSERT INTO business_inventory (business_id, item_id, stock_quantity, last_restock_at)
    VALUES (p_business_id, p_item_id, p_quantity, NOW());
  END IF;
  
  RETURN json_build_object('success', true, 'quantity_added', p_quantity);
END;
$ LANGUAGE plpgsql;

