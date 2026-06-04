# Faculty Evaluation — Database Design

## Conventions

All naming follows existing e-Consultation conventions:
- Snake_case table names
- CamelCase column names (quoted in SQL)
- `TEXT` primary keys with `gen_random_uuid()::TEXT`
- `TIMESTAMPTZ` for timestamps
- `ON DELETE CASCADE` where appropriate
- `ON DELETE SET NULL` for optional references
- Prefix FK columns with lowercase entity name: `periodId`, `facultyId`, `studentId`

---

## Existing Table Enhancement

### `users` — add employee number + evaluation eligibility

```sql
ALTER TABLE users ADD COLUMN "employeeNo" TEXT;
ALTER TABLE users ADD COLUMN "evaluationEligible" BOOLEAN NOT NULL DEFAULT FALSE;
```

`employeeNo` matches the "Employee No" column in evaluation spreadsheet output.
`evaluationEligible` is set to `TRUE` when a student is uploaded via evaluation ETL.

---

## New Tables

### `evaluation_periods`

Stores evaluation cycles (semester-based). Exactly one period can be active at a time.

```sql
CREATE TABLE evaluation_periods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,                  -- "2nd Semester, School Year 2025-2026"
  semester TEXT NOT NULL,              -- "1st", "2nd", "Summer"
  "schoolYear" TEXT NOT NULL,          -- "2025-2026"
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_eval_periods_active ON evaluation_periods("isActive");
CREATE INDEX idx_eval_periods_school_year ON evaluation_periods("schoolYear");
```

### `rating_scales`

Defines the rating options per period. Default 1-5: Poor, Fair, Good, Very Good, Excellent.

```sql
CREATE TABLE rating_scales (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "periodId" TEXT NOT NULL REFERENCES evaluation_periods(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value >= 1),
  "displayOrder" INTEGER NOT NULL,
  UNIQUE("periodId", value)
);

CREATE INDEX idx_rating_scales_period ON rating_scales("periodId");
```

### `rubric_categories`

The 8 evaluation categories (Professional Manner, Communication, etc.).

```sql
CREATE TABLE rubric_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "periodId" TEXT NOT NULL REFERENCES evaluation_periods(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rubric_categories_period ON rubric_categories("periodId");
```

### `rubric_items`

Individual criteria items within each category. 34 items across 8 categories.

```sql
CREATE TABLE rubric_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "categoryId" TEXT NOT NULL REFERENCES rubric_categories(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "weight" DECIMAL(5,2) NOT NULL DEFAULT 1.00
);

CREATE INDEX idx_rubric_items_category ON rubric_items("categoryId");
```

### `subjects`

Academic subjects identified by their full name string (e.g., "BSIT-3A-CC104-Data Structures"). Each subject is unique per period and assigned to exactly one faculty member.

```sql
CREATE TABLE subjects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,                     -- "BSIT-3A-CC104-Data Structures" (treated as whole string)
  "periodId" TEXT NOT NULL REFERENCES evaluation_periods(id) ON DELETE CASCADE,
  UNIQUE("periodId", name)
);

CREATE INDEX idx_subjects_period ON subjects("periodId");
```

### `faculty_subjects`

Links faculty to the subjects they teach in a given period. One faculty per subject per period.

```sql
CREATE TABLE faculty_subjects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "facultyId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "subjectId" TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  "periodId" TEXT NOT NULL REFERENCES evaluation_periods(id) ON DELETE CASCADE,
  UNIQUE("subjectId", "periodId")         -- one faculty per subject per period
);

CREATE INDEX idx_faculty_subjects_period ON faculty_subjects("periodId");
CREATE INDEX idx_faculty_subjects_faculty ON faculty_subjects("facultyId");
```

### `student_enrollments`

Links students to the subjects they are enrolled in. The evaluation assignment is derived from this: through `subjectId → faculty_subjects.facultyId`.

```sql
CREATE TABLE student_enrollments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "studentId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "subjectId" TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  "periodId" TEXT NOT NULL REFERENCES evaluation_periods(id) ON DELETE CASCADE,
  UNIQUE("studentId", "subjectId", "periodId")
);

CREATE INDEX idx_student_enrollments_period ON student_enrollments("periodId");
CREATE INDEX idx_student_enrollments_student ON student_enrollments("studentId");
```

### `evaluations`

One row per student-faculty-period combination. Status: DRAFT → SUBMITTED.

