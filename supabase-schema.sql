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
DROP TABLE IF EXISTS semesters CASCADE;
DROP TABLE IF EXISTS userrole CASCADE;
DROP TABLE IF EXISTS appointment_time_slots CASCADE;
DROP TABLE IF EXISTS appointment_attendees CASCADE;
DROP TABLE IF EXISTS faculty_availability_rules CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS verification_tokens CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
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

CREATE INDEX IF NOT EXISTS idx_appointments_date
  ON appointments("date");

CREATE INDEX IF NOT EXISTS idx_appointments_meeting_type
  ON appointments("meetingType");

CREATE INDEX IF NOT EXISTS idx_appointments_faculty_status_date
  ON appointments("facultyId", status, "date");

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

CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
   user_id TEXT REFERENCES users(id) ON DELETE CASCADE,

  resource_path VARCHAR(255),
  grants TEXT[],
  denies TEXT[],
  UNIQUE(user_id, resource_path)
);

-- =========================================================
-- 7b. SEMESTERS
-- =========================================================

CREATE TABLE IF NOT EXISTS semesters (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  title TEXT NOT NULL,
  "evalStartDate" DATE,
  "evalEndDate" DATE,
  "isActive" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_semesters_active ON semesters("isActive");



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

CREATE TABLE IF NOT EXISTS rating_scales (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "semesterId" TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value >= 1),
  "displayOrder" INTEGER NOT NULL,
  UNIQUE("semesterId", value)
);

CREATE INDEX IF NOT EXISTS idx_rating_scales_semester ON rating_scales("semesterId");

CREATE TABLE IF NOT EXISTS rubric_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "semesterId" TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rubric_categories_semester ON rubric_categories("semesterId");

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
  "departmentCourseId" TEXT NOT NULL REFERENCES department_courses(id),
  "isDisabled" BOOLEAN NOT NULL DEFAULT FALSE,
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
  "semesterId" TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  "evaluatorId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "evaluateeId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED')),
  "submittedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("semesterId", "evaluatorId", "evaluateeId")
);

CREATE INDEX IF NOT EXISTS idx_evaluations_semester ON evaluations("semesterId");
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator ON evaluations("evaluatorId");
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluatee ON evaluations("evaluateeId");
CREATE INDEX IF NOT EXISTS idx_evaluations_status ON evaluations(status);
CREATE INDEX IF NOT EXISTS idx_evaluations_semester_evaluator ON evaluations("semesterId", "evaluatorId");

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
  "semesterId" TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
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
  UNIQUE("semesterId", "facultyId")
);

CREATE INDEX IF NOT EXISTS idx_eval_results_semester ON evaluation_results("semesterId");
CREATE INDEX IF NOT EXISTS idx_eval_results_faculty ON evaluation_results("facultyId");
CREATE INDEX IF NOT EXISTS idx_eval_results_department ON evaluation_results("departmentId");

-- =========================================================
-- Migration 14: Faculty Evaluation — ALTER users
-- =========================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS "employeeNo" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "evaluationPeriodId" TEXT REFERENCES semesters(id) ON DELETE SET NULL;

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

