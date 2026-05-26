-- =========================================================
-- E-CONSULT DATABASE SCHEMA
-- Consolidated Supabase/Postgres Schema
-- =========================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- DROP TABLES (reverse dependency order)
-- =========================================================

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
DROP TABLE IF EXISTS departments CASCADE;

-- =========================================================
-- DEPARTMENTS
-- =========================================================

CREATE TABLE departments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  "deanId" TEXT
);

-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT,

  role TEXT NOT NULL DEFAULT 'STUDENT'
    CHECK (role IN ('STUDENT','FACULTY','DEAN','ADMIN','GUEST')),

  "departmentId" TEXT,

  course TEXT,

  "isDisabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "hasLoggedInBefore" BOOLEAN NOT NULL DEFAULT FALSE,

  "lastLoginAt" TIMESTAMPTZ,

  "tokenVersion" INTEGER NOT NULL DEFAULT 0,

  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- CIRCULAR FOREIGN KEYS
-- =========================================================

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
-- APPOINTMENTS
-- =========================================================

CREATE TABLE appointments (
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

-- =========================================================
-- APPOINTMENT TIME SLOTS
-- IMPORTANT:
-- FK enables PostgREST embedding:
-- appointment_time_slots -> appointments
-- =========================================================

CREATE TABLE appointment_time_slots (
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

-- =========================================================
-- APPOINTMENT ATTENDEES
-- =========================================================

CREATE TABLE appointment_attendees (
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

-- =========================================================
-- APPOINTMENT FILES (screen captures, attachments)
-- =========================================================

CREATE TABLE appointment_files (
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

CREATE INDEX idx_appointment_files_appointment
  ON appointment_files("appointmentId");

-- =========================================================
-- FACULTY AVAILABILITY
-- =========================================================

CREATE TABLE faculty_availability_rules (
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

-- =========================================================
-- PASSWORD RESET TOKENS
-- =========================================================

CREATE TABLE password_reset_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  email TEXT NOT NULL,

  token TEXT NOT NULL UNIQUE,

  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt" TIMESTAMPTZ,

  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- NEXTAUTH ACCOUNTS
-- =========================================================

CREATE TABLE accounts (
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

-- =========================================================
-- NEXTAUTH SESSIONS
-- =========================================================

CREATE TABLE sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  "sessionToken" TEXT NOT NULL UNIQUE,

  "userId" TEXT NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  expires TIMESTAMPTZ NOT NULL
);

-- =========================================================
-- NEXTAUTH VERIFICATION TOKENS
-- =========================================================

CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,

  token TEXT NOT NULL UNIQUE,

  expires TIMESTAMPTZ NOT NULL,

  CONSTRAINT uq_identifier_token
    UNIQUE (identifier, token)
);

-- =========================================================
-- AUDIT LOGS
-- =========================================================

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  "userId" TEXT,

  email TEXT,

  action TEXT NOT NULL,

  details TEXT,

  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX idx_appointments_student
  ON appointments("studentId");

CREATE INDEX idx_appointments_faculty
  ON appointments("facultyId");

CREATE INDEX idx_appointments_status
  ON appointments(status);

CREATE INDEX idx_timeslot_appointment
  ON appointment_time_slots("appointmentId");

CREATE INDEX idx_timeslot_date
  ON appointment_time_slots(date);

CREATE INDEX idx_availability_faculty
  ON faculty_availability_rules("facultyId");

CREATE INDEX idx_users_email
  ON users(email);

CREATE INDEX idx_users_role
  ON users(role);

CREATE INDEX idx_users_department
  ON users("departmentId");

CREATE INDEX idx_password_reset_tokens_token
  ON password_reset_tokens(token);

-- =========================================================
-- SEED DATA
-- =========================================================

DO $$
DECLARE
  _admin_id TEXT := gen_random_uuid()::TEXT;
  _dean_id TEXT := gen_random_uuid()::TEXT;
  _dept_id TEXT := gen_random_uuid()::TEXT;
  _faculty1_id TEXT := gen_random_uuid()::TEXT;
  _student1_id TEXT := gen_random_uuid()::TEXT;

  _hash TEXT := crypt('password123', gen_salt('bf', 12));
BEGIN

  -- ADMIN
  INSERT INTO users (
    id,
    name,
    email,
    "passwordHash",
    role,
    "hasLoggedInBefore"
  )
  VALUES (
    _admin_id,
    'Dr. Admin',
    'admin@econsult.com',
    _hash,
    'ADMIN',
    true
  );

  -- DEAN
  INSERT INTO users (
    id,
    name,
    email,
    "passwordHash",
    role
  )
  VALUES (
    _dean_id,
    'Regie Ellana',
    'regie@itmlyceumalabang.onmicrosoft.com',
    _hash,
    'DEAN'
  );

  -- DEPARTMENT
  INSERT INTO departments (
    id,
    name,
    code,
    "deanId"
  )
  VALUES (
    _dept_id,
    'College of Computer Studies',
    'CCS',
    _dean_id
  );

  UPDATE users
  SET "departmentId" = _dept_id
  WHERE id = _dean_id;

  -- FACULTY
  INSERT INTO users (
    id,
    name,
    email,
    "passwordHash",
    role,
    "departmentId"
  )
  VALUES (
    _faculty1_id,
    'Nin Alamo',
    'nino_francisco_alamo@itmlyceumalabang.onmicrosoft.com',
    _hash,
    'FACULTY',
    _dept_id
  );

  -- STUDENT
  INSERT INTO users (
    id,
    name,
    email,
    "passwordHash",
    role
  )
  VALUES (
    _student1_id,
    'Nino Francisco Alamo',
    'nin.alamo@outlook.com',
    _hash,
    'STUDENT'
  );

  -- FACULTY AVAILABILITY
  FOR i IN 0..6 LOOP
    INSERT INTO faculty_availability_rules (
      "facultyId",
      "dayOfWeek",
      "isBlocked",
      "startTime",
      "endTime",
      "startDate"
    )
    VALUES (
      _faculty1_id,
      i,
      CASE WHEN i >= 5 THEN true ELSE false END,
      CASE WHEN i >= 5 THEN NULL ELSE '08:00' END,
      CASE WHEN i >= 5 THEN NULL ELSE '18:00' END,
      '2026-01-01'
    );
  END LOOP;

END $$;

COMMIT;

-- =========================================================
-- POST-SCHEMA MIGRATIONS
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