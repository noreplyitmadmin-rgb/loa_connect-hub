-- =========================================================
-- RESET DATA — removes all non-seeded records
-- Keeps: Admin, Regie Ellana (DEAN), Nin Alamo (FACULTY),
--        CCS department, BSIT/BSCS department courses, roles.
-- =========================================================
-- Seed UUIDs (from supabase-schema.sql):
--   Admin     a0000000-0000-0000-0000-000000000001
--   Dean      c0000000-0000-0000-0000-000000000001
--   Faculty1  d0000000-0000-0000-0000-000000000001
--   Dept      b0000000-0000-0000-0000-000000000001
--   BSIT      f0000000-0000-0000-0000-000000000001
--   BSCS      f0000000-0000-0000-0000-000000000002
-- =========================================================

BEGIN;

-- Evaluation tables
DELETE FROM evaluation_ratings;
DELETE FROM evaluation_comments;
DELETE FROM evaluation_results;
DELETE FROM evaluations;
DELETE FROM student_enrollments;
DELETE FROM faculty_subjects;
DELETE FROM subjects;
DELETE FROM rubric_items;
DELETE FROM rubric_categories;
DELETE FROM rating_scales;
DELETE FROM evaluation_periods;

-- Appointment tables
DELETE FROM appointment_time_slots;
DELETE FROM appointment_attendees;
DELETE FROM appointment_files;
DELETE FROM appointments;

-- Availability
DELETE FROM faculty_availability_rules;

-- Auth / tokens
DELETE FROM password_reset_tokens;
DELETE FROM accounts;
DELETE FROM sessions;
DELETE FROM verification_tokens;

-- Audit
DELETE FROM audit_logs;

-- Department courses (keep seeded ones)
DELETE FROM department_courses
WHERE id NOT IN ('f0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002');

-- Userrole (keep seeded ones)
DELETE FROM userrole
WHERE "userId" NOT IN (
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001'
);

-- Users (keep seeded ones)
DELETE FROM users
WHERE id NOT IN (
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001'
);

-- Departments (keep seeded one)
DELETE FROM departments
WHERE id NOT IN ('b0000000-0000-0000-0000-000000000001');

COMMIT;
