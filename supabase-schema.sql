-- =========================================================
-- E-CONSULT DATABASE SCHEMA
-- Consolidated Supabase/Postgres Schema
-- =========================================================

-- =========================================================
-- 1. DROP ALL TABLES (reverse dependency order)
-- =========================================================

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
  "deanId" TEXT
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
--    Uses fixed UUIDs for idempotent re-runs and to align
--    with prisma/seed-supabase.ts expectations.
-- =========================================================

DO $$
DECLARE
  _admin_id TEXT    := 'a0000000-0000-0000-0000-000000000001';
  _dept_id TEXT    := 'b0000000-0000-0000-0000-000000000001';
  _dean_id TEXT    := 'c0000000-0000-0000-0000-000000000001';
  _faculty1_id TEXT := 'd0000000-0000-0000-0000-000000000001';
  _faculty2_id TEXT := 'd0000000-0000-0000-0000-000000000002';
  _faculty3_id TEXT := 'd0000000-0000-0000-0000-000000000003';
  _student1_id TEXT := 'e0000000-0000-0000-0000-000000000001';
  _student2_id TEXT := 'e0000000-0000-0000-0000-000000000002';
  _student3_id TEXT := 'e0000000-0000-0000-0000-000000000003';
  _student4_id TEXT := 'e0000000-0000-0000-0000-000000000004';
  _student5_id TEXT := 'e0000000-0000-0000-0000-000000000005';
  _course_bsit_id TEXT := 'f0000000-0000-0000-0000-000000000001';
  _course_bscs_id TEXT := 'f0000000-0000-0000-0000-000000000002';

  _hash TEXT := '$2b$12$GvU25kxpeLdvzSUmiZNm9edIlzresvMlzb2cT1PLdsQYjPAqRyYNW';
BEGIN

  -- ── ADMIN ──────────────────────────────────────────────────
  INSERT INTO users (id, name, email, "passwordHash", "hasLoggedInBefore")
  VALUES (_admin_id, 'Mr. Admin', 'admin@lyceumalabang.ph', _hash, true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO userrole ("userId", "roleName") VALUES (_admin_id, 'ADMIN')
  ON CONFLICT DO NOTHING;

  -- ── DEAN ──────────────────────────────────────────────────
  INSERT INTO users (id, name, email, "passwordHash")
  VALUES (_dean_id, 'Regie Ellana', 'regie@itmlyceumalabang.onmicrosoft.com', _hash)
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

  -- ── FACULTY (3) ─────────────────────────────────────────
  INSERT INTO users (id, name, email, "passwordHash", "departmentId") VALUES
    (_faculty1_id, 'Nin Alamo',           'nino_francisco_alamo@itmlyceumalabang.onmicrosoft.com', _hash, _dept_id),
    (_faculty2_id, 'Maria Santos',        'maria.santos@itmlyceumalabang.onmicrosoft.com',           _hash, _dept_id),
    (_faculty3_id, 'Juan Dela Cruz',      'juan.delacruz@itmlyceumalabang.onmicrosoft.com',         _hash, _dept_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO userrole ("userId", "roleName") VALUES
    (_faculty1_id, 'FACULTY'),
    (_faculty2_id, 'FACULTY'),
    (_faculty3_id, 'FACULTY')
  ON CONFLICT DO NOTHING;

  -- ── STUDENTS (5) ────────────────────────────────────────
  INSERT INTO users (id, name, email, "passwordHash", "departmentId", course) VALUES
    (_student1_id, 'Alice Reyes',       'alice.reyes@itmlyceumalabang.onmicrosoft.com',     _hash, _dept_id, 'BSIT'),
    (_student2_id, 'Bob Martinez',      'bob.martinez@itmlyceumalabang.onmicrosoft.com',    _hash, _dept_id, 'BSIT'),
    (_student3_id, 'Charlie Gomez',     'charlie.gomez@itmlyceumalabang.onmicrosoft.com',   _hash, _dept_id, 'BSCS'),
    (_student4_id, 'Diana Lopez',       'diana.lopez@itmlyceumalabang.onmicrosoft.com',     _hash, _dept_id, 'BSCS'),
    (_student5_id, 'Ethan Fernandez',   'ethan.fernandez@itmlyceumalabang.onmicrosoft.com', _hash, _dept_id, 'BSIT')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO userrole ("userId", "roleName") VALUES
    (_student1_id, 'STUDENT'),
    (_student2_id, 'STUDENT'),
    (_student3_id, 'STUDENT'),
    (_student4_id, 'STUDENT'),
    (_student5_id, 'STUDENT')
  ON CONFLICT DO NOTHING;

  -- ── FACULTY AVAILABILITY ─────────────────────────────────
  FOR i IN 0..6 LOOP
    INSERT INTO faculty_availability_rules ("facultyId", "dayOfWeek", "isBlocked", "startTime", "endTime", "startDate")
    VALUES (_faculty1_id, i, CASE WHEN i >= 5 THEN true ELSE false END, CASE WHEN i >= 5 THEN NULL ELSE '08:00' END, CASE WHEN i >= 5 THEN NULL ELSE '18:00' END, '2026-01-01')
    ON CONFLICT ("facultyId", "dayOfWeek", "startDate") DO NOTHING;

    INSERT INTO faculty_availability_rules ("facultyId", "dayOfWeek", "isBlocked", "startTime", "endTime", "startDate")
    VALUES (_faculty2_id, i, CASE WHEN i >= 5 THEN true ELSE false END, CASE WHEN i >= 5 THEN NULL ELSE '08:00' END, CASE WHEN i >= 5 THEN NULL ELSE '18:00' END, '2026-01-01')
    ON CONFLICT ("facultyId", "dayOfWeek", "startDate") DO NOTHING;

    INSERT INTO faculty_availability_rules ("facultyId", "dayOfWeek", "isBlocked", "startTime", "endTime", "startDate")
    VALUES (_faculty3_id, i, CASE WHEN i >= 5 THEN true ELSE false END, CASE WHEN i >= 5 THEN NULL ELSE '08:00' END, CASE WHEN i >= 5 THEN NULL ELSE '18:00' END, '2026-01-01')
    ON CONFLICT ("facultyId", "dayOfWeek", "startDate") DO NOTHING;
  END LOOP;

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
   '["/admin","/admin/data-management","/admin/users","/admin/users/deleted","/admin/access-config","/admin/departments","/admin/reports","/faq"]'::JSONB),
  ('DEAN',
   '["/dean","/dean/upload","/dean/departments","/faculty/meetings","/faculty/availability","/faculty/reports","/faq"]'::JSONB),
  ('FACULTY',
   '["/faculty","/faculty/meetings","/faculty/availability","/faculty/upload","/faq"]'::JSONB),
  ('STUDENT',
   '["/student","/student/book","/student/meetings","/faq"]'::JSONB),
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
