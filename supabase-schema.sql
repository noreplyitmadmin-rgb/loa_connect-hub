-- =========================================================
-- E-CONSULT DATABASE SCHEMA
-- Consolidated Supabase/Postgres Schema
-- =========================================================

-- =========================================================
-- 1. DROP ALL TABLES (reverse dependency order)
-- =========================================================

DROP TABLE IF EXISTS evaluation_ratings CASCADE;
DROP TABLE IF EXISTS evaluation_comments CASCADE;
DROP TABLE IF EXISTS evaluation_results CASCADE;
DROP TABLE IF EXISTS evaluations CASCADE;
DROP TABLE IF EXISTS student_enrollments CASCADE;
DROP TABLE IF EXISTS faculty_subjects CASCADE;
DROP TABLE IF EXISTS sections CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS rubric_items CASCADE;
DROP TABLE IF EXISTS rubric_categories CASCADE;
DROP TABLE IF EXISTS rating_scales CASCADE;
DROP TABLE IF EXISTS evaluation_periods CASCADE;
DROP TABLE IF EXISTS userrole CASCADE;
DROP TABLE IF EXISTS appointment_time_slots CASCADE;
DROP TABLE IF EXISTS appointment_attendees CASCADE;
DROP TABLE IF EXISTS faculty_availability_rules CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS verification_tokens CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS role CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS internal_meeting_participants;
DROP TABLE IF EXISTS internal_meetings;

-- =========================================================
-- 2. REFERENCE / LOOKUP TABLES
-- =========================================================

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  "deanId" TEXT,
  "isDisabled" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS role (
  name TEXT PRIMARY KEY
);

INSERT INTO role (name) VALUES
  ('ADMIN'), ('DEAN'), ('FACULTY'), ('STUDENT'), ('GUEST')
ON CONFLICT (name) DO NOTHING;

-- =========================================================
-- 3. CORE ENTITY TABLES
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT,
  "departmentId" TEXT,
  course TEXT,
  "isDisabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "hasLoggedInBefore" BOOLEAN NOT NULL DEFAULT FALSE,
  "lastLoginAt" TIMESTAMPTZ,
  "tokenVersion" INTEGER NOT NULL DEFAULT 0,
  "onboardingVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS userrole (
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "roleName" TEXT NOT NULL REFERENCES role(name) ON DELETE CASCADE,
  PRIMARY KEY ("userId", "roleName")
);

-- Circular FK between departments and users
ALTER TABLE departments
ADD CONSTRAINT fk_departments_dean
FOREIGN KEY ("deanId")
REFERENCES users(id)
ON DELETE SET NULL
DEFERRABLE;

ALTER TABLE users
ADD CONSTRAINT fk_users_department
FOREIGN KEY ("departmentId")
REFERENCES departments(id)
ON DELETE SET NULL
DEFERRABLE;

-- =========================================================
-- 4. WORKING / TRANSACTIONAL TABLES
-- =========================================================

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  "studentId" TEXT NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  "facultyId" TEXT NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  "sessionGroupId" TEXT,

  "createdByEmail" TEXT NOT NULL,

  "meetingType" TEXT NOT NULL DEFAULT 'CONSULTATION'
    CHECK (
      "meetingType" IN (
        'CONSULTATION',
        'INTERNAL'
      )
    ),

  date TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,

  title TEXT,
  description TEXT,

  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (
      status IN (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'COMPLETED',
        'CANCELLED'
      )
    ),

  "actionTaken" TEXT,
  "additionalRemarks" TEXT,

  "teamsLink" TEXT,

  "teamsSyncStatus" TEXT NOT NULL DEFAULT 'UNWRITTEN'
    CHECK (
      "teamsSyncStatus" IN (
        'UNWRITTEN',
        'WRITTEN',
        'FAILED'
      )
    ),

  "teamsSyncRetries" INTEGER NOT NULL DEFAULT 0,
  "teamsSyncError" TEXT,
  "teamsSyncLastAttempt" TIMESTAMPTZ,

  "requestedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointment_time_slots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  "appointmentId" TEXT NOT NULL
    REFERENCES appointments(id)
    ON DELETE CASCADE,

  date TEXT NOT NULL,

  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,

  "teamsLink" TEXT,

  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_timeslot_unique
    UNIQUE ("appointmentId", date, "startTime")
);

CREATE TABLE IF NOT EXISTS appointment_attendees (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  "appointmentId" TEXT NOT NULL
    REFERENCES appointments(id)
    ON DELETE CASCADE,

  "userId" TEXT NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'INVITED'
    CHECK (
      status IN (
        'INVITED',
        'ACCEPTED',
        'DECLINED'
      )
    ),

  "isMandatory" BOOLEAN NOT NULL DEFAULT TRUE,

  CONSTRAINT uq_appointment_user
    UNIQUE ("appointmentId", "userId")
);

CREATE TABLE IF NOT EXISTS appointment_files (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  "appointmentId" TEXT NOT NULL
    REFERENCES appointments(id)
    ON DELETE CASCADE,

  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileData" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,

  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faculty_availability_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  "facultyId" TEXT NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  "dayOfWeek" INTEGER NOT NULL,

  "isBlocked" BOOLEAN NOT NULL DEFAULT FALSE,

  "startTime" TEXT,
  "endTime" TEXT,

  "startDate" TEXT NOT NULL,
  "endDate" TEXT,

  CONSTRAINT uq_faculty_day_date
    UNIQUE ("facultyId", "dayOfWeek", "startDate")
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  email TEXT NOT NULL,

  token TEXT NOT NULL UNIQUE,

  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt" TIMESTAMPTZ,

  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 5. NEXTAUTH TABLES
-- =========================================================

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  "userId" TEXT NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  type TEXT NOT NULL,

  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,

  refresh_token TEXT DEFAULT '',
  access_token TEXT DEFAULT '',

  expires_at INTEGER,

  token_type TEXT DEFAULT '',
  scope TEXT DEFAULT '',
  id_token TEXT DEFAULT '',
  session_state TEXT DEFAULT '',

  CONSTRAINT uq_provider_account
    UNIQUE (provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  "sessionToken" TEXT NOT NULL UNIQUE,

  "userId" TEXT NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,

  token TEXT NOT NULL UNIQUE,

  expires TIMESTAMPTZ NOT NULL,

  CONSTRAINT uq_identifier_token
    UNIQUE (identifier, token)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  "userId" TEXT,

  email TEXT,

  action TEXT NOT NULL,

  details TEXT,

  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 6. INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_appointments_student
  ON appointments("studentId");

CREATE INDEX IF NOT EXISTS idx_appointments_faculty
  ON appointments("facultyId");

CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_timeslot_appointment
  ON appointment_time_slots("appointmentId");

CREATE INDEX IF NOT EXISTS idx_timeslot_date
  ON appointment_time_slots(date);

CREATE INDEX IF NOT EXISTS idx_availability_faculty
  ON faculty_availability_rules("facultyId");

CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email);

CREATE INDEX IF NOT EXISTS idx_userrole_user
  ON userrole("userId");

CREATE INDEX IF NOT EXISTS idx_userrole_role
  ON userrole("roleName");

CREATE INDEX IF NOT EXISTS idx_users_department
  ON users("departmentId");

CREATE INDEX IF NOT EXISTS idx_appointment_files_appointment
  ON appointment_files("appointmentId");

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token
  ON password_reset_tokens(token);

-- =========================================================
-- 7. DEPARTMENT COURSES (managed by admin/dean)
-- =========================================================

CREATE TABLE IF NOT EXISTS department_courses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "departmentId" TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("departmentId", code)
);

CREATE INDEX IF NOT EXISTS idx_department_courses_dept
  ON department_courses("departmentId");

INSERT INTO department_courses (id, "departmentId", name, code)
SELECT d.id, d.id, 'Bachelor of Science in Information Technology', 'BSIT'
FROM departments d WHERE d.code = 'CCS'
AND NOT EXISTS (SELECT 1 FROM department_courses WHERE "departmentId" = d.id AND code = 'BSIT');

INSERT INTO department_courses (id, "departmentId", name, code)
SELECT d.id || '2', d.id, 'Bachelor of Science in Computer Science', 'BSCS'
FROM departments d WHERE d.code = 'CCS'
AND NOT EXISTS (SELECT 1 FROM department_courses WHERE "departmentId" = d.id AND code = 'BSCS');