-- Only needed for legacy databases that still use periodId.
-- Fresh DBs create tables with semesterId directly.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evaluation_periods') THEN
    -- subjects
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='periodId') THEN
      ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_periodid_fkey;
      ALTER TABLE subjects ALTER COLUMN "periodId" DROP NOT NULL;
      ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_periodId_name_key;
      DROP INDEX IF EXISTS idx_subjects_period;
    END IF;
    -- faculty_subjects
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faculty_subjects' AND column_name='periodId') THEN
      ALTER TABLE faculty_subjects DROP CONSTRAINT IF EXISTS faculty_subjects_periodid_fkey;
      ALTER TABLE faculty_subjects ALTER COLUMN "periodId" DROP NOT NULL;
      ALTER TABLE faculty_subjects DROP CONSTRAINT IF EXISTS faculty_subjects_subjectId_periodId_key;
      DROP INDEX IF EXISTS idx_faculty_subjects_period;
    END IF;
    -- student_enrollments
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='student_enrollments' AND column_name='periodId') THEN
      ALTER TABLE student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_periodid_fkey;
      ALTER TABLE student_enrollments ALTER COLUMN "periodId" DROP NOT NULL;
      ALTER TABLE student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_studentId_subjectId_periodId_key;
      DROP INDEX IF EXISTS idx_student_enrollments_period;
    END IF;
    -- evaluations
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='evaluations' AND column_name='periodId') THEN
      ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_periodid_fkey;
      ALTER TABLE evaluations ALTER COLUMN "periodId" DROP NOT NULL;
      ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_periodId_studentId_facultyId_key;
    END IF;
    DROP INDEX IF EXISTS idx_evaluations_period;
    DROP INDEX IF EXISTS idx_evaluations_period_student;
    DROP INDEX IF EXISTS idx_evaluations_student;
    DROP INDEX IF EXISTS idx_evaluations_faculty;
    -- evaluation_results
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='evaluation_results' AND column_name='periodId') THEN
      ALTER TABLE evaluation_results DROP CONSTRAINT IF EXISTS evaluation_results_periodid_fkey;
      ALTER TABLE evaluation_results ALTER COLUMN "periodId" DROP NOT NULL;
      ALTER TABLE evaluation_results DROP CONSTRAINT IF EXISTS evaluation_results_periodId_facultyId_key;
    END IF;
    -- rating_scales
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rating_scales' AND column_name='periodId') THEN
      ALTER TABLE rating_scales DROP CONSTRAINT IF EXISTS rating_scales_periodid_fkey;
      ALTER TABLE rating_scales ALTER COLUMN "periodId" DROP NOT NULL;
    END IF;
    -- rubric_categories
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rubric_categories' AND column_name='periodId') THEN
      ALTER TABLE rubric_categories DROP CONSTRAINT IF EXISTS rubric_categories_periodid_fkey;
      ALTER TABLE rubric_categories ALTER COLUMN "periodId" DROP NOT NULL;
    END IF;
  END IF;
END $$;

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
  "departmentCourseId" TEXT NOT NULL REFERENCES department_courses(id),
  "isDisabled" BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(name, program)
);

CREATE INDEX IF NOT EXISTS idx_sections_department_course ON sections("departmentCourseId");
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

-- =========================================================
-- Migration 19: Semester Rearchitecture
-- =========================================================
--
-- Replaces evaluation_periods with semesters as the central
-- scoping entity. Renames periodId → semesterId on child
-- tables. Adds semesterId to faculty_subjects and
-- student_enrollments.
--
-- Idempotent — safe to re-run on fresh or existing DB.
-- =========================================================

-- Step 1 already handled above (semesters table in main schema)

-- =========================================================
-- Step 2: Migrate existing evaluation_periods → semesters
-- =========================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'evaluation_periods'
  ) THEN
    INSERT INTO semesters (id, title, "evalStartDate", "evalEndDate", "isActive", "createdAt")
    SELECT id, name || ' : ' || semester, "startDate", "endDate", "isActive", "createdAt"
    FROM evaluation_periods
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- =========================================================
-- Step 3: Add semesterId to faculty_subjects
-- =========================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'faculty_subjects' AND column_name = 'semesterId'
  ) THEN
    ALTER TABLE faculty_subjects ADD COLUMN "semesterId" TEXT REFERENCES semesters(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_faculty_subjects_semester ON faculty_subjects("semesterId");
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'faculty_subjects_subject_id_section_id_key'
  ) THEN
    ALTER TABLE faculty_subjects DROP CONSTRAINT faculty_subjects_subject_id_section_id_key;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'faculty_subjects_subject_id_section_id_semesterId_key'
  ) THEN
    ALTER TABLE faculty_subjects ADD CONSTRAINT faculty_subjects_subject_id_section_id_semesterId_key UNIQUE(subject_id, section_id, "semesterId");
  END IF;