```sql
CREATE TABLE evaluations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "periodId" TEXT NOT NULL REFERENCES evaluation_periods(id) ON DELETE CASCADE,
  "studentId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "facultyId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED')),
  "submittedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("periodId", "studentId", "facultyId")
);

CREATE INDEX idx_evaluations_period ON evaluations("periodId");
CREATE INDEX idx_evaluations_student ON evaluations("studentId");
CREATE INDEX idx_evaluations_faculty ON evaluations("facultyId");
CREATE INDEX idx_evaluations_status ON evaluations(status);
CREATE INDEX idx_evaluations_period_student ON evaluations("periodId", "studentId");
```

### `evaluation_ratings`

Individual item ratings within each evaluation.

```sql
CREATE TABLE evaluation_ratings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "evaluationId" TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  "itemId" TEXT NOT NULL REFERENCES rubric_items(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  UNIQUE("evaluationId", "itemId")
);

CREATE INDEX idx_eval_ratings_evaluation ON evaluation_ratings("evaluationId");
```

### `evaluation_comments`

Optional comments with pre-computed sentiment analysis fields.

```sql
CREATE TABLE evaluation_comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "evaluationId" TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  "sentimentScore" DECIMAL(5,4),
  "sentimentLabel" TEXT,                  -- POSITIVE, NEGATIVE, NEUTRAL, MIXED
  "sentimentAnalyzedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_eval_comments_evaluation ON evaluation_comments("evaluationId");
CREATE INDEX idx_eval_comments_sentiment ON evaluation_comments("sentimentLabel");
```

### `evaluation_results`

Pre-computed aggregate results per faculty per period. Mirrors spreadsheet output.

```sql
CREATE TABLE evaluation_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "periodId" TEXT NOT NULL REFERENCES evaluation_periods(id) ON DELETE CASCADE,
  "facultyId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "departmentId" TEXT REFERENCES departments(id) ON DELETE SET NULL,
  "totalRespondents" INTEGER NOT NULL DEFAULT 0,

  -- 8 category averages (1.00 - 5.00 scale)
  "professionalManner" DECIMAL(5,2),
  "communicationWithStudent" DECIMAL(5,2),
  "studentEngagement" DECIMAL(5,2),
  "learningMaterials" DECIMAL(5,2),
  "timeManagement" DECIMAL(5,2),
  "experientialLearning" DECIMAL(5,2),
  "respectUniqueness" DECIMAL(5,2),
  "assessmentAndFeedback" DECIMAL(5,2),

  "generalRating" DECIMAL(5,2),
  "remarks" TEXT,
  "computedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("periodId", "facultyId")
);

CREATE INDEX idx_eval_results_period ON evaluation_results("periodId");
CREATE INDEX idx_eval_results_faculty ON evaluation_results("facultyId");
CREATE INDEX idx_eval_results_department ON evaluation_results("departmentId");
```

---

## Entity Relationship Diagram

```
evaluation_periods
  ├── rating_scales (1:N)
  ├── rubric_categories (1:N)
  │     └── rubric_items (1:N)
  ├── subjects (1:N)
  │     ├── faculty_subjects (1:1 per subject) ← users(faculty)
  │     └── student_enrollments (1:N) ← users(student)
  └── evaluations (1:N)
        ├── users(student) (N:1)
        ├── users(faculty) (N:1)
        ├── evaluation_ratings (1:N) → rubric_items
        ├── evaluation_comments (1:N)
        └── evaluation_results (1:1 per faculty)
```

---

## Evaluation Assignment Derivation (SQL)

```sql
-- Which faculty should student X evaluate in period Y?
SELECT DISTINCT fs."facultyId"
FROM student_enrollments se
JOIN faculty_subjects fs ON se."subjectId" = fs."subjectId" AND se."periodId" = fs."periodId"
WHERE se."studentId" = @studentId AND se."periodId" = @periodId;
```

---

## Results Computation Logic

```
for each category:
  categoryAverage = AVG(rating) across all items in that category
                   across all SUBMITTED evaluations for this faculty

generalRating = AVG of all 8 category averages

remarks =
  generalRating >= 4.50 → "Excellent"
  generalRating >= 3.50 → "Very Good"
  generalRating >= 2.50 → "Good"
  generalRating >= 1.50 → "Fair"
  else                  → "Poor"

totalRespondents = COUNT(DISTINCT studentId) of SUBMITTED evaluations
```

---

## Default Seed Data

```sql
INSERT INTO rating_scales ("periodId", name, value, "displayOrder") VALUES
  (<periodId>, 'Poor', 1, 1),
  (<periodId>, 'Fair', 2, 2),
  (<periodId>, 'Good', 3, 3),
  (<periodId>, 'Very Good', 4, 4),
  (<periodId>, 'Excellent', 5, 5);
```
