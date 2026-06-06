-- =========================================================
-- Migration 001: Semester Rearchitecture
-- =========================================================
--
-- Replaces evaluation_periods with semesters as the central
-- scoping entity. Renames periodId → semesterId on child
-- tables. Adds semesterId to faculty_subjects and
-- student_enrollments.
--
-- Idempotent — safe to re-run.
-- Run AFTER supabase-schema.sql (fresh deploy) or standalone
-- (existing DB upgrade).
-- =========================================================

-- =========================================================
-- Step 1: Create semesters table
-- =========================================================
-- =========================================================
-- Step 1: Create semesters table
-- =========================================================

CREATE TABLE IF NOT EXISTS semesters (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  title TEXT NOT NULL,
  "evalStartDate" DATE,
  "evalEndDate" DATE,
  "isActive" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Normalize existing deployments
ALTER TABLE semesters
  ALTER COLUMN "evalStartDate" DROP NOT NULL;

ALTER TABLE semesters
  ALTER COLUMN "evalEndDate" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_semesters_active
ON semesters("isActive");

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
-- Step 2A: Seed default semester
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM semesters
  ) THEN
    INSERT INTO semesters (
      id,
      title,
      "evalStartDate",
      "evalEndDate",
      "isActive"
    )
    VALUES (
      gen_random_uuid()::TEXT,
      'System Default Semester',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '180 days',
      TRUE
    );
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

  -- Update UNIQUE constraint to include semesterId
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

  -- Update UNIQUE constraint to include semesterId
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
-- DONE
-- =========================================================
--
-- After running, refresh PostgREST schema cache:
--   NOTIFY pgrst, 'reload schema';
-- =========================================================
