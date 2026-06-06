# Plan: Evaluation Module

## Summary

Replace the `evaluation_periods` table with `semesters` as the central scoping entity for evaluations. Add `semesterId` FK to all child tables. Wire semester dropdown into ETL imports, gate student evaluation access via `user.semesterId`, and seed rubrics via ETL.

---

## Phase 1 — Database Schema (`supabase-schema.sql`)

### 1a. Create `semesters` table

```sql
CREATE TABLE IF NOT EXISTS semesters (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  title TEXT NOT NULL,
  "evalStartDate" DATE NOT NULL,
  "evalEndDate" DATE,
  "isActive" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_semesters_active ON semesters("isActive");
```

### 1b. Migrate existing `evaluation_periods` data

If there's existing data in `evaluation_periods`, consolidate `name + semester + schoolYear` into a single `title` column and insert into `semesters`:

```sql
INSERT INTO semesters (id, title, "evalStartDate", "evalEndDate", "isActive", "createdAt")
SELECT id, name || ' : ' || semester, "startDate", "endDate", "isActive", "createdAt"
FROM evaluation_periods;
```

### 1c. Add `semesterId` to child tables (nullable FK — supports soft-disable)

- `student_enrollments` — add `"semesterId" TEXT REFERENCES semesters(id) ON DELETE CASCADE`
- `faculty_subjects` — add `"semesterId" TEXT REFERENCES semesters(id) ON DELETE CASCADE`
- `evaluations` — rename `"periodId"` → `"semesterId"`, update FK target
- `evaluation_results` — rename `"periodId"` → `"semesterId"`, update FK target
- `rating_scales` — rename `"periodId"` → `"semesterId"`, update FK target
- `rubric_categories` — rename `"periodId"` → `"semesterId"`, update FK target
- `users` — rename `"evaluationPeriodId"` → `"semesterId"`, update FK target

Update UNIQUE constraints to include `semesterId` where applicable.

### 1d. Drop `evaluation_periods`

```sql
DROP TABLE IF EXISTS evaluation_periods CASCADE;
```

### 1e. Update `scripts/reset-data.sql`

Replace `evaluation_periods` references with `semesters`.

---

## Phase 2 — TypeScript Types

### `lib/types/entity.ts`
- Replace `evaluationPeriodId` with `semesterId: string | null` on `User`

### `lib/types/evaluation.ts`
- Replace `EvaluationPeriod` → `Semester` (id, title, evalStartDate, evalEndDate, isActive, createdAt)
- Replace `EvaluationPeriodData` → `SemesterData`
- Replace `CreateEvaluationPeriodInput` → `CreateSemesterInput` (title, evalStartDate, evalEndDate)
- Rename `periodId` → `semesterId` on: `Evaluation`, `EvaluationData`, `EvaluationResult`, `EvaluationResultData`, `RubricCategory`, `RubricCategoryData`
- Add `semesterId: string` to: `StudentEnrollment`, `StudentEnrollmentData`, `FacultySubject`, `FacultySubjectData`
- Update all repository interfaces:
  - `IEvaluationPeriodRepository` → `ISemesterRepository`
  - `periodId` params → `semesterId` on `IEvaluationRepository`, `IRubricRepository`, `IEvaluationResultRepository`

### `lib/types/repository.ts`
- Replace `evaluationPeriodId` → `semesterId` on `UserData`

---

## Phase 3 — Repositories

### Rename: `lib/repositories/supabase/evaluation-period.ts` → `lib/repositories/supabase/semester.ts`
- All `evaluation_periods` → `semesters`
- Drop `filter?.schoolYear` (no longer exists)
- `semesterId` replaces `schoolYear` filter (list by semester FK)

### Update: `lib/repositories/supabase/evaluation.ts`
- `findPending` — scope by `semesterId` on enrollments + faculty_subjects
- All `periodId` → `semesterId`

### Update: `lib/repositories/supabase/evaluation-result.ts`
- All `periodId` → `semesterId`

### Update: `lib/repositories/supabase/rubric.ts`
- All `periodId` → `semesterId`

### Update: `lib/repositories/supabase/student-enrollment.ts`
- Add `semesterId` to `list()` filter
- Update `addEnrollments` to accept `semesterId`
- Update `getDistinctFaculty` to filter by `semesterId`
- Add `semesterId` parameter to `replaceBySection`

### Update: `lib/repositories/supabase/faculty-subject.ts`
- Add `semesterId` to `list()` filter
- Update `replaceBySection` to accept `semesterId`

### Update: `lib/repositories/factory.ts`
- `evaluationPeriodRepository` → `semesterRepository`
- Update import path

---

## Phase 4 — Controllers

### Rename: `lib/controllers/evaluation-periods.ts` → `lib/controllers/semesters.ts`
- All `EvaluationPeriod` → `Semester`
- All `getEvaluationPeriod*` → `getSemester*`
- Add `getSemesters` (list), `getActiveSemester`, `createSemester`, etc.

### Update: `lib/controllers/evaluations.ts`
- `getPendingEvaluations` — use `user.semesterId` instead of `findActive()`
- All `periodId` → `semesterId`

### Update: `lib/controllers/evaluation-results.ts`
- All `periodId` → `semesterId`

### Update: `lib/controllers/rubrics.ts`
- All `periodId` → `semesterId`

---

## Phase 5 — Services