END $$;

-- =========================================================
-- Step 4: Add semesterId to student_enrollments
-- =========================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_enrollments' AND column_name = 'semesterId'
  ) THEN
    ALTER TABLE student_enrollments ADD COLUMN "semesterId" TEXT REFERENCES semesters(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_semester ON student_enrollments("semesterId");
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_enrollments_student_id_section_id_key'
  ) THEN
    ALTER TABLE student_enrollments DROP CONSTRAINT student_enrollments_student_id_section_id_key;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_enrollments_student_id_section_id_semesterId_key'
  ) THEN
    ALTER TABLE student_enrollments ADD CONSTRAINT student_enrollments_student_id_section_id_semesterId_key UNIQUE(student_id, section_id, "semesterId");
  END IF;
END $$;

-- =========================================================
-- Step 5: Rename periodId → semesterId on evaluations
-- =========================================================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evaluations' AND column_name = 'periodId'
  ) THEN
    ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_periodId_evaluatorId_evaluateeId_key;
    ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_periodid_fkey;
    ALTER TABLE evaluations RENAME COLUMN "periodId" TO "semesterId";
    ALTER TABLE evaluations ADD CONSTRAINT fk_evaluations_semester FOREIGN KEY ("semesterId") REFERENCES semesters(id) ON DELETE CASCADE;
    ALTER TABLE evaluations ADD CONSTRAINT evaluations_semesterId_evaluatorId_evaluateeId_key UNIQUE("semesterId", "evaluatorId", "evaluateeId");
    CREATE INDEX IF NOT EXISTS idx_evaluations_semester ON evaluations("semesterId");
    CREATE INDEX IF NOT EXISTS idx_evaluations_semester_evaluator ON evaluations("semesterId", "evaluatorId");
  END IF;
END $$;

-- =========================================================
-- Step 6: Rename periodId → semesterId on evaluation_results
-- =========================================================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evaluation_results' AND column_name = 'periodId'
  ) THEN
    ALTER TABLE evaluation_results DROP CONSTRAINT IF EXISTS evaluation_results_periodId_facultyId_key;
    ALTER TABLE evaluation_results DROP CONSTRAINT IF EXISTS evaluation_results_periodid_fkey;
    ALTER TABLE evaluation_results RENAME COLUMN "periodId" TO "semesterId";
    ALTER TABLE evaluation_results ADD CONSTRAINT fk_evaluation_results_semester FOREIGN KEY ("semesterId") REFERENCES semesters(id) ON DELETE CASCADE;
    ALTER TABLE evaluation_results ADD CONSTRAINT evaluation_results_semesterId_facultyId_key UNIQUE("semesterId", "facultyId");
    CREATE INDEX IF NOT EXISTS idx_eval_results_semester ON evaluation_results("semesterId");
  END IF;
END $$;

-- =========================================================
-- Step 7: Rename periodId → semesterId on rating_scales
-- =========================================================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rating_scales' AND column_name = 'periodId'
  ) THEN
    ALTER TABLE rating_scales DROP CONSTRAINT IF EXISTS rating_scales_periodId_value_key;
    ALTER TABLE rating_scales DROP CONSTRAINT IF EXISTS rating_scales_periodid_fkey;
    ALTER TABLE rating_scales RENAME COLUMN "periodId" TO "semesterId";
    ALTER TABLE rating_scales ADD CONSTRAINT fk_rating_scales_semester FOREIGN KEY ("semesterId") REFERENCES semesters(id) ON DELETE CASCADE;
    ALTER TABLE rating_scales ADD CONSTRAINT rating_scales_semesterId_value_key UNIQUE("semesterId", value);
    CREATE INDEX IF NOT EXISTS idx_rating_scales_semester ON rating_scales("semesterId");
  END IF;