-- =========================================================
-- 8. SEED DATA
--    Uses fixed UUIDs for idempotent re-runs.
-- =========================================================

DO $$
DECLARE
  _admin_id TEXT    := 'a0000000-0000-0000-0000-000000000001';
  _dept_id TEXT    := 'b0000000-0000-0000-0000-000000000001';
  _dean_id TEXT    := 'c0000000-0000-0000-0000-000000000001';
  _faculty1_id TEXT := 'd0000000-0000-0000-0000-000000000001';
  _course_bsit_id TEXT := 'f0000000-0000-0000-0000-000000000001';
  _course_bscs_id TEXT := 'f0000000-0000-0000-0000-000000000002';

  _hash TEXT := '$2b$12$GvU25kxpeLdvzSUmiZNm9edIlzresvMlzb2cT1PLdsQYjPAqRyYNW';
BEGIN

  -- ── ADMIN ──────────────────────────────────────────────────
  INSERT INTO users (id, name, email, "passwordHash", "hasLoggedInBefore")
  VALUES (_admin_id, 'Mr. Admin', 'admin@lyceumalabang.edu.ph', _hash, true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO userrole ("userId", "roleName") VALUES (_admin_id, 'ADMIN')
  ON CONFLICT DO NOTHING;

  -- ── DEAN ──────────────────────────────────────────────────
  INSERT INTO users (id, name, email, "passwordHash")
  VALUES (_dean_id, 'Regie Ellana', 'r.ellana@lyceumalabang.edu.ph
', _hash)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO userrole ("userId", "roleName") VALUES (_dean_id, 'DEAN')
  ON CONFLICT DO NOTHING;

  -- ── DEPARTMENT (College of Computer Studies) ────────────
  INSERT INTO departments (id, name, code, "deanId")
  VALUES (_dept_id, 'College of Computer Studies', 'CCS', _dean_id)
  ON CONFLICT (id) DO NOTHING;

  UPDATE users SET "departmentId" = _dept_id WHERE id = _dean_id AND "departmentId" IS NULL;

  -- ── DEPARTMENT COURSES ───────────────────────────────────
  INSERT INTO department_courses (id, "departmentId", name, code) VALUES
    (_course_bsit_id, _dept_id, 'Bachelor of Science in Information Technology', 'BSIT'),
    (_course_bscs_id, _dept_id, 'Bachelor of Science in Computer Science', 'BSCS')
  ON CONFLICT ("departmentId", code) DO NOTHING;

  -- ── FACULTY (1) ─────────────────────────────────────────
  INSERT INTO users (id, name, email, "passwordHash", "departmentId")
  VALUES (_faculty1_id, 'Nin Alamo', 'n.alamo@lyceumalabang.edu.ph', _hash, _dept_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO userrole ("userId", "roleName") VALUES (_faculty1_id, 'FACULTY')
  ON CONFLICT DO NOTHING;

END $$;

-- =========================================================
-- 9. POST-SCHEMA MIGRATIONS
-- Apply these *after* the main schema above, against an
-- existing database that needs to be upgraded.
-- =========================================================

-- -------------------------------------------------------
-- Migration 1: Populate appointment_time_slots from legacy
--             appointments (run once after adding the
--             appointment_time_slots table)
-- -------------------------------------------------------

BEGIN;

INSERT INTO appointment_time_slots ("appointmentId", date, "startTime", "endTime", "createdAt")
SELECT 
  id,
  date,
  "startTime",
  "endTime",
  NOW()
FROM appointments
ON CONFLICT ("appointmentId", date, "startTime") DO NOTHING;

COMMIT;

-- -------------------------------------------------------
-- Migration 2: Add meetingType column to appointments
--             (run once after schema update adds the column)
-- -------------------------------------------------------

BEGIN;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "meetingType" TEXT NOT NULL DEFAULT 'CONSULTATION'
  CHECK ("meetingType" IN ('CONSULTATION', 'INTERNAL'));

COMMIT;

-- -------------------------------------------------------
-- Migration 3: Add tokenVersion column to users
--             (used for JWT invalidation — increment when
--              a user is disabled or on DB reset)
-- -------------------------------------------------------

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

COMMIT;

-- -------------------------------------------------------
-- Migration 4: Add teamsLink column to appointment_time_slots
--             (run after schema update adds the column)
-- -------------------------------------------------------

BEGIN;

ALTER TABLE appointment_time_slots ADD COLUMN IF NOT EXISTS "teamsLink" TEXT;

COMMIT;

-- -------------------------------------------------------
-- Migration 5: Create appointment_files table
--             (run after schema update adds the table)
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS appointment_files (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "appointmentId" TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileData" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_files_appointment
  ON appointment_files("appointmentId");

-- =========================================================
-- IMPORTANT AFTER RUNNING
-- =========================================================
-- Refresh PostgREST schema cache:
--
-- NOTIFY pgrst, 'reload schema';
--
-- This is REQUIRED if embeds still fail.
-- =========================================================

-- Apply this migration to your database
BEGIN;

ALTER TABLE appointments
ALTER COLUMN "studentId" DROP NOT NULL;

COMMIT;

-- =========================================================
-- Migration 7: Remove role CHECK constraint for multi-role support
-- =========================================================

BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

COMMIT;

-- =========================================================
-- Migration 8: Create role + userrole tables, migrate existing data
-- Run this after the main schema (or against an existing DB)
-- to move role data from users.role into userrole.
--
-- Uses EXCEPTION-based approach — tries the migration and
-- gracefully catches "column does not exist" errors.
-- This avoids schema-scope pitfalls with information_schema.
-- =========================================================

BEGIN;

-- Create role table if not exists (idempotent for fresh schema runs)
CREATE TABLE IF NOT EXISTS role (
  name TEXT PRIMARY KEY
);

INSERT INTO role (name) VALUES
  ('ADMIN'), ('DEAN'), ('FACULTY'), ('STUDENT'), ('GUEST')
ON CONFLICT (name) DO NOTHING;

-- Create userrole table if not exists
CREATE TABLE IF NOT EXISTS userrole (
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "roleName" TEXT NOT NULL REFERENCES role(name) ON DELETE CASCADE,
  PRIMARY KEY ("userId", "roleName")
);

-- Migrate existing users.role data into userrole
-- Uses EXECUTE + EXCEPTION: if the `role` column doesn't exist
-- (fresh schema), the error is caught and migration is skipped.
DO $$
BEGIN
  EXECUTE '
    INSERT INTO userrole ("userId", "roleName")
    SELECT id, role FROM users
    WHERE role IS NOT NULL
    ON CONFLICT ("userId", "roleName") DO NOTHING;
  ';
  DROP INDEX IF EXISTS idx_users_role;
  ALTER TABLE users DROP COLUMN IF EXISTS role;
EXCEPTION
  WHEN undefined_column THEN
    RAISE NOTICE 'Migration 8: column "role" does not exist on users — skipping data migration';
END $$;

COMMIT;

-- =========================================================
-- Migration 9: Create group_access table for access control
-- Run this after Migration 8 (or against any existing DB).
-- Stores per-group allowed pages and API endpoints.
-- =========================================================

CREATE TABLE IF NOT EXISTS group_access (
  "groupName" TEXT PRIMARY KEY,
  pages JSONB NOT NULL DEFAULT '[]',
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO group_access ("groupName", pages) VALUES
  ('ADMIN',
   '["/admin","/admin/data-management","/admin/users","/admin/users/deleted","/admin/access-config","/admin/departments","/admin/reports","/admin/etl-hub","/faq"]'::JSONB),
  ('DEAN',
   '["/dean","/dean/upload","/dean/departments","/faculty/meetings","/faculty/availability","/faculty/reports","/faq"]'::JSONB),
  ('FACULTY',
   '["/faculty","/faculty/meetings","/faculty/availability","/faculty/upload","/faq"]'::JSONB),
   ('STUDENT',
    '["/student","/student/book","/student/meetings","/student/history","/faq"]'::JSONB),
  ('GUEST',
   '[]'::JSONB)
ON CONFLICT ("groupName") DO NOTHING;

-- =========================================================
-- Migration 10: RPC for database size checking
-- Run this to enable the get_database_size RPC used by the
-- admin dashboard's storage threshold indicator.
-- =========================================================

CREATE OR REPLACE FUNCTION get_database_size()
RETURNS BIGINT
LANGUAGE SQL
STABLE
AS $$
  SELECT pg_database_size(current_database());
$$;

-- =========================================================
-- Migration 11: Add deletedAt column to users table for
-- soft-delete support. When a user is "deleted", this column
-- is set to NOW() instead of removing the record.
-- Existing queries filter out soft-deleted users by default.
-- =========================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- =========================================================
-- Migration 12: Add isDisabled column to departments table
-- =========================================================

ALTER TABLE departments ADD COLUMN IF NOT EXISTS "isDisabled" BOOLEAN NOT NULL DEFAULT FALSE;

-- =========================================================
-- Migration 13: Faculty Evaluation — new tables
-- =========================================================

CREATE TABLE IF NOT EXISTS evaluation_periods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  semester TEXT NOT NULL,
  "schoolYear" TEXT NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eval_periods_active ON evaluation_periods("isActive");
CREATE INDEX IF NOT EXISTS idx_eval_periods_school_year ON evaluation_periods("schoolYear");

CREATE TABLE IF NOT EXISTS rating_scales (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "periodId" TEXT NOT NULL REFERENCES evaluation_periods(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value >= 1),
  "displayOrder" INTEGER NOT NULL,
  UNIQUE("periodId", value)
);

CREATE INDEX IF NOT EXISTS idx_rating_scales_period ON rating_scales("periodId");

CREATE TABLE IF NOT EXISTS rubric_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "periodId" TEXT NOT NULL REFERENCES evaluation_periods(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rubric_categories_period ON rubric_categories("periodId");

CREATE TABLE IF NOT EXISTS rubric_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "categoryId" TEXT NOT NULL REFERENCES rubric_categories(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "weight" DECIMAL(5,2) NOT NULL DEFAULT 1.00
);

CREATE INDEX IF NOT EXISTS idx_rubric_items_category ON rubric_items("categoryId");

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  program TEXT NOT NULL,
  UNIQUE(name, program)
);

CREATE TABLE IF NOT EXISTS faculty_subjects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  faculty_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  UNIQUE(subject_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_faculty_subjects_section ON faculty_subjects(section_id);
CREATE INDEX IF NOT EXISTS idx_faculty_subjects_faculty ON faculty_subjects(faculty_id);
CREATE INDEX IF NOT EXISTS idx_faculty_subjects_subject ON faculty_subjects(subject_id);

CREATE TABLE IF NOT EXISTS student_enrollments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  UNIQUE(student_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_section ON student_enrollments(section_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student ON student_enrollments(student_id);

CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "periodId" TEXT NOT NULL REFERENCES evaluation_periods(id) ON DELETE CASCADE,
  "evaluatorId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "evaluateeId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED')),
  "submittedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("periodId", "evaluatorId", "evaluateeId")
);

CREATE INDEX IF NOT EXISTS idx_evaluations_period ON evaluations("periodId");
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator ON evaluations("evaluatorId");
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluatee ON evaluations("evaluateeId");
CREATE INDEX IF NOT EXISTS idx_evaluations_status ON evaluations(status);
CREATE INDEX IF NOT EXISTS idx_evaluations_period_evaluator ON evaluations("periodId", "evaluatorId");

CREATE TABLE IF NOT EXISTS evaluation_ratings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "evaluationId" TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  "itemId" TEXT NOT NULL REFERENCES rubric_items(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  UNIQUE("evaluationId", "itemId")
);

CREATE INDEX IF NOT EXISTS idx_eval_ratings_evaluation ON evaluation_ratings("evaluationId");

CREATE TABLE IF NOT EXISTS evaluation_comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "evaluationId" TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  "sentimentScore" DECIMAL(5,4),
  "sentimentLabel" TEXT,
  "sentimentAnalyzedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eval_comments_evaluation ON evaluation_comments("evaluationId");
CREATE INDEX IF NOT EXISTS idx_eval_comments_sentiment ON evaluation_comments("sentimentLabel");

CREATE TABLE IF NOT EXISTS evaluation_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "periodId" TEXT NOT NULL REFERENCES evaluation_periods(id) ON DELETE CASCADE,
  "facultyId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "departmentId" TEXT REFERENCES departments(id) ON DELETE SET NULL,
  "totalRespondents" INTEGER NOT NULL DEFAULT 0,
  "professionalManner" DECIMAL(5,2),
  "communicationWithStudent" DECIMAL(5,2),
  "studentEngagement" DECIMAL(5,2),
  "learningMaterials" DECIMAL(5,2),
  "timeManagement" DECIMAL(5,2),
  "experientialLearning" DECIMAL(5,2),
  "respectUniqueness" DECIMAL(5,2),
  "assessmentAndFeedback" DECIMAL(5,2),
  "generalRating" DECIMAL(5,2),
  remarks TEXT,
  "computedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("periodId", "facultyId")
);

CREATE INDEX IF NOT EXISTS idx_eval_results_period ON evaluation_results("periodId");
CREATE INDEX IF NOT EXISTS idx_eval_results_faculty ON evaluation_results("facultyId");
CREATE INDEX IF NOT EXISTS idx_eval_results_department ON evaluation_results("departmentId");

-- =========================================================
-- Migration 14: Faculty Evaluation — ALTER users
-- =========================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS "employeeNo" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "evaluationPeriodId" TEXT REFERENCES evaluation_periods(id) ON DELETE SET NULL;

-- =========================================================
-- Migration 15: Add evaluation page paths to group_access
-- =========================================================

-- Removed old eval results paths; replaced with reports-based paths
-- Old: /admin/evaluations/results -> /admin/reports/evaluation-results
-- Old: /dean/evaluations/results   -> /dean/reports + /dean/reports/evaluation-results
UPDATE group_access SET pages = pages || '["/admin/evaluations","/admin/evaluations/periods","/admin/evaluations/periods/new"]'::JSONB WHERE "groupName" = 'ADMIN';
UPDATE group_access SET pages = pages || '["/dean/reports","/dean/reports/evaluation-results"]'::JSONB WHERE "groupName" = 'DEAN';
UPDATE group_access SET pages = pages || '["/faculty/evaluations/results"]'::JSONB WHERE "groupName" = 'FACULTY';
UPDATE group_access SET pages = pages || '["/student/evaluations"]'::JSONB WHERE "groupName" = 'STUDENT';

-- =========================================================
-- Migration 16: Make evaluation periodId a plain text field
-- =========================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='periodId') THEN
    ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_periodid_fkey;
    ALTER TABLE subjects ALTER COLUMN "periodId" DROP NOT NULL;
    ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_periodId_name_key;
    DROP INDEX IF EXISTS idx_subjects_period;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faculty_subjects' AND column_name='periodId') THEN
    ALTER TABLE faculty_subjects DROP CONSTRAINT IF EXISTS faculty_subjects_periodid_fkey;
    ALTER TABLE faculty_subjects ALTER COLUMN "periodId" DROP NOT NULL;
    ALTER TABLE faculty_subjects DROP CONSTRAINT IF EXISTS faculty_subjects_subjectId_periodId_key;
    DROP INDEX IF EXISTS idx_faculty_subjects_period;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='student_enrollments' AND column_name='periodId') THEN
    ALTER TABLE student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_periodid_fkey;
    ALTER TABLE student_enrollments ALTER COLUMN "periodId" DROP NOT NULL;
    ALTER TABLE student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_studentId_subjectId_periodId_key;
    DROP INDEX IF EXISTS idx_student_enrollments_period;
  END IF;
END $$;

ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_periodid_fkey;
ALTER TABLE evaluations ALTER COLUMN "periodId" DROP NOT NULL;
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_periodId_studentId_facultyId_key;
DROP INDEX IF EXISTS idx_evaluations_period;
DROP INDEX IF EXISTS idx_evaluations_period_student;
DROP INDEX IF EXISTS idx_evaluations_student;
DROP INDEX IF EXISTS idx_evaluations_faculty;

ALTER TABLE evaluation_results DROP CONSTRAINT IF EXISTS evaluation_results_periodid_fkey;
ALTER TABLE evaluation_results ALTER COLUMN "periodId" DROP NOT NULL;
ALTER TABLE evaluation_results DROP CONSTRAINT IF EXISTS evaluation_results_periodId_facultyId_key;

ALTER TABLE rating_scales DROP CONSTRAINT IF EXISTS rating_scales_periodid_fkey;
ALTER TABLE rating_scales ALTER COLUMN "periodId" DROP NOT NULL;

ALTER TABLE rubric_categories DROP CONSTRAINT IF EXISTS rubric_categories_periodid_fkey;
ALTER TABLE rubric_categories ALTER COLUMN "periodId" DROP NOT NULL;

-- =========================================================
-- Migration 18: Unquote column names in faculty_subjects
--               and student_enrollments for PostgREST FK
--               detection (PGRST201).
-- Run this BEFORE Migration 17 when upgrading an existing DB.
-- =========================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faculty_subjects' AND column_name='facultyId') THEN
    ALTER TABLE faculty_subjects RENAME COLUMN "facultyId" TO faculty_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faculty_subjects' AND column_name='subjectId') THEN
    ALTER TABLE faculty_subjects RENAME COLUMN "subjectId" TO subject_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faculty_subjects' AND column_name='sectionId') THEN
    ALTER TABLE faculty_subjects RENAME COLUMN "sectionId" TO section_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='student_enrollments' AND column_name='studentId') THEN
    ALTER TABLE student_enrollments RENAME COLUMN "studentId" TO student_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='student_enrollments' AND column_name='sectionId') THEN
    ALTER TABLE student_enrollments RENAME COLUMN "sectionId" TO section_id;
  END IF;
END $$;

-- =========================================================
-- Migration 17: Section-based faculty-subject & enrollment model
-- =========================================================

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  program TEXT NOT NULL,
  UNIQUE(name, program)
);

-- Drop old foreign keys and columns from subjects
ALTER TABLE faculty_subjects DROP CONSTRAINT IF EXISTS faculty_subjects_subjectId_fkey;
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_periodId_fkey;
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_periodId_name_key;

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS code TEXT;
UPDATE subjects SET code = name WHERE code IS NULL;
ALTER TABLE subjects ALTER COLUMN code SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subjects_code_key') THEN
    ALTER TABLE subjects ADD CONSTRAINT subjects_code_key UNIQUE (code);
  END IF;
END $$;

ALTER TABLE subjects DROP COLUMN IF EXISTS "periodId";
DROP INDEX IF EXISTS idx_subjects_period;

-- Migrate faculty_subjects
ALTER TABLE faculty_subjects DROP CONSTRAINT IF EXISTS faculty_subjects_subjectId_periodId_key;
ALTER TABLE faculty_subjects DROP CONSTRAINT IF EXISTS faculty_subjects_periodid_fkey;

ALTER TABLE faculty_subjects ADD COLUMN IF NOT EXISTS section_id TEXT REFERENCES sections(id) ON DELETE CASCADE;
ALTER TABLE faculty_subjects ALTER COLUMN faculty_id SET NOT NULL;
ALTER TABLE faculty_subjects ALTER COLUMN subject_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'faculty_subjects_subject_id_fkey') THEN
    ALTER TABLE faculty_subjects ADD CONSTRAINT faculty_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE faculty_subjects DROP COLUMN IF EXISTS "periodId";
DROP INDEX IF EXISTS idx_faculty_subjects_period;

CREATE INDEX IF NOT EXISTS idx_faculty_subjects_section ON faculty_subjects(section_id);
CREATE INDEX IF NOT EXISTS idx_faculty_subjects_subject ON faculty_subjects(subject_id);

-- Migrate student_enrollments
ALTER TABLE student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_studentId_subjectId_periodId_key;
ALTER TABLE student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_subjectid_fkey;
ALTER TABLE student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_periodid_fkey;

ALTER TABLE student_enrollments ADD COLUMN IF NOT EXISTS section_id TEXT REFERENCES sections(id) ON DELETE CASCADE;
ALTER TABLE student_enrollments ALTER COLUMN student_id SET NOT NULL;

ALTER TABLE student_enrollments DROP COLUMN IF EXISTS "subjectId";
ALTER TABLE student_enrollments DROP COLUMN IF EXISTS "periodId";
DROP INDEX IF EXISTS idx_student_enrollments_period;

CREATE INDEX IF NOT EXISTS idx_student_enrollments_section ON student_enrollments(section_id);