### `lib/services/etlEvaluation.ts`
- `importFacultySubjects` — add `semesterId` param; set on each row; null-out old on semester change
- `importStudentEnrollments` — add `semesterId` param; set on each row; null-out old on semester change
- New: `seedRubric(semesterId: string)` — inserts the 8 category rubric

### `lib/services/studentImport.ts`
- `importStudents` — add `semesterId` param; set on each enrollment record

---

## Phase 6 — API Routes

### Rename folders:
- `app/api/evaluation-periods/` → `app/api/semesters/`
- `app/api/admin/evaluation-periods/` → `app/api/admin/semesters/`

### Update all route files:
- Import from renamed controllers
- All `periodId` params → `semesterId`
- All `evaluation-periods` URL segments → `semesters`

### New route:
- `POST /api/import/rubric` — accepts `{ semesterId }`, calls `seedRubric(semesterId)`

### Update import routes:
- `POST /api/import/evaluation-faculty` — accept `semesterId` from body
- `POST /api/import/evaluation-student` — accept `semesterId` from body

### Update evaluation routes:
- `POST /api/evaluations` — accept `semesterId` (optional, falls back to user's `semesterId`)
- `GET /api/evaluations/pending` — use user's `semesterId`

---

## Phase 7 — Pages

### Rename admin pages:
- `app/admin/evaluations/periods/` → `app/admin/evaluations/semesters/`
- Update all page content, imports, API call URLs

### Update `app/admin/evaluations/periods/new/page.tsx`:
- Remove `semester` and `schoolYear` fields
- Add single `title` field and date fields
- POST to `/api/admin/semesters`

### Update `app/admin/evaluations/periods/[id]/page.tsx`:
- Same form changes as new page
- PUT to `/api/admin/semesters/{id}`
- Activate via `/api/semesters/{id}/activate`

### Update `app/admin/evaluations/periods/[id]/rubric/page.tsx`:
- Fetch from `/api/semesters/{id}/rubric`

### Update `app/admin/evaluations/results/page.tsx`:
- Fetch semesters from `/api/semesters`
- Query results with `semesterId`

### Update `app/faculty/evaluations/results/page.tsx`:
- Fetch semesters from `/api/semesters`
- Query results with `semesterId`

### Update `app/dean/evaluations/results/page.tsx`:
- Fetch semesters from `/api/semesters`
- Query results with `semesterId`

### Update `app/admin/etl-hub/page.tsx`:
- Add semester dropdown (alongside department)
- Pass `semesterId` to `BulkStudentImport` and `BulkFacultyImport`
- Add "Seed Rubric" button for selected semester

### Update `app/student/evaluations/[id]/page.tsx`:
- Fetch user's `semesterId` (from session or API)
- Fetch rubric from `/api/semesters/{semesterId}/rubric`
- Gate: no active semester → redirect

### Update `app/student/evaluations/page.tsx`:
- Check `user.semesterId` before showing pending/completed

---

## Phase 8 — Components

### `components/bulk-import/BulkStudentImport.tsx`
- Accept `semesterId` prop
- Pass to API call

### `components/bulk-import/BulkFacultyImport.tsx`
- Accept `semesterId` prop
- Pass to API call

---

## Phase 9 — Seed Rubric Data (8 Categories)

Based on user-provided rubric:

| # | Category | Items |
|---|----------|-------|
| I | Professional Manner | 3 items |
| II | Communication with Students | 6 items |
| III | Student Engagement | 4 items |
| IV | Learning Materials | 4 items |
| V | Time Management | 4 items |
| VI | Experiential Learning | 4 items |
| VII | Respect for Uniqueness | 3 items |
| VIII | Assessment and Feedback | 6 items |

Total: 34 items across 8 categories.

---

## Files Changed (approx. 40+)

| Category | Count | Key files |
|----------|-------|-----------|
| SQL/Schema | 2 | `supabase-schema.sql`, `reset-data.sql` |
| Types | 3 | `entity.ts`, `evaluation.ts`, `repository.ts` |
| Repositories | 7 | `semester.ts`, `evaluation.ts`, `rubric.ts`, `evaluation-result.ts`, `student-enrollment.ts`, `faculty-subject.ts`, `factory.ts` |
| Controllers | 4 | `semesters.ts`, `evaluations.ts`, `evaluation-results.ts`, `rubrics.ts` |
| Services | 3 | `etlEvaluation.ts`, `studentImport.ts`, new rubric seed |
| API routes | ~16 | Renamed `semesters/` folder + evaluation routes |
| Pages | ~10 | Admin semesters, student evaluation, ETL hub, results pages |
| Components | 2 | BulkStudentImport, BulkFacultyImport |

---

## ETL Invalidation Strategy

On reimport with a **different** `semesterId`:
1. Find existing records with the old `semesterId` matching the same faculty/student + section
2. Set `semesterId = NULL` on those (soft-disable)
3. Insert new records with the new `semesterId`

On reimport with the **same** `semesterId`:
- Normal upsert (replaceBySection within the semester scope)

---

## Student Evaluation Gate Logic

```
user.semesterId IS NOT NULL
  → fetch semesters.isActive = true AND semesters.id = user.semesterId
    → evalStartDate <= today AND (evalEndDate IS NULL OR evalEndDate >= today)
      → allow evaluation
```

If any link fails → redirect to `/student/evaluations` with message.