END $$;

-- =========================================================
-- Step 8: Rename periodId → semesterId on rubric_categories
-- =========================================================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rubric_categories' AND column_name = 'periodId'
  ) THEN
    ALTER TABLE rubric_categories DROP CONSTRAINT IF EXISTS rubric_categories_periodid_fkey;
    ALTER TABLE rubric_categories RENAME COLUMN "periodId" TO "semesterId";
    ALTER TABLE rubric_categories ADD CONSTRAINT fk_rubric_categories_semester FOREIGN KEY ("semesterId") REFERENCES semesters(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_rubric_categories_semester ON rubric_categories("semesterId");
  END IF;
END $$;

-- =========================================================
-- Step 9: Rename evaluationPeriodId → semesterId on users
-- =========================================================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'evaluationPeriodId'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_evaluationperiodid_fkey;
    ALTER TABLE users RENAME COLUMN "evaluationPeriodId" TO "semesterId";
    ALTER TABLE users ADD CONSTRAINT fk_users_semester FOREIGN KEY ("semesterId") REFERENCES semesters(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_users_semester ON users("semesterId");
  END IF;
END $$;

-- =========================================================
-- Step 10: Drop old indexes on periodId (if any remain)
-- =========================================================

DROP INDEX IF EXISTS idx_eval_periods_active;
DROP INDEX IF EXISTS idx_eval_periods_school_year;
DROP INDEX IF EXISTS idx_evaluations_period;
DROP INDEX IF EXISTS idx_evaluations_period_evaluator;
DROP INDEX IF EXISTS idx_eval_results_period;
DROP INDEX IF EXISTS idx_rating_scales_period;
DROP INDEX IF EXISTS idx_rubric_categories_period;

-- =========================================================
-- Step 11: Drop evaluation_periods
-- =========================================================

DROP TABLE IF EXISTS evaluation_periods CASCADE;

-- =========================================================
-- Step 12: Update group_access with semester page paths
-- =========================================================

UPDATE group_access
SET pages = pages || '["/admin/evaluations/semesters","/admin/evaluations/semesters/new"]'::JSONB
WHERE "groupName" = 'ADMIN'
  AND NOT pages @> '["/admin/evaluations/semesters"]'::JSONB;

-- =========================================================
-- SEED DATA
--    Uses fixed UUIDs for idempotent re-runs.
--    Placed here after all migrations so all tables and
--    renamed columns exist.
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

  -- ── ADDITIONAL SEED VARIABLES ──────────────────────────
  DECLARE
    _student_id TEXT   := 'd0000000-0000-0000-0000-000000000002';
    _sem_id TEXT       := 'e0000000-0000-0000-0000-000000000000';
    _subject_id TEXT   := 'f0000000-0000-0000-0000-000000000003';
    _section_id TEXT   := 'g0000000-0000-0000-0000-000000000001';
  BEGIN

  -- ── DEFAULT SEMESTER ─────────────────────────────────────
  INSERT INTO semesters (id, title, "evalStartDate", "evalEndDate", "isActive")
  VALUES (_sem_id, 'SY 2026-2027 First Semester', CURRENT_DATE, CURRENT_DATE + INTERVAL '180 days', TRUE)
  ON CONFLICT (id) DO NOTHING;

  -- ── RUBRIC CATEGORIES ──────────────────────────────────
  INSERT INTO rubric_categories (id, "semesterId", name, "displayOrder") VALUES
    ('e0000000-0000-0000-0000-000000000001', _sem_id, 'Professional Manner',             1),
    ('e0000000-0000-0000-0000-000000000002', _sem_id, 'Communication with Students',      2),
    ('e0000000-0000-0000-0000-000000000003', _sem_id, 'Student Engagement',               3),
    ('e0000000-0000-0000-0000-000000000004', _sem_id, 'Learning Materials',               4),
    ('e0000000-0000-0000-0000-000000000005', _sem_id, 'Time Management',                  5),
    ('e0000000-0000-0000-0000-000000000006', _sem_id, 'Experiential Learning',            6),
    ('e0000000-0000-0000-0000-000000000007', _sem_id, 'Respect for Uniqueness',           7),
    ('e0000000-0000-0000-0000-000000000008', _sem_id, 'Assessment and Feedback',          8)
  ON CONFLICT (id) DO NOTHING;

  -- ── RUBRIC ITEMS (24 total, 3 per category) ────────────
  INSERT INTO rubric_items (id, "categoryId", text, "displayOrder", weight) VALUES
    -- Professional Manner
    ('e0000001-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Demonstrates professionalism in conduct and appearance', 1, 1.00),
    ('e0000001-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Shows enthusiasm and dedication to teaching', 2, 1.00),
    ('e0000001-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'Maintains ethical standards in dealing with students', 3, 1.00),
    -- Communication with Students
    ('e0000002-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'Communicates course expectations and requirements clearly', 1, 1.00),
    ('e0000002-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'Provides clear explanations of lessons and concepts', 2, 1.00),
    ('e0000002-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'Is approachable and responsive to student concerns', 3, 1.00),
    -- Student Engagement
    ('e0000003-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'Encourages student participation and classroom interaction', 1, 1.00),
    ('e0000003-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', 'Uses teaching methods that promote active learning', 2, 1.00),
    ('e0000003-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'Motivates students to think critically and ask questions', 3, 1.00),
    -- Learning Materials
    ('e0000004-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 'Provides relevant and up-to-date learning materials', 1, 1.00),
    ('e0000004-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000004', 'Uses instructional materials that enhance understanding', 2, 1.00),
    ('e0000004-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000004', 'Makes learning resources accessible to students', 3, 1.00),
    -- Time Management
    ('e0000005-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'Starts and ends classes on time', 1, 1.00),
    ('e0000005-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005', 'Covers prescribed course content within the term', 2, 1.00),
    ('e0000005-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000005', 'Manages class time effectively', 3, 1.00),
    -- Experiential Learning
    ('e0000006-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 'Connects lessons to real-world applications', 1, 1.00),
    ('e0000006-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000006', 'Provides practical activities and exercises', 2, 1.00),
    ('e0000006-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000006', 'Encourages hands-on learning experiences', 3, 1.00),
    -- Respect for Uniqueness
    ('e0000007-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000007', 'Respects diverse student backgrounds and perspectives', 1, 1.00),
    ('e0000007-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000007', 'Accommodates different learning needs and styles', 2, 1.00),
    ('e0000007-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000007', 'Creates an inclusive and welcoming learning environment', 3, 1.00),
    -- Assessment and Feedback
    ('e0000008-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', 'Provides fair and transparent assessments', 1, 1.00),
    ('e0000008-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000008', 'Returns graded work in a timely manner', 2, 1.00),
    ('e0000008-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000008', 'Gives constructive feedback to help students improve', 3, 1.00)
  ON CONFLICT (id) DO NOTHING;

  -- ── STUDENT ─────────────────────────────────────────────
  INSERT INTO users (id, name, email, "passwordHash")
  VALUES (_student_id, 'Nino Francisco Alamo', 'nino_francisco_alamo@itmlyceumalabang.onmicrosoft.com', _hash)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO userrole ("userId", "roleName") VALUES (_student_id, 'STUDENT')
  ON CONFLICT DO NOTHING;

  -- ── SUBJECT ─────────────────────────────────────────────
  INSERT INTO subjects (id, code, name)
  VALUES (_subject_id, '1815-ITELEC009', 'IT ELECTIVE 2 - Web Systems and Technologies')
  ON CONFLICT (id) DO NOTHING;

  -- ── SECTION ─────────────────────────────────────────────
  INSERT INTO sections (id, name, program, "departmentCourseId")
  VALUES (_section_id, '31E1', 'BSIT', _course_bsit_id)
  ON CONFLICT (id) DO NOTHING;

  -- ── FACULTY-SUBJECT LINK ────────────────────────────────
  INSERT INTO faculty_subjects (faculty_id, subject_id, section_id, "semesterId")
  VALUES (_faculty1_id, _subject_id, _section_id, _sem_id)
  ON CONFLICT (subject_id, section_id, "semesterId") DO NOTHING;

  -- ── STUDENT ENROLLMENT ─────────────────────────────────
  INSERT INTO student_enrollments (student_id, section_id, "semesterId")
  VALUES (_student_id, _section_id, _sem_id)
  ON CONFLICT (student_id, section_id, "semesterId") DO NOTHING;

  END;
END $$;

-- =========================================================
-- Migration 20: Add unique constraint to user_permissions
-- =========================================================
--
-- Required for upsert operations via onConflict: 'user_id,resource_path'.
-- Idempotent — safe to re-run.
-- =========================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_permissions_user_id_resource_path_key'
  ) THEN
    ALTER TABLE user_permissions
    ADD CONSTRAINT user_permissions_user_id_resource_path_key
    UNIQUE(user_id, resource_path);
  END IF;
END $$;

-- =========================================================
-- Migration 21: Add faculty_subject_id to student_enrollments
-- =========================================================
--
-- Links each enrollment to a specific faculty-subject-section combo.
-- Idempotent — safe to re-run.
-- =========================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_enrollments' AND column_name = 'faculty_subject_id'
  ) THEN
    ALTER TABLE student_enrollments ADD COLUMN faculty_subject_id TEXT REFERENCES faculty_subjects(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_faculty_subject ON student_enrollments(faculty_subject_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_enrollments_student_id_section_id_semesterId_key'
  ) THEN
    ALTER TABLE student_enrollments DROP CONSTRAINT student_enrollments_student_id_section_id_semesterId_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_enrollments_student_id_faculty_subject_id_key'
  ) THEN
    ALTER TABLE student_enrollments ADD CONSTRAINT student_enrollments_student_id_faculty_subject_id_key UNIQUE(student_id, faculty_subject_id, "semesterId");
  END IF;
END $$;

-- =========================================================
-- Migration 22: Add isDisabled column to subjects and sections
-- =========================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subjects' AND column_name = 'isDisabled'
  ) THEN
    ALTER TABLE subjects ADD COLUMN "isDisabled" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sections' AND column_name = 'isDisabled'
  ) THEN
    ALTER TABLE sections ADD COLUMN "isDisabled" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- =========================================================
-- Migration 23: Add is_results_visible to evaluation_results
-- =========================================================
--
-- Controls faculty-facing visibility of evaluation results.
-- Admin sets this flag; faculty can only see their result when TRUE.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evaluation_results' AND column_name = 'is_results_visible'
  ) THEN
    ALTER TABLE evaluation_results ADD COLUMN is_results_visible BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- =========================================================
-- Migration 24: Add departmentCourseId to sections
-- =========================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sections' AND column_name = 'departmentCourseId'
  ) THEN
    ALTER TABLE sections ADD COLUMN "departmentCourseId" TEXT REFERENCES department_courses(id);
    UPDATE sections SET "departmentCourseId" = dc.id
    FROM department_courses dc
    WHERE sections.program = dc.code;
    ALTER TABLE sections ALTER COLUMN "departmentCourseId" SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_sections_department_course ON sections("departmentCourseId");
  END IF;
END $$;

-- Update initial CREATE TABLE for fresh installs (idempotent via IF NOT EXISTS)
-- Only applies if the column was added by the migration above
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sections_departmentCourseId_fkey'
  ) THEN
    -- The FK is already added by the ALTER TABLE ... REFERENCES above, so no-op.
  END IF;
END $$;
