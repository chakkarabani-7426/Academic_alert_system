/*
  # Academic Monitoring System Schema

  ## Overview
  This migration creates a comprehensive academic monitoring system with tables for tracking
  students, attendance, assessments, risk predictions, and alerts.

  ## New Tables
  
  ### 1. `students`
  Stores student profile information and enrollment details
  - `id` (uuid, primary key) - Unique identifier
  - `student_id` (text, unique) - Student ID number
  - `first_name` (text) - Student's first name
  - `last_name` (text) - Student's last name
  - `email` (text, unique) - Student's email address
  - `enrollment_date` (date) - Date of enrollment
  - `grade_level` (text) - Current grade/year level
  - `major` (text) - Student's major/program
  - `status` (text) - Current enrollment status (active, suspended, graduated, dropped)
  - `created_at` (timestamptz) - Record creation timestamp

  ### 2. `attendance_records`
  Tracks daily attendance for each student
  - `id` (uuid, primary key) - Unique identifier
  - `student_id` (uuid, foreign key) - Reference to students table
  - `date` (date) - Attendance date
  - `status` (text) - Attendance status (present, absent, late, excused)
  - `notes` (text) - Optional notes about attendance
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. `assessments`
  Stores assessment scores and grades
  - `id` (uuid, primary key) - Unique identifier
  - `student_id` (uuid, foreign key) - Reference to students table
  - `assessment_name` (text) - Name/title of assessment
  - `assessment_type` (text) - Type (exam, quiz, assignment, project)
  - `subject` (text) - Subject/course name
  - `score` (numeric) - Score achieved
  - `max_score` (numeric) - Maximum possible score
  - `percentage` (numeric) - Score as percentage
  - `date` (date) - Assessment date
  - `created_at` (timestamptz) - Record creation timestamp

  ### 4. `risk_predictions`
  Stores ML-generated risk predictions for students
  - `id` (uuid, primary key) - Unique identifier
  - `student_id` (uuid, foreign key) - Reference to students table
  - `risk_level` (text) - Risk level (low, medium, high, critical)
  - `risk_score` (numeric) - Numerical risk score (0-100)
  - `attendance_score` (numeric) - Attendance component score
  - `performance_score` (numeric) - Academic performance component score
  - `trend_score` (numeric) - Trend analysis component score
  - `factors` (jsonb) - Contributing risk factors
  - `prediction_date` (timestamptz) - When prediction was made
  - `created_at` (timestamptz) - Record creation timestamp

  ### 5. `alerts`
  Stores generated alerts and recommendations
  - `id` (uuid, primary key) - Unique identifier
  - `student_id` (uuid, foreign key) - Reference to students table
  - `risk_prediction_id` (uuid, foreign key) - Reference to risk_predictions table
  - `alert_type` (text) - Type of alert (attendance, performance, dropout_risk)
  - `severity` (text) - Severity level (low, medium, high, critical)
  - `message` (text) - Alert message
  - `recommendations` (jsonb) - Array of actionable recommendations
  - `status` (text) - Alert status (new, acknowledged, in_progress, resolved)
  - `acknowledged_at` (timestamptz) - When alert was acknowledged
  - `resolved_at` (timestamptz) - When alert was resolved
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Row Level Security (RLS) is enabled on all tables
  - Public read access for authenticated users (simulating staff/admin access)
  - This is a demonstration; in production, implement proper role-based access control

  ## Indexes
  - Foreign key indexes for performance
  - Indexes on frequently queried columns (student_id, date, risk_level, status)
*/

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  enrollment_date date NOT NULL DEFAULT CURRENT_DATE,
  grade_level text NOT NULL,
  major text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create assessments table
CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assessment_name text NOT NULL,
  assessment_type text NOT NULL,
  subject text NOT NULL,
  score numeric NOT NULL,
  max_score numeric NOT NULL,
  percentage numeric GENERATED ALWAYS AS ((score / max_score) * 100) STORED,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create risk_predictions table
CREATE TABLE IF NOT EXISTS risk_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  risk_level text NOT NULL,
  risk_score numeric NOT NULL,
  attendance_score numeric NOT NULL,
  performance_score numeric NOT NULL,
  trend_score numeric NOT NULL,
  factors jsonb DEFAULT '[]'::jsonb,
  prediction_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  risk_prediction_id uuid REFERENCES risk_predictions(id) ON DELETE SET NULL,
  alert_type text NOT NULL,
  severity text NOT NULL,
  message text NOT NULL,
  recommendations jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new',
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_assessments_student ON assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_assessments_date ON assessments(date);
CREATE INDEX IF NOT EXISTS idx_risk_predictions_student ON risk_predictions(student_id);
CREATE INDEX IF NOT EXISTS idx_risk_predictions_level ON risk_predictions(risk_level);
CREATE INDEX IF NOT EXISTS idx_alerts_student ON alerts(student_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);

-- Enable Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for students table
CREATE POLICY "Allow public read access to students"
  ON students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow public insert to students"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to students"
  ON students FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for attendance_records table
CREATE POLICY "Allow public read access to attendance_records"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow public insert to attendance_records"
  ON attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to attendance_records"
  ON attendance_records FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for assessments table
CREATE POLICY "Allow public read access to assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow public insert to assessments"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to assessments"
  ON assessments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for risk_predictions table
CREATE POLICY "Allow public read access to risk_predictions"
  ON risk_predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow public insert to risk_predictions"
  ON risk_predictions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to risk_predictions"
  ON risk_predictions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for alerts table
CREATE POLICY "Allow public read access to alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow public insert to alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete to alerts"
  ON alerts FOR DELETE
  TO authenticated
  USING (true);