-- =========================================================
-- RESET DATA — removes all non-seeded records
-- Keeps: Admin, Regie Ellana (DEAN), Nin Alamo (FACULTY),
--        CCS department, BSIT/BSCS department courses, roles.
-- =========================================================
-- Seed UUIDs:
--   Admin     a0000000-0000-0000-0000-000000000001
--   Dean      c0000000-0000-0000-0000-000000000001
--   Faculty1  d0000000-0000-0000-0000-000000000001
--   Student1  d0000000-0000-0000-0000-000000000002
--   Dept      b0000000-0000-0000-0000-000000000001
--   BSIT      f0000000-0000-0000-0000-000000000001
--   BSCS      f0000000-0000-0000-0000-000000000002
-- =========================================================

BEGIN;

-- Evaluation user data (wipe clean every reset)
DELETE FROM evaluation_ratings;
DELETE FROM evaluation_comments;
DELETE FROM evaluation_results;
DELETE FROM evaluations;

-- Enrollment / assignment data (wipe clean every reset)
DELETE FROM student_enrollments;
DELETE FROM faculty_subjects;

-- Seed data tables (re-created below)
DELETE FROM subjects;
DELETE FROM sections;
DELETE FROM rubric_items;
DELETE FROM rubric_categories;
DELETE FROM rating_scales;
DELETE FROM semesters;

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
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000002'
);

-- Departments (keep seeded one)
DELETE FROM departments
WHERE id NOT IN ('b0000000-0000-0000-0000-000000000001');

COMMIT;

-- =========================================================
-- RE-SEED: default semester + rubric + sample data
-- =========================================================
-- This section re-creates seed data that was deleted above.
-- All INSERTs use ON CONFLICT so they are safe to re-run.
-- =========================================================

DO $$
DECLARE
  _semId       TEXT := 'e0000000-0000-0000-0000-000000000000';
  _adminId     TEXT := 'a0000000-0000-0000-0000-000000000001';
  _deanId      TEXT := 'c0000000-0000-0000-0000-000000000001';
  _facultyId   TEXT := 'd0000000-0000-0000-0000-000000000001';
  _deptId      TEXT := 'b0000000-0000-0000-0000-000000000001';
  _subjectId   TEXT := 'f0000000-0000-0000-0000-000000000003';
  _sectionId   TEXT := 'g0000000-0000-0000-0000-000000000001';
  _studentId   TEXT := 'd0000000-0000-0000-0000-000000000002';
  _hash        TEXT := '$2b$12$GvU25kxpeLdvzSUmiZNm9edIlzresvMlzb2cT1PLdsQYjPAqRyYNW';
BEGIN
  -- ── Default semester ─────────────────────────────────────
  INSERT INTO semesters (id, title, "evalStartDate", "evalEndDate", "isActive")
  VALUES (_semId, 'System Default Semester', CURRENT_DATE, CURRENT_DATE + INTERVAL '180 days', TRUE)
  ON CONFLICT (id) DO NOTHING;

  -- ── Rubric categories ──────────────────────────────────
  INSERT INTO rubric_categories (id, "semesterId", name, "displayOrder") VALUES
    ('e0000000-0000-0000-0000-000000000001', _semId, 'Professional Manner',             1),
    ('e0000000-0000-0000-0000-000000000002', _semId, 'Communication with Students',      2),
    ('e0000000-0000-0000-0000-000000000003', _semId, 'Student Engagement',               3),
    ('e0000000-0000-0000-0000-000000000004', _semId, 'Learning Materials',               4),
    ('e0000000-0000-0000-0000-000000000005', _semId, 'Time Management',                  5),
    ('e0000000-0000-0000-0000-000000000006', _semId, 'Experiential Learning',            6),
    ('e0000000-0000-0000-0000-000000000007', _semId, 'Respect for Uniqueness',           7),
    ('e0000000-0000-0000-0000-000000000008', _semId, 'Assessment and Feedback',          8)
  ON CONFLICT (id) DO NOTHING;

  -- ── Rubric items (24 total, 3 per category) ────────────
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

  -- ── Core users ─────────────────────────────────────────
  INSERT INTO users (id, name, email, "passwordHash", "hasLoggedInBefore")
  VALUES (_adminId, 'Mr. Admin', 'admin@lyceumalabang.edu.ph', _hash, true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO users (id, name, email, "passwordHash")
  VALUES (_deanId, 'Regie Ellana', 'r.ellana@lyceumalabang.edu.ph', _hash)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO users (id, name, email, "passwordHash", "departmentId")
  VALUES (_facultyId, 'Nin Alamo', 'n.alamo@lyceumalabang.edu.ph', _hash, _deptId)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO users (id, name, email, "passwordHash")
  VALUES (_studentId, 'Nino Francisco Alamo', 'nino_francisco_alamo@itmlyceumalabang.onmicrosoft.com', _hash)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO userrole ("userId", "roleName") VALUES
    (_adminId, 'ADMIN'),
    (_deanId, 'DEAN'),
    (_facultyId, 'FACULTY'),
    (_studentId, 'STUDENT')
  ON CONFLICT DO NOTHING;

  -- ── Subject ─────────────────────────────────────────────
  INSERT INTO subjects (id, code, name)
  VALUES (_subjectId, '1815-ITELEC009', 'IT ELECTIVE 2 - Web Systems and Technologies')
  ON CONFLICT (id) DO NOTHING;

  -- ── Section ─────────────────────────────────────────────
  INSERT INTO sections (id, name, program)
  VALUES (_sectionId, '31E1', 'BSIT')
  ON CONFLICT (id) DO NOTHING;

  -- ── Faculty-subject link ────────────────────────────────
  INSERT INTO faculty_subjects (faculty_id, subject_id, section_id, "semesterId")
  VALUES (_facultyId, _subjectId, _sectionId, _semId)
  ON CONFLICT (subject_id, section_id, "semesterId") DO NOTHING;

  -- ── Student enrollment ─────────────────────────────────
  INSERT INTO student_enrollments (student_id, section_id, "semesterId")
  VALUES (_studentId, _sectionId, _semId)
  ON CONFLICT (student_id, section_id, "semesterId") DO NOTHING;
END $$;
