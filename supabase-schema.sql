-- Paste this into Supabase SQL Editor to create all tables.
-- Uses inline REFERENCES so PostgREST auto-names constraints as table_col_fkey.

BEGIN;

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS verification_tokens CASCADE;
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS internal_meeting_participants CASCADE;
DROP TABLE IF EXISTS internal_meetings CASCADE;
DROP TABLE IF EXISTS appointment_attendees CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS faculty_availability_rules CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- Create tables WITHOUT circular FK first, then add FKs after
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  "deanId" TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT,
  role TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT','FACULTY','DEAN','ADMIN')),
  "departmentId" TEXT,
  course TEXT,
  "isDisabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "hasLoggedInBefore" BOOLEAN NOT NULL DEFAULT FALSE,
  "lastLoginAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Circular FKs
ALTER TABLE departments ADD CONSTRAINT fk_departments_dean FOREIGN KEY ("deanId") REFERENCES users(id) ON DELETE SET NULL DEFERRABLE;
ALTER TABLE users ADD CONSTRAINT fk_users_department FOREIGN KEY ("departmentId") REFERENCES departments(id) ON DELETE SET NULL DEFERRABLE;

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "studentId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "facultyId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "sessionGroupId" TEXT,
  date TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  title TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','COMPLETED','CANCELLED')),
  "actionTaken" TEXT,
  "additionalRemarks" TEXT,
  "teamsLink" TEXT,
  "teamsSyncStatus" TEXT NOT NULL DEFAULT 'UNWRITTEN' CHECK ("teamsSyncStatus" IN ('UNWRITTEN','WRITTEN','FAILED')),
  "teamsSyncRetries" INTEGER NOT NULL DEFAULT 0,
  "teamsSyncError" TEXT,
  "teamsSyncLastAttempt" TIMESTAMPTZ,
  "requestedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointment_attendees (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "appointmentId" TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED','ACCEPTED','DECLINED')),
  "isMandatory" BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_appointment_user UNIQUE ("appointmentId", "userId")
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS internal_meetings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "organizerId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "teamsEventId" TEXT,
  "teamsLink" TEXT,
  status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED','CANCELLED')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS internal_meeting_participants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "meetingId" TEXT NOT NULL REFERENCES internal_meetings(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','DECLINED')),
  CONSTRAINT uq_meeting_user UNIQUE ("meetingId", "userId")
);

CREATE TABLE IF NOT EXISTS faculty_availability_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "facultyId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "dayOfWeek" INTEGER NOT NULL,
  "isBlocked" BOOLEAN NOT NULL DEFAULT FALSE,
  "startTime" TEXT,
  "endTime" TEXT,
  "startDate" TEXT NOT NULL,
  "endDate" TEXT,
  CONSTRAINT uq_faculty_day_date UNIQUE ("facultyId", "dayOfWeek", "startDate")
);

-- NextAuth tables
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  CONSTRAINT uq_provider_account UNIQUE (provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_identifier_token UNIQUE (identifier, token)
);

DROP TABLE IF EXISTS "AuditLog";
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT,
  email TEXT,
  action TEXT NOT NULL,
  details TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_appointments_student ON appointments("studentId");
CREATE INDEX IF NOT EXISTS idx_appointments_faculty ON appointments("facultyId");
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_availability_faculty ON faculty_availability_rules("facultyId");
CREATE INDEX IF NOT EXISTS idx_internal_meetings_organizer ON internal_meetings("organizerId");
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user ON internal_meeting_participants("userId");
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users("departmentId");
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);

-- Seed data (all passwords: "password123")
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  _admin_id TEXT := gen_random_uuid()::TEXT;
  _dean_id TEXT := gen_random_uuid()::TEXT;
  _dept_id TEXT := gen_random_uuid()::TEXT;
  _faculty1_id TEXT := gen_random_uuid()::TEXT;
  _student1_id TEXT := gen_random_uuid()::TEXT;
  _hash TEXT := crypt('password123', gen_salt('bf', 12));
BEGIN
  INSERT INTO users (id, name, email, "passwordHash", role, "hasLoggedInBefore")
  VALUES (_admin_id, 'Dr. Admin', 'admin@econsult.com', _hash, 'ADMIN', true);

  INSERT INTO users (id, name, email, "passwordHash", role)
  VALUES (_dean_id, 'Regie Ellana', 'regie@itmlyceumalabang.onmicrosoft.com', _hash, 'DEAN');

  INSERT INTO departments (id, name, code, "deanId")
  VALUES (_dept_id, 'College of Computer Studies', 'CCS', _dean_id);

  UPDATE users SET "departmentId" = _dept_id WHERE id = _dean_id;

  INSERT INTO users (id, name, email, "passwordHash", role, "departmentId")
  VALUES (_faculty1_id, 'Nin Alamo', 'nino_francisco_alamo@itmlyceumalabang.onmicrosoft.com', _hash, 'FACULTY', _dept_id);

  INSERT INTO users (id, name, email, "passwordHash", role)
  VALUES (_student1_id, 'Nino Francisco Alamo', 'nin.alamo@outlook.com', _hash, 'STUDENT');

  FOR i IN 0..6 LOOP
    INSERT INTO faculty_availability_rules ("facultyId", "dayOfWeek", "isBlocked", "startTime", "endTime", "startDate")
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
