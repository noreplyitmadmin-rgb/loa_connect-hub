# Faculty Evaluation Module — Complete Plan & Status

> **Working file** — consolidates architecture, database, API, UI, effort estimate, and implementation status.
> **Implementation branch:** `eval`

---

## Table of Contents

1. [Implementation Status](#1-implementation-status)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Design](#3-database-design)
4. [API Design](#4-api-design)
5. [UI Design](#5-ui-design)
6. [Effort Estimate](#6-effort-estimate)

---

## 1. Implementation Status

### Pages

| Route | Status |
|-------|--------|
| `/admin/evaluations` (hub) | ✅ Done |
| `/admin/evaluations/periods` | ✅ Done |
| `/admin/evaluations/periods/new` | ✅ Done |
| `/admin/evaluations/periods/[id]` | ✅ Done |
| `/admin/evaluations/periods/[id]/rubric` | ✅ Done |
| `/admin/evaluations/results` | ✅ Done |
| `/admin/evaluations/rubrics` (standalone editor) | ❌ Missing |
| `/admin/evaluations/upload` (upload status dashboard) | ❌ Missing — shows enrollment counts, links to bulk import in `/admin/users` |
| `/admin/evaluations/reports` (landing + sentiment) | ❌ Missing |
| `/dean/evaluations` (dashboard) | ❌ Missing |
| `/dean/evaluations/results` | ✅ Done |
| `/dean/evaluations/reports` | ❌ Missing |
| `/faculty/evaluations` (dashboard) | ❌ Missing |
| `/faculty/evaluations/results` | ✅ Done |
| `/faculty/evaluations/[periodId]` | ❌ Missing |
| `/student/evaluations` (pending list) | ✅ Done |
| `/student/evaluations/[id]` (evaluation form) | ✅ Done |
| `/student/evaluations/history` | ❌ Missing |

### Database

| Item | Status |
|------|--------|
| Migration 13: 11 new eval tables | ✅ Done (`supabase-schema.sql`) |
| Migration 14: ALTER users (`employeeNo`, `evaluationEligible`) | ✅ Done |
| Migration 15: `group_access` eval paths | ✅ Done |

### Types

| File | Status |
|------|--------|
| `lib/types/evaluation.ts` (all entity/DTO types) | ✅ Done |

### Repositories

| Repository | Status |
|------------|--------|
| `evaluation-period` | ✅ Done |
| `subject` | ✅ Done |
| `faculty-subject` | ✅ Done |
| `student-enrollment` | ✅ Done |
| `rubric` | ✅ Done |
| `evaluation` | ✅ Done |
| `evaluation-result` | ✅ Done |
| `evaluation-rating` | ❌ Missing |
| `evaluation-comment` | ❌ Missing |

### Controllers

| Controller | Status |
|------------|--------|
| `evaluation-periods.ts` | ✅ Done |
| `rubrics.ts` | ✅ Done |
| `evaluations.ts` | ✅ Done |
| `evaluation-results.ts` | ✅ Done |
| `sentiment-analysis.ts` | ✅ Done |
| `etl-evaluation.ts` | ✅ N/A — routes call service directly |

### API Routes

| Route | Status |
|-------|--------|
| `GET/POST /api/evaluation-periods` | ✅ Done |
| `GET/PATCH/DELETE /api/evaluation-periods/[id]` | ✅ Done |
| `POST /api/evaluation-periods/[id]/activate` | ✅ Done |
| `GET/POST /api/evaluation-periods/[id]/rubric` | ✅ Done |
| `POST /api/evaluation-periods/[id]/rubric/copy` | ✅ Done |
| `PATCH/DELETE /api/evaluation-periods/[id]/rubrics/categories/[categoryId]` | ✅ Done |
| `POST /api/evaluation-periods/[id]/rubrics/items` | ✅ Done |
| `PATCH/DELETE /api/evaluation-periods/[id]/rubrics/items/[itemId]` | ✅ Done |
| `GET /api/evaluation-periods/[id]/subjects` | ✅ Done |
| `GET /api/evaluation-periods/[id]/faculty-subjects` | ✅ Done |
| `GET /api/evaluation-periods/[id]/enrollments` | ✅ Done |
| `GET /api/evaluation-periods/[id]/enrollment-stats` | ✅ Done |
| `GET /api/evaluations/submitted` | ✅ Done |
| `GET /api/evaluations/[id]` | ✅ Done |
| `PATCH /api/evaluations/[id]/ratings` | ✅ Done |
| `POST /api/evaluations/[id]/submit` | ✅ Done |
| `POST /api/evaluations/[id]/comments` | ✅ Done |
| `GET /api/evaluation-results` | ✅ Done |
| `GET /api/evaluation-results/[id]` | ✅ Done |
| `POST /api/evaluation-results/compute` | ✅ Done |
| `GET /api/evaluation-results/export` | ✅ Done |
| `GET /api/evaluation-comments` | ✅ Done |
| `POST /api/sentiment-analysis/analyze` | ✅ Placeholder |
| `POST /api/sentiment-analysis/batch` | ✅ Placeholder |
| `GET /api/sentiment-analysis/summary` | ✅ Placeholder |
| `GET /api/evaluation-reports/department` | ❌ Missing |
| `GET /api/evaluation-reports/institutional` | ❌ Missing |
| `GET /api/evaluation-reports/faculty/[facultyId]` | ❌ Missing |
| `admin/evaluation-periods` (CRUD) | ✅ Done |
| `admin/evaluation-results` | ✅ Done |
| `admin/evaluation-results/compute` | ✅ Done |
| `dean/evaluation-results` | ✅ Done |
| `faculty/evaluation-results` | ✅ Done |
| `import/evaluation-faculty` | ✅ Done |
| `import/evaluation-student` | ✅ Done |
| ETL handler for eval types in `admin/etl-upload/validate` + `confirm` | ✅ N/A — eval tabs use direct import endpoints; `/admin/etl-upload` page deprecated in favor of `/admin/users` bulk import section |

### Shared Components

| Component | Status |
|-----------|--------|
| `RatingScale` | ✅ Done |
| `CategoryProgressBar` | ✅ Done |
| `FacultyResultCard` | ✅ Done |
| `SentimentBadge` | ✅ Done |
| `EvaluationFilters` | ✅ Done |
| `EvaluationForm` | ✅ Done |

### Services

| Service | Status |
|---------|--------|
| `etlEvaluation.ts` (CSV parse + import) | ✅ Done |
| `sentiment.ts` (AI sentiment analysis) | ✅ Placeholder |

### Wiring

| Item | Status |
|------|--------|
| `EtlUploadType` constants | ✅ Done |
| `lib/access.ts` DEFAULT_CONFIG | ✅ Done |
| `components/Sidebar.tsx` collapsible Evaluations group | ✅ Done |
| `lib/types/index.ts` evaluation export | ❌ Missing |

### Summary

| Category | Done | Missing |
|----------|------|---------|
| Pages | 10 | 8 |
| Database | 3 | 0 |
| Types | 1 | 0 |
| Repositories | 7 | 2 |
| Controllers | 6 | 0 |
| API Routes | 27 | 8 |
| Components | 6 | 0 |
| Services | 2 | 0 |
| Wiring | 3 | 1 |
| **Total** | **65** | **19** |

---

## 2. Architecture Overview

### Classification Matrix

| Label | Meaning |
|-------|---------|
| **Existing** | Already exists, reused without changes |
| **Enhance** | Existing component requiring modification |
| **Shared** | New component usable by both e-Consultation and Faculty Evaluation |
| **New** | Developed specifically for Faculty Evaluation |

| Component | Classification | Module |
|-----------|---------------|--------|
| `users` table (add `employeeNo`, `evaluationEligible`) | **Enhance** | Core |
| `UserData` / `CreateUserInput` types | **Enhance** | Core |
| `User` entity type | **Enhance** | Core |
| `department` model | **Existing** | Core |
| `role` model | **Existing** | Core |
| `userrole` model | **Existing** | Core |
| `group_access` / page permissions | **Enhance** | Core |
| `DEFAULT_CONFIG` in `lib/access.ts` | **Enhance** | Core |
| NextAuth / `lib/auth.ts` | **Existing** | Core |
| `auth()` helper | **Existing** | Core |
| `hasPageAccess()` | **Existing** | Core |
| `hasRole()` / `getPrimaryRole()` | **Existing** | Core |
| `SessionProvider` / `Providers.tsx` | **Existing** | Core |
| `AppShell` | **Existing** | Core |
| `Sidebar` navigation | **Enhance** | Core |
| `NavigationBar`, `NavigationStack` | **Existing** | Core |
| `StatusBadge`, `Skeleton`, `EmptyState`, etc. | **Existing** | Core |
| `useApiGet` / `useApiMutate` | **Existing** | Core |
| `logAuditEvent()` | **Existing** | Core |
| `supabase` admin client | **Existing** | Core |
| `repositories/factory.ts` | **Enhance** | Core |
| `jspdf` / `html2canvas` export patterns | **Existing** | Core |
| All existing admin/dean/faculty/student pages | **Existing** | Consultation |
| **Existing ETL page** (`/admin/etl-upload`) | **Enhance** | Core — add Evaluation Faculty + Evaluation Student tabs |
| `EtlUploadType` constants | **Enhance** | Core — add evaluation upload types |
| `evaluation-periods` table + types + repo + controller + routes | **New** | Evaluation |
| `rating-scales` table + types | **New** | Evaluation |
| `rubric-categories` + `rubric-items` tables + types + repo + controller + routes | **New** | Evaluation |
| `subjects` table + types + repo + controller | **New** | Evaluation |
| `faculty-subjects` table + types + repo | **New** | Evaluation |
| `student-enrollments` table + types + repo | **New** | Evaluation |
| `evaluations` table + types + repo + controller + routes | **New** | Evaluation |
| `evaluation-ratings` table + types | **New** | Evaluation |
| `evaluation-comments` table + types + routes | **New** | Evaluation |
| `evaluation-results` table + types + repo + controller + routes | **New** | Evaluation |
| `sentiment-analysis` controller + routes | **New** | Evaluation |
| Student evaluation pages | **New** | Evaluation |
| Faculty result pages | **New** | Evaluation |
| Dean evaluation pages | **New** | Evaluation |
| Admin evaluation pages | **New** | Evaluation |
| `RatingScale`, `SentimentBadge`, etc. components | **New** | Evaluation |

### Module Directory Structure

```
app/
├── (core platform pages)
│   ├── layout.tsx, page.tsx, globals.css, error.tsx
│   └── (auth)/login, forgot-password, change-password, activate
│
├── admin/
│   ├── page.tsx, error.tsx                     ← Core
│   ├── users/, departments/, access-config/    ← Core
│   ├── data-management/, etl-upload/           ← Core (ETL enhanced with eval tabs)
│   ├── reports/                                ← Consultation Module
│   │
│   └── evaluations/                            ← Evaluation Module
│       ├── page.tsx                            ← Dashboard
│       ├── periods/                            ← CRUD evaluation periods
│       ├── rubrics/                            ← Rubric editor
│       ├── upload/                             ← ETL status/view uploaded data
│       ├── results/                            ← Full results table + faculty detail
│       └── reports/                            ← Reports + sentiment dashboard
│
├── dean/
│   ├── page.tsx, upload/                       ← Core
│   └── evaluations/                            ← Evaluation Module
│       ├── page.tsx                            ← Dashboard
│       ├── results/                            ← Department faculty results
│       └── reports/                            ← Department evaluation reports
│
├── faculty/
│   ├── page.tsx, availability/                 ← Core
│   ├── meetings/, upload/, reports/            ← Consultation Module
│   └── evaluations/                            ← Evaluation Module
│       ├── page.tsx                            ← My results
│       └── [periodId]/                         ← Per-period result detail
│
├── student/
│   ├── page.tsx, book/                         ← Core
│   ├── meetings/, history/                     ← Consultation Module
│   └── evaluations/                            ← Evaluation Module
│       ├── page.tsx                            ← Pending evaluations
│       ├── [periodId]/                         ← Evaluation form
│       └── history/                            ← Past submissions
│
└── api/
    ├── admin/, auth/, users/                   ← Core
    ├── appointments/, availability-rules/       ← Consultation Module
    └── evaluations/                            ← Evaluation Module
        ├── evaluation-periods/
        ├── evaluations/
        ├── evaluation-results/
        ├── evaluation-comments/
        ├── sentiment-analysis/
        └── evaluation-reports/
```

### Data Model — Subject-Based Assignment

Faculty and Student data is linked through **subjects**, not direct assignment.

```
Faculty CSV:     name, email, department, subject
                          ↓
                     faculty_subjects ─── subjects

Student CSV:     name, email, subject
                          ↓
                     student_enrollments ─── subjects

Evaluation:      student_enrollments.subjectId
                 → subjects.id
                 → faculty_subjects.facultyId
                 → UNIQUE faculty per subject
```

Each subject is unique per period and assigned to exactly one faculty member. A student evaluates each **unique** faculty member they have enrollments with (deduplicated).

#### `users` table enhancements

```sql
ALTER TABLE users ADD COLUMN "employeeNo" TEXT;
ALTER TABLE users ADD COLUMN "evaluationEligible" BOOLEAN NOT NULL DEFAULT FALSE;
```

`evaluationEligible` is set to `TRUE` when a student is uploaded via the evaluation Student ETL.

### ETL Strategy (Unified at `/admin/etl-upload`)

The existing ETL page gets **two new tabs** alongside the existing Student and Faculty/Dean uploads:

| Tab | CSV Columns | What It Does | Depends On |
|-----|-------------|-------------|------------|
| Student Upload | `name, email, course` | Creates student users (unchanged) | — |
| Faculty/Dean Upload | `name, email, department, dean` | Creates faculty/dean users (unchanged) | — |
| **Evaluation Faculty** (new) | `name, email, department, subject` | Creates/updates faculty users + subjects + faculty_subjects | A period must exist |
| **Evaluation Students** (new) | `name, email, subject` | Creates/updates students + subjects + student_enrollments + sets evaluationEligible=true | Evaluation Faculty uploaded first |

**Order matters**: Evaluation Faculty must be uploaded before Evaluation Students (students reference subjects that faculty define).

**Skip behavior**: If a student CSV references a subject with no faculty assignment, that row is flagged as an error.

**Re-upload**: Re-uploading replaces existing data for the period (subjects + faculty_subjects + student_enrollments are cleared and rebuilt).

### Permission Model

In `lib/access.ts`, the `DEFAULT_CONFIG` is enhanced:

```typescript
ADMIN: { pages: [
  ...existing,
  "/admin/evaluations",
  "/admin/evaluations/periods",
  "/admin/evaluations/rubrics",
  "/admin/evaluations/upload",
  "/admin/evaluations/results",
  "/admin/evaluations/reports",
  "/admin/evaluations/reports/sentiment",
]},
DEAN: { pages: [
  ...existing,
  "/dean/evaluations",
  "/dean/evaluations/results",
  "/dean/evaluations/reports",
]},
FACULTY: { pages: [
  ...existing,
  "/faculty/evaluations",
]},
STUDENT: { pages: [
  ...existing,
  "/student/evaluations",
  "/student/evaluations/history",
]}
```

### Navigation Items (Sidebar.tsx)

```
Admin collapsible "Evaluations":
  ├── Evaluation Dashboard     (/admin/evaluations)
  ├── Periods                  (/admin/evaluations/periods)
  ├── Rubrics                  (/admin/evaluations/rubrics)
  ├── Upload Data              (/admin/evaluations/upload)
  ├── Results                  (/admin/evaluations/results)
  └── Reports & Sentiment      (/admin/evaluations/reports)

Dean:
  └── Faculty Evaluations      (/dean/evaluations)

Faculty:
  └── My Evaluations           (/faculty/evaluations)

Student:
  └── Evaluate Faculty         (/student/evaluations)
```

### Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **ETL** | Unified at existing `/admin/etl-upload` + 2 new tabs | All data entry in one place; reuses existing validate/confirm pattern |
| **Assignments** | Auto-derived from ETL data (subjects → faculty_subjects → enrollments) | No manual assignment UI needed; driven by real academic data |
| **Subject Uniqueness** | `UNIQUE(periodId, name)` — one faculty per subject | Each section-subject-code-title combo is unique per period |
| **Evaluation Dedup** | One evaluation per faculty per period per student | If student has 2 subjects with same faculty, only 1 evaluation needed |
| **Sentiment Analysis** | Cloud AI API (OpenAI / HuggingFace) | Async analysis on submission + batch reanalysis |
| **Results Computation** | Lazy on-demand + cached in `evaluation_results` | Avoids recomputation on every view |
| **Rubric Versioning** | Copy-per-period (categories + items duplicated) | Past period rubrics immutable |
| **Rating Scale** | Configurable per-period | Default 1-5 (Poor→Excellent) |
| **Remarks Logic** | Computed from `generalRating` threshold | 1.00-1.49=Poor ... 4.50-5.00=Excellent |
| **Report Export** | Reuse `jspdf` + `html2canvas` | Already in dependencies |

### Workflow Summary

```
 1. ADMIN creates Evaluation Period (semester-based)
 2. ADMIN sets up Rubric (8 categories, up to 34 items) for the period
 3. ADMIN uploads Evaluation Faculty CSV → creates/updates users + subjects + faculty_subjects
 4. ADMIN uploads Evaluation Students CSV → creates/updates students + enrollments
 5. STUDENT (with evaluationEligible=true) sees pending evaluations
 6. STUDENT submits evaluation → DRAFT → SUBMITTED
 7. SYSTEM computes results (category averages, general rating, remarks)
 8. SYSTEM runs AI sentiment analysis on comments (async)
 9. FACULTY views results on /faculty/evaluations
10. DEAN views department rollup on /dean/evaluations
11. ADMIN views institutional results, reports, sentiment dashboard
```

---

## 3. Database Design

### Conventions

All naming follows existing e-Consultation conventions:
- Snake_case table names
- CamelCase column names (quoted in SQL)
- `TEXT` primary keys with `gen_random_uuid()::TEXT`
- `TIMESTAMPTZ` for timestamps
- `ON DELETE CASCADE` where appropriate
- `ON DELETE SET NULL` for optional references
- Prefix FK columns with lowercase entity name: `periodId`, `facultyId`, `studentId`

### Existing Table Enhancement

#### `users` — add employee number + evaluation eligibility

```sql
ALTER TABLE users ADD COLUMN "employeeNo" TEXT;
ALTER TABLE users ADD COLUMN "evaluationEligible" BOOLEAN NOT NULL DEFAULT FALSE;
```

`employeeNo` matches the "Employee No" column in evaluation spreadsheet output.
`evaluationEligible` is set to `TRUE` when a student is uploaded via evaluation ETL.

### New Tables

#### `evaluation_periods`

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

#### `rating_scales`

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

#### `rubric_categories`

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

#### `rubric_items`

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

#### `subjects`

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

#### `faculty_subjects`

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

#### `student_enrollments`

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

#### `evaluations`

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

#### `evaluation_ratings`

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

#### `evaluation_comments`

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

#### `evaluation_results`

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

### Entity Relationship Diagram

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

### Evaluation Assignment Derivation (SQL)

```sql
-- Which faculty should student X evaluate in period Y?
SELECT DISTINCT fs."facultyId"
FROM student_enrollments se
JOIN faculty_subjects fs ON se."subjectId" = fs."subjectId" AND se."periodId" = fs."periodId"
WHERE se."studentId" = @studentId AND se."periodId" = @periodId;
```

### Results Computation Logic

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

### Default Seed Data

```sql
INSERT INTO rating_scales ("periodId", name, value, "displayOrder") VALUES
  (<periodId>, 'Poor', 1, 1),
  (<periodId>, 'Fair', 2, 2),
  (<periodId>, 'Good', 3, 3),
  (<periodId>, 'Very Good', 4, 4),
  (<periodId>, 'Excellent', 5, 5);
```

---

## 4. API Design

### Conventions

All APIs follow existing e-Consultation conventions:

| Convention | Pattern |
|-----------|---------|
| Route files | `app/api/<module>/route.ts` or `app/api/<module>/[id]/route.ts` |
| Export names | `GET`, `POST`, `PATCH`, `DELETE` |
| Auth check | `const session = await auth()` at top of handler |
| Auth response | `NextResponse.json({ error: "Unauthorized" }, { status: 401 })` |
| Role check | `hasRole(role, "ADMIN")` returning 403 |
| Success response | `NextResponse.json({ data })` |
| Error response | `NextResponse.json({ error: "message" }, { status: XXX })` |
| Audit logging | `logAuditEvent(...)` fire-and-forget |
| Client fetching | `useApiGet<T>(url)`, `useApiMutate<T>(url)`, `invalidate(...)` |

### Existing APIs Requiring Enhancement

| API | Enhancement | Reason |
|-----|-------------|--------|
| `GET /api/admin/users` | Include `employeeNo` in response | Spreadsheet output |
| `POST /api/admin/users` | Accept `employeeNo` in request body | User creation |
| `PATCH /api/admin/users/[id]` | Accept `employeeNo` | User editing |
| `POST /api/admin/etl-upload/validate` | Handle `evaluation-faculty` and `evaluation-student` types | ETL for evaluation data |
| `POST /api/admin/etl-upload/confirm` | Handle `evaluation-faculty` and `evaluation-student` types | ETL for evaluation data |

### New API Routes

#### Evaluation Periods

```
GET    /api/evaluation-periods
       → { data: EvaluationPeriod[] }
       Query: isActive, schoolYear, semester

POST   /api/evaluation-periods
       → { data: EvaluationPeriod }
       Auth: ADMIN
       Body: { name, semester, schoolYear, startDate, endDate }

GET    /api/evaluation-periods/[id]
       → { data: EvaluationPeriod }

PATCH  /api/evaluation-periods/[id]
       → { data: EvaluationPeriod }
       Auth: ADMIN

DELETE /api/evaluation-periods/[id]
       → { success: true }
       Auth: ADMIN

POST   /api/evaluation-periods/[id]/activate
       → { data: EvaluationPeriod }
       Auth: ADMIN — sets active, deactivates others
```

#### Rubrics

```
GET    /api/evaluation-periods/[id]/rubrics
       → { data: { categories: RubricCategory[] } }

POST   /api/evaluation-periods/[id]/rubrics
       → { data: { categories: RubricCategory[] } }
       Auth: ADMIN — replaces entire rubric for period

PATCH  /api/evaluation-periods/[id]/rubrics/categories/[categoryId]
       → { data: RubricCategory }
       Auth: ADMIN

DELETE /api/evaluation-periods/[id]/rubrics/categories/[categoryId]
       → { success: true }
       Auth: ADMIN

POST   /api/evaluation-periods/[id]/rubrics/items
       → { data: RubricItem }
       Auth: ADMIN

PATCH  /api/evaluation-periods/[id]/rubrics/items/[itemId]
       → { data: RubricItem }
       Auth: ADMIN

DELETE /api/evaluation-periods/[id]/rubrics/items/[itemId]
       → { success: true }
       Auth: ADMIN

POST   /api/evaluation-periods/[id]/rubrics/copy-from
       → { data: { categories: RubricCategory[] } }
       Auth: ADMIN — deep-copies from source period
```

#### ETL Data (Subjects, Faculty-Subjects, Student Enrollments)

These are NOT separate CRUD APIs. Data is managed entirely through the unified ETL upload. The following are **read-only** views of the uploaded data:

```
GET    /api/evaluation-periods/[id]/subjects
       → { data: Subject[] }
       Auth: ADMIN, DEAN

GET    /api/evaluation-periods/[id]/faculty-subjects
       → { data: FacultySubject[] }
       Auth: ADMIN, DEAN

GET    /api/evaluation-periods/[id]/enrollments
       → { data: StudentEnrollment[] }
       Auth: ADMIN, DEAN
       Dean sees only their department

GET    /api/evaluation-periods/[id]/enrollment-stats
       → { data: { facultyCount, subjectCount, studentCount, enrollmentCount } }
       Auth: ADMIN, DEAN
```

#### Student Evaluations

```
GET    /api/evaluations/pending
       → { data: { period: EvaluationPeriod, faculty: User[] }[] }
       Auth: STUDENT — auto-derived from enrollments

GET    /api/evaluations/submitted
       → { data: Evaluation[] }
       Auth: STUDENT

POST   /api/evaluations
       → { data: Evaluation }
       Auth: STUDENT
       Body: { periodId, facultyId }
       Creates DRAFT evaluation

GET    /api/evaluations/[id]
       → { data: EvaluationWithDetails }
       Auth: STUDENT (own), ADMIN, DEAN

PATCH  /api/evaluations/[id]/ratings
       → { data: Evaluation }
       Auth: STUDENT (own)
       Body: { ratings: [{ itemId, rating }] }
       Only if DRAFT

POST   /api/evaluations/[id]/submit
       → { data: Evaluation }
       Auth: STUDENT (own) — DRAFT → SUBMITTED

POST   /api/evaluations/[id]/comments
       → { data: EvaluationComment }
       Auth: STUDENT (own)
       Triggers async sentiment analysis
```

#### Evaluation Results

```
GET    /api/evaluation-results
       → { data: EvaluationResult[] }
       Auth: ADMIN, DEAN, FACULTY
       Query: periodId, departmentId, facultyId

GET    /api/evaluation-results/[id]
       → { data: EvaluationResultDetail }
       Includes category breakdown, comment summaries, sentiment

POST   /api/evaluation-results/compute
       → { success: true }
       Auth: ADMIN, DEAN
       Body: { periodId, facultyId? }

GET    /api/evaluation-results/export
       → CSV/PDF file
       Auth: ADMIN, DEAN
       Query: periodId, departmentId, format (csv|pdf)
```

#### Evaluation Comments & Sentiment

```
GET    /api/evaluation-comments
       → { data: EvaluationComment[] }
       Auth: ADMIN, DEAN
       Query: periodId, facultyId, sentimentLabel

POST   /api/sentiment-analysis/analyze
       → { data: { sentimentScore, sentimentLabel } }
       Auth: internal (called on submission)

POST   /api/sentiment-analysis/batch
       → { success: true, processed: number }
       Auth: ADMIN

GET    /api/sentiment-analysis/summary
       → { data: SentimentSummary }
       Auth: ADMIN, DEAN
       Query: periodId, departmentId, facultyId?
```

#### Evaluation Reports

```
GET    /api/evaluation-reports/department
       → { data: DepartmentEvaluationReport }
       Auth: DEAN, ADMIN

GET    /api/evaluation-reports/institutional
       → { data: InstitutionalReport }
       Auth: ADMIN

GET    /api/evaluation-reports/faculty/[facultyId]
       → { data: FacultyEvaluationReport }
       Auth: ADMIN, DEAN, FACULTY
```

### New Types (`lib/types/evaluation.ts`)

```typescript
// ── Entity Types ──

export interface EvaluationPeriod {
  id: string
  name: string
  semester: string
  schoolYear: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: Date
}

export interface RatingScale {
  id: string
  periodId: string
  name: string
  value: number
  displayOrder: number
}

export interface RubricCategory {
  id: string
  periodId: string
  name: string
  displayOrder: number
  items?: RubricItem[]
}

export interface RubricItem {
  id: string
  categoryId: string
  text: string
  displayOrder: number
  weight: number
}

export interface Subject {
  id: string
  periodId: string
  name: string
}

export interface FacultySubject {
  id: string
  facultyId: string
  subjectId: string
  periodId: string
  faculty?: import("./entity").User
  subject?: Subject
}

export interface StudentEnrollment {
  id: string
  studentId: string
  subjectId: string
  periodId: string
  student?: import("./entity").User
  subject?: Subject
}

export interface Evaluation {
  id: string
  periodId: string
  studentId: string
  facultyId: string
  status: "DRAFT" | "SUBMITTED"
  submittedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface EvaluationRating {
  id: string
  evaluationId: string
  itemId: string
  rating: number
}

export interface EvaluationComment {
  id: string
  evaluationId: string
  comment: string
  sentimentScore: number | null
  sentimentLabel: string | null
  sentimentAnalyzedAt: Date | null
  createdAt: Date
}

export interface EvaluationResult {
  id: string
  periodId: string
  facultyId: string
  departmentId: string | null
  totalRespondents: number
  professionalManner: number | null
  communicationWithStudent: number | null
  studentEngagement: number | null
  learningMaterials: number | null
  timeManagement: number | null
  experientialLearning: number | null
  respectUniqueness: number | null
  assessmentAndFeedback: number | null
  generalRating: number | null
  remarks: string | null
  computedAt: Date
}

export interface EvaluationWithDetails extends Evaluation {
  ratings: EvaluationRating[]
  comments: EvaluationComment[]
  faculty: import("./entity").User
  result?: EvaluationResult
}

export interface EvaluationResultDetail extends EvaluationResult {
  faculty: import("./entity").User
  department?: import("./entity").Department
  commentCount: number
  sentimentDistribution: {
    positive: number
    negative: number
    neutral: number
  }
}

export interface SentimentSummary {
  totalComments: number
  analyzed: number
  distribution: { label: string; count: number; percentage: number }[]
  averageScore: number | null
}

export interface EnrollmentStats {
  facultyCount: number
  subjectCount: number
  studentCount: number
  enrollmentCount: number
}
```

### Repository Interface Additions

Added to `lib/types/repository.ts`:

```typescript
export interface ISubjectRepository {
  list(periodId: string): Promise<SubjectData[]>
  upsertMany(periodId: string, names: string[]): Promise<Map<string, SubjectData>>
  deleteByPeriod(periodId: string): Promise<void>
}

export interface IFacultySubjectRepository {
  list(periodId: string, facultyId?: string): Promise<FacultySubjectData[]>
  replaceAll(periodId: string, items: { facultyId: string; subjectId: string }[]): Promise<void>
  findBySubject(periodId: string, subjectId: string): Promise<FacultySubjectData | null>
}

export interface IStudentEnrollmentRepository {
  list(periodId: string, studentId?: string): Promise<StudentEnrollmentData[]>
  replaceAll(periodId: string, items: { studentId: string; subjectId: string }[]): Promise<void>
  getDistinctFaculty(studentId: string, periodId: string): Promise<string[]>
}
```

### Controllers (`lib/controllers/`)

| Controller | Key Functions |
|------------|---------------|
| `evaluation-periods.ts` | `listPeriods`, `createPeriod`, `updatePeriod`, `deletePeriod`, `activatePeriod` |
| `rubrics.ts` | `getRubric`, `saveRubric`, `copyRubric`, `addItem`, `updateItem`, `deleteItem`, `addCategory`, `deleteCategory` |
| `evaluations.ts` | `getPendingEvaluations` (derives from enrollments), `createDraft`, `saveRatings`, `submitEvaluation`, `addComment` |
| `evaluation-results.ts` | `computeResults`, `getResults`, `getResultDetail` |
| `sentiment-analysis.ts` | `analyzeComment` (calls external AI API), `batchAnalyze` |
| `etl-evaluation.ts` (NEW) | `validateFacultyCsv`, `confirmFacultyCsv`, `validateStudentCsv`, `confirmStudentCsv` |

### ETL Enhancement

#### New upload types for existing ETL routes

```typescript
// lib/constants.ts additions
export type EtlUploadType = "student" | "faculty" | "evaluation-faculty" | "evaluation-student"
```

#### Validate route enhancement (`app/api/admin/etl-upload/validate/route.ts`)

For `evaluation-faculty` type:
- Expected columns: `name, email, department, subject`
- Validates: email domain, user existence (creates if not found), subject format
- Returns preview rows with name, email, department, subject, status

For `evaluation-student` type:
- Expected columns: `name, email, subject`
- Validates: email domain, user existence (creates if not found), subject exists in system
- Skips rows where subject has no faculty assignment (flagged as error)
- Returns preview rows with name, email, subject, inferred faculty, status

#### Confirm route enhancement (`app/api/admin/etl-upload/confirm/route.ts`)

For `evaluation-faculty`:
1. Creates/updates user accounts (faculty role)
2. Creates subjects (if new for this period)
3. Clears and rebuilds faculty_subjects for the period
4. Logs audit event

For `evaluation-student`:
1. Creates/updates user accounts (student role, evaluationEligible=true)
2. Creates subjects (if new — but should already exist from faculty upload)
3. Clears and rebuilds student_enrollments for the period
4. Logs audit event

### Sentiment Analysis Integration

```typescript
// lib/services/sentiment.ts
// Calls external AI API (OpenAI / HuggingFace)
// Triggered on comment submission (fire-and-forget, matching existing email/audit patterns)
// Batch reanalysis available via admin action
```

API key stored in `.env`. Analysis runs:
1. **On submission**: single comment analyzed immediately (fire-and-forget)
2. **Batch reanalysis**: admin can trigger for all unprocessed comments

---

## 5. UI Design

### Redesign: `/admin/users` — Consolidated User Management + Bulk Import

**Current**: `/admin/users` (table/manage) separate from `/admin/etl-upload` (bulk CSV). `/dean/upload` is more refined.

**Decision**: Merge bulk CSV import into `/admin/users` as a toggleable section. This eliminates the separate `/admin/etl-upload` page and reuses the dean/upload card-selector pattern.

**Page Layout**:

```
┌─────────────────────────────────────────────────────────────┐
│  Manage Users                                   [+ Create] │
│  Search, filter, paginate users table                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [▼] Bulk Import (click to expand)                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Faculty/Staff│  │   Students   │  │ Eval Faculty │ ←NEW  │
│  │ name, email, │  │ name, email, │  │ name, email, │     │
│  │ dept, dean   │  │ course       │  │ dept, subject│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  [Selected: Eval Faculty]                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ CSV File: [Choose File] faculty.csv                  │   │
│  │                                                      │   │
│  │ [Upload & Preview]                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Preview Table: 3 rows found                                │
│  #  Name           Email           Dept  Subject        Status│
│  1  Dr. Juan S.    juan@...        CCS   BSIT-3A-CC104  ✓   │
│  2  Dr. Maria C.   maria@...       COE   BSEE-2A-EE201  ✓   │
│                                                             │
│  [Confirm Import 2 records]                                 │
└─────────────────────────────────────────────────────────────┘
```

**Reuse from dean/upload**:
- Card selector pattern (gold border on selected type)
- Template download per type
- Preview table with status badges
- Import summary (Created / Skipped / Errors)

**What changes**:
- `app/admin/users/page.tsx` — add collapsible "Bulk Import" section above the filters
- Existing user CRUD table stays unchanged below
- Remove `app/admin/etl-upload/page.tsx` (replaced by this)

---

### Prototype: All Evaluation Pages

#### `/admin/evaluations` — Hub (exists, minor polish)

```
┌──────────────────────────────────────────────┐
│  Evaluations                                  │
│  Faculty evaluation management                │
├──────────────────────────────────────────────┤
│                                              │
│  ┌────────────────┐  ┌──────────────────┐    │
│  │ Evaluation     │  │ Evaluation       │    │
│  │ Periods        │  │ Results          │    │
│  │                │  │                  │    │
│  │ Create/manage  │  │ View computed    │    │
│  │ eval cycles    │  │ faculty results  │    │
│  └────────────────┘  └──────────────────┘    │
│                                              │
│  ┌────────────────┐  ┌──────────────────┐    │
│  │ Rubric Editor  │  │ Reports          │    │
│  │                │  │                  │    │
│  │ Configure eval │  │ Institutional,   │    │
│  │ criteria       │  │ sentiment, trend │    │
│  └────────────────┘  └──────────────────┘    │
└──────────────────────────────────────────────┘
```

→ Add rubric + reports cards to the existing grid.

---

#### `/admin/evaluations/periods` — Period Management (exists)

Already done. List + create/edit/activate/delete. No changes needed.

---

#### `/admin/evaluations/periods/new` + `[id]` (exists)

Already done. Form with name, semester, school year, dates.

---

#### `/admin/evaluations/periods/[id]/rubric` (exists)

Already done. Inline editor with add/remove categories and items.

---

#### `/admin/evaluations/rubrics` — Standalone Rubric Editor ❌ MISSING

Purpose: Browse rubrics across all periods without navigating to a specific period.

```
┌─────────────────────────────────────────────────────┐
│  Rubrics                              [+ New]        │
│  Configure evaluation criteria per period            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │ Period: [1st Sem A.Y. 2025-2026 ▼]             ││
│  │                                                 ││
│  │ ┌─────────────────────────────────────────────┐ ││
│  │ │ [Copy Rubric from Previous Period →]        │ ││
│  │ └─────────────────────────────────────────────┘ ││
│  │                                                 ││
│  │ ┌── I. PROFESSIONAL MANNER ─────── [Remove] ─┐ ││
│  │ │ 1. Demonstrates expertise in subject matter │ ││
│  │ │ 2. Shows enthusiasm for teaching            │ ││
│  │ │ 3. Is punctual and prepared                 │ ││
│  │ │ [+ Add Item]                                │ ││
│  │ └─────────────────────────────────────────────┘ ││
│  │ ┌── II. COMMUNICATION ──────────── [Remove] ─┐ ││
│  │ │ 1. Communicates clearly and effectively     │ ││
│  │ │ 2. Uses appropriate language                │ ││
│  │ │ [+ Add Item]                                │ ││
│  │ └─────────────────────────────────────────────┘ ││
│  │                                                 ││
│  │ [+ Add Category]                                ││
│  │                                                 ││
│  │ [████████████████████████████████ Save Rubric]  ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

**Behavior**:
- Period selector at top loads that period's rubric
- Copy button deep-copies from another period
- Accordion-style category cards with inline rename/remove
- Items are text inputs with remove buttons
- Add item / add category buttons
- Save replaces the entire rubric atomically

---

#### `/admin/evaluations/upload` — Upload Status ❌ MISSING

```
┌──────────────────────────────────────────────┐
│  Upload Status                                │
│  Current period: 1st Sem A.Y. 2025-2026      │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌─────────┐  │
│  │ 12   │  │ 18   │  │ 245  │  │ 364     │  │
│  │Faculty│  │Subjects│ │Students│ │Enrollmnts│ │
│  └──────┘  └──────┘  └──────┘  └─────────┘  │
│                                              │
│  [Go to Manage Users → Upload Eval Faculty]  │
│  [Go to Manage Users → Upload Eval Students] │
└──────────────────────────────────────────────┘
```

→ Read-only dashboard showing what's been uploaded for the active period. Links to `/admin/users` bulk import.

---

#### `/admin/evaluations/results` — Full Results Table (exists, needs enhancement)

Current: Simple card list with limited data. Should become a full-width spreadsheet table.

```
┌───────────────────────────────────────────────────────────────────────┐
│  Evaluation Results                        Period: [1st Sem ▼]        │
│                                             Dept: [All Depts ▼]      │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Emp #  Name           Dept  PM  CS  SE  LM  TM  EL  RU  AF  GR Rmk Resp│
│  ────── ────────────── ────  ──  ──  ──  ──  ──  ──  ──  ──  ── ─── ──│
│  E001   Dr. Juan S.    CCS   4.5 4.3 4.6 4.2 4.4 4.1 4.5 4.3 4.36 VG  24│
│  E002   Dr. Maria C.   COE   4.8 4.7 4.9 4.6 4.5 4.7 4.8 4.6 4.70 E   18│
│                                                                       │
│  [Export CSV] [Export PDF]                                            │
└───────────────────────────────────────────────────────────────────────┘
```

**Add**: spreadsheet-style table, sortable columns, CSV/PDF export, row click → faculty detail modal/page.

---

#### `/admin/evaluations/reports` — Reports Landing ❌ MISSING

```
┌──────────────────────────────────────────────┐
│  Evaluation Reports                           │
├──────────────────────────────────────────────┤
│                                              │
│  ┌────────────────────┐  ┌────────────────┐  │
│  │ Institutional      │  │ Department     │  │
│  │ Summary            │  │ Comparison     │  │
│  │ Overall stats,     │  │ Side-by-side   │  │
│  │ averages, trends   │  │ department view│  │
│  └────────────────────┘  └────────────────┘  │
│                                              │
│  ┌────────────────────┐  ┌────────────────┐  │
│  │ Period-over-Period │  │ Sentiment      │  │
│  │ Trend              │  │ Analysis       │  │
│  │ Compare semesters  │  │ Comment mood   │  │
│  └────────────────────┘  └────────────────┘  │
└──────────────────────────────────────────────┘
```

---

#### `/admin/evaluations/reports/sentiment` — Sentiment Dashboard ❌ MISSING

```
┌──────────────────────────────────────────────┐
│  Sentiment Analysis          Period: [1st ▼] │
│                                    Dept: [All]│
├──────────────────────────────────────────────┤
│                                              │
│  ┌────────────────────┐   ┌──────────────┐   │
│  │  ● Positive: 142   │   │   Comments   │   │
│  │  ● Neutral:  58    │   │   Analyzed   │   │
│  │  ● Negative: 22    │   │   222/245    │   │
│  │                    │   │              │   │
│  │  [Donut Chart]     │   │ Avg Score    │   │
│  │                    │   │ 0.78         │   │
│  └────────────────────┘   └──────────────┘   │
│                                              │
│  Comments by Department (Bar Chart)          │
│  ████████████████████ CCS                    │
│  ██████████████ COE                          │
│  ██████████████████████████ COC              │
│                                              │
│  Top Positive Comments                       │
│  ──────────────────────────                  │
│  "Dr. Santos is very engaging..."   😊       │
│  "Clear explanations..."           😊        │
│                                              │
│  Top Negative Comments                       │
│  ──────────────────────────                  │
│  "Sometimes late to class..."     😞         │
│                                              │
│  [+ Batch Reanalyze All Unprocessed]         │
└──────────────────────────────────────────────┘
```

---

#### `/dean/evaluations` — Department Dashboard ❌ MISSING

```
┌──────────────────────────────────────────────┐
│  Faculty Evaluations — CCS Dept              │
│  Active: 1st Sem A.Y. 2025-2026              │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │   4.32   │  │    85%   │  │   4.10     │ │
│  │ Dept Avg │  │Submit Rate│  │Engagement  │ │
│  └──────────┘  └──────────┘  └────────────┘ │
│                                              │
│  Faculty                Rating  Rmk  Resp    │
│  ────────────────────── ──────  ───  ────    │
│  Dr. Juan Santos        4.50    E    12      │
│  Dr. Pedro Reyes        4.20    VG   15      │
│                                              │
│  [View Full Results →]  [Reports →]          │
└──────────────────────────────────────────────┘
```

---

#### `/dean/evaluations/results` — Department Results (exists, needs faculty name)

Current: Shows `r.facultyId` as raw ID. Needs to resolve to actual faculty name via the API.

---

#### `/dean/evaluations/reports` — Department Reports ❌ MISSING

```
┌──────────────────────────────────────────────┐
│  Department Reports — CCS                     │
├──────────────────────────────────────────────┤
│                                              │
│  ┌────────────────────┐  ┌────────────────┐  │
│  │ Department Summary │  │ Export CSV     │  │
│  │ Averages, rankings │  │ Download as    │  │
│  │ across faculty     │  │ spreadsheet    │  │
│  └────────────────────┘  └────────────────┘  │
│                                              │
│  ┌────────────────────┐  ┌────────────────┐  │
│  │ Export PDF         │  │ Sentiment      │  │
│  │ Generate report    │  │ Comment mood   │  │
│  │ for printing       │  │ distribution   │  │
│  └────────────────────┘  └────────────────┘  │
└──────────────────────────────────────────────┘
```

---

#### `/faculty/evaluations` — My Dashboard ❌ MISSING

```
┌──────────────────────────────────────────────┐
│  My Evaluations                               │
│  Dr. Juan Santos — CCS Department            │
├──────────────────────────────────────────────┤
│                                              │
│  Latest: 1st Sem A.Y. 2025-2026              │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │             4.36                      │    │
│  │         General Rating                │    │
│  │         Very Satisfactory             │    │
│  │         24 Respondents                │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  Category Breakdown                          │
│  ─────────────────────                       │
│  Prof. Manner     ████████████ 4.50          │
│  Communication   ██████████   4.30           │
│  Engagement      ████████████ 4.60           │
│  Materials       ██████████   4.20           │
│  Time Mgmt       ██████████   4.40           │
│  Experiential    █████████    4.10           │
│  Respect         ██████████   4.50           │
│  Assessment      ██████████   4.30           │
│                                              │
│  [View Period Detail →]                      │
└──────────────────────────────────────────────┘
```

---

#### `/faculty/evaluations/[periodId]` — Period Detail ❌ MISSING

```
┌──────────────────────────────────────────────┐
│  ← My Evaluations                            │
│  1st Sem A.Y. 2025-2026                      │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │             4.36                      │    │
│  │         General Rating                │    │
│  │         Very Satisfactory             │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  Prof. Manner     ████████████████░░ 4.50    │
│  Communication   ██████████████░░░░ 4.30     │
│  Student Engage  █████████████████░ 4.60     │
│  Learning Matls  ██████████████░░░░ 4.20     │
│  Time Mgmt       ██████████████░░░░ 4.40     │
│  Experiential    █████████████░░░░░ 4.10     │
│  Respect Unique  ████████████████░░ 4.50     │
│  Assess/Feedback ██████████████░░░░ 4.30     │
│                                              │
│  ── Comments (18) ──                         │
│  "Very engaging teacher!"          😊        │
│  "Clear explanations"              😊        │
│  "Sometimes late"                  😞        │
│  "Great lab sessions"              😊        │
└──────────────────────────────────────────────┘
```

---

#### `/faculty/evaluations/results` — (exists, aligns with above)

Already done — shows a single result card with category breakdown and period selector.

---

#### `/student/evaluations` — Pending List (exists, needs enhancement)

Current: Shows raw `evaluateeId` instead of faculty name. Needs to resolve to actual names/avatars.

---

#### `/student/evaluations/[id]` — Evaluation Form (exists)

Already done — uses `EvaluationForm` component with rubric, ratings, comments, submit.

---

#### `/student/evaluations/history` — Past Submissions ❌ MISSING

```
┌──────────────────────────────────────────────┐
│  My Evaluation History                        │
├──────────────────────────────────────────────┤
│                                              │
│  1st Sem A.Y. 2025-2026                      │
│  ─────────────────────────                   │
│  Dr. Juan Santos    4.36  VG  Jan 15, 2026   │
│  Dr. Maria Cruz     4.70  E   Jan 14, 2026   │
│                                              │
│  2nd Sem A.Y. 2024-2025                      │
│  ─────────────────────────                   │
│  Dr. Pedro Reyes    4.20  VG  Jun 20, 2025   │
└──────────────────────────────────────────────┘
```

Grouped by period, showing faculty name, rating, remarks, submission date.

---

### Summary of UI Changes

| Page | Status | Action |
|------|--------|--------|
| `/admin/users` | Existing | Add collapsible bulk import section with eval faculty tab |
| `/admin/etl-upload` | Existing | **Remove** — replaced by `/admin/users` bulk import |
| `/admin/evaluations` | ✅ Done | Add rubric + reports cards |
| `/admin/evaluations/rubrics` | ❌ Missing | Build standalone rubric editor with period selector |
| `/admin/evaluations/upload` | ❌ Missing | Build upload status dashboard |
| `/admin/evaluations/results` | ✅ Done | Enhance with spreadsheet table + exports |
| `/admin/evaluations/reports` | ❌ Missing | Build report card grid |
| `/admin/evaluations/reports/sentiment` | ❌ Missing | Build sentiment dashboard |
| `/dean/evaluations` | ❌ Missing | Build dept dashboard with KPIs |
| `/dean/evaluations/results` | ✅ Done | Fix faculty name resolution |
| `/dean/evaluations/reports` | ❌ Missing | Build dept reports page |
| `/faculty/evaluations` | ❌ Missing | Build my results dashboard |
| `/faculty/evaluations/[periodId]` | ❌ Missing | Build period detail with comments |
| `/faculty/evaluations/results` | ✅ Done | Already aligned |
| `/student/evaluations` | ✅ Done | Fix faculty name resolution |
| `/student/evaluations/history` | ❌ Missing | Build history grouped by period |

### Design Principles

- Every new page follows existing **page structure**: server component with async data fetching
- Interactive components use `"use client"` with **SWR** data fetching
- All styling uses existing **Tailwind CSS v4** custom properties (`bg-surface`, `card`, `btn-*`, etc.)
- Mobile views follow the existing `m/` subdirectory pattern
- Loading states use the existing `Skeleton` component
- Empty states use the existing `EmptyState` component
- iOS design patterns (grouped tables, frosted glass, tab bar) are maintained

### Existing Components Reused Without Changes

| Component | Usage |
|-----------|-------|
| `AppShell` | Layout wrapper |
| `Sidebar` | Navigation (enhanced with evaluation items) |
| `NavigationBar` | Top bar with breadcrumbs / large title |
| `NavigationStack` | iOS-style page transitions |
| `Breadcrumbs` | Path navigation |
| `StatusBadge` | Evaluation status (DRAFT/SUBMITTED), sentiment labels |
| `SearchBar` / `SearchInput` | Filter lists |
| `SegmentedControl` | Tab switching |
| `Skeleton` | Loading placeholders |
| `EmptyState` | Empty lists |
| `SubmitButton` | Form submission |
| `Alert` | Notifications |

### New Shared Components

#### `RatingScale`
- **Location**: `components/RatingScale.tsx`
- **Props**: `value: number`, `onChange: (val: number) => void`, `disabled?: boolean`
- **Used by**: Student evaluation form

#### `CategoryProgressBar`
- **Location**: `components/CategoryProgressBar.tsx`
- **Props**: `label: string`, `value: number`, `max: number` (default 5)
- **Used by**: Faculty result detail, Dean department view

#### `FacultyResultCard`
- **Location**: `components/FacultyResultCard.tsx`
- **Props**: `faculty`, `result: EvaluationResult`, `onClick?`
- **Used by**: Faculty list views

#### `SentimentBadge`
- **Location**: `components/SentimentBadge.tsx`
- **Props**: `label: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED"`
- **Used by**: Comment lists, sentiment dashboard

#### `EvaluationFilters`
- **Location**: `components/EvaluationFilters.tsx`
- **Props**: `periods`, `departments?`, `faculties?`, `onFilter`
- **Used by**: Results pages, report pages

#### `EvaluationForm`
- **Location**: `components/EvaluationForm.tsx`
- **Props**: `rubric: RubricCategory[]`, `facultyName`, `periodName`, `onSubmit`
- **Used by**: Student evaluation page

### Existing ETL Enhancement (`/admin/etl-upload`)

Two new tabs are added alongside the existing Student and Faculty/Dean uploads:

```
┌─────────────────────────────────────────────────────┐
│ [Student] [Faculty/Dean] [Eval Faculty] [Eval Student] │ ← tab bar
└─────────────────────────────────────────────────────┘
```

#### Evaluation Faculty Tab

```
CSV columns: name, email, department, subject

Example:
name,email,department,subject
Dr. Juan Santos,juan.santos@lyceumalabang.edu.ph,CCS,BSIT-3A-CC104-Data Structures
Dr. Juan Santos,juan.santos@lyceumalabang.edu.ph,CCS,BSIT-3B-IT105-Networking
Dr. Maria Cruz,maria.cruz@lyceumalabang.edu.ph,COE,BSEE-2A-EE201-Circuits

Preview table:
#  Name            Email                          Dept  Subject                        Status
1  Dr. Juan Santos juan.santos@...               CCS   BSIT-3A-CC104-Data Structures  ✓ Valid
2  Dr. Juan Santos juan.santos@...               CCS   BSIT-3B-IT105-Networking       ✓ Valid
3  Dr. Maria Cruz  maria.cruz@...                 COE   BSEE-2A-EE201-Circuits         ✓ Valid

Confirm: [Upload 3 Faculty Subjects]
Effect: Creates/updates users + subjects + faculty_subjects
```

#### Evaluation Student Tab

```
CSV columns: name, email, subject

Example:
name,email,subject
Juan Dela Cruz,juan.delacruz@student.edu.ph,BSIT-3A-CC104-Data Structures
Maria Reyes,maria.reyes@student.edu.ph,BSIT-3B-IT105-Networking

Preview table:
#  Name            Email                          Subject                        Faculty           Status
1  Juan Dela Cruz  juan.delacruz@...              BSIT-3A-CC104-Data Structures  Dr. Juan Santos   ✓ Valid
2  Maria Reyes     maria.reyes@...                BSIT-3B-IT105-Networking       Dr. Juan Santos   ✓ Valid

Confirm: [Upload 2 Student Enrollments]
Effect: Creates/updates students (evaluationEligible=true) + subjects + enrollments
```

The faculty column in the preview is **inferred** from the subject → faculty_subjects mapping. Rows where the subject has no faculty assignment show an error.

### STUDENT PAGES

#### `/student/evaluations` — Pending Evaluations List

```
NavigationBar: "Evaluate Faculty" (large title)
 ┌─────────────────────────────┐
 │  Active Period: 2nd Sem...  │ ← card with period info
 ├─────────────────────────────┤
 │  Faculty to Evaluate        │ ← section header
 ├─────────────────────────────┤
 │  [Avatar] Dr. Juan Santos   │
 │  College of Engineering     │
 │  [Start Evaluation →]       │ ← CTA
 ├─────────────────────────────┤
 │  Completed Evaluations      │ ← section header
 ├─────────────────────────────┤
 │  [Avatar] Dr. Maria Cruz    │
 │  College of Education       │
 │  ✓ Submitted (View)         │
 └─────────────────────────────┘
```

#### `/student/evaluations/[periodId]` — Evaluation Form

Full scrolling form with 8 category sections, each containing:
- Category header (e.g., "I. PROFESSIONAL MANNER")
- Individual items with 5-star `RatingScale` per item
- All 34 items must be rated before submit
- Optional comments textarea at the bottom
- Submit button → confirmation Alert

#### `/student/evaluations/history` — Past Submissions

iOS grouped table showing past evaluations with faculty name, rating, submission date.

### FACULTY PAGES

#### `/faculty/evaluations` — My Evaluation Results Dashboard

Dashboard cards: latest evaluation period, general rating, category breakdown, respondent count. Links to per-period detail.

#### `/faculty/evaluations/[periodId]` — Period Detail

Hero number (general rating), `CategoryProgressBar` for each of 8 categories, comment section with `SentimentBadge` indicators.

### DEAN PAGES

#### `/dean/evaluations` — Department Evaluation Dashboard

Active period info, submission rate, department average, faculty summary table (clickable → detail).

#### `/dean/evaluations/results` — Department Results Table

Full results table matching spreadsheet format: NO, NAME, 8 categories, general rating, remarks, respondents.

#### `/dean/evaluations/reports` — Department Reports

Department summary, export to CSV/PDF.

### ADMIN PAGES

#### `/admin/evaluations` — Dashboard

Active period stats, quick links grid, department comparison table.

#### `/admin/evaluations/periods` — Period Management

iOS grouped table with create/edit modals, activate/deactivate.

#### `/admin/evaluations/rubrics` — Rubric Editor

Period selector, expandable category accordion with inline editing, add/remove items and categories, copy from previous period, preview form.

#### `/admin/evaluations/upload` — Upload Status

Shows what data has been uploaded for the current period (faculty count, subject count, enrollment count). Links to re-upload via the ETL page.

#### `/admin/evaluations/results` — Full Results Table

Full-width table matching spreadsheet exactly. Employee No, Name, Department, 8 category columns, General Rating, Remarks, Respondents. Filterable by period/department/faculty. Sortable columns. Export CSV/PDF. Click row → faculty detail.

#### `/admin/evaluations/reports` — Reports Landing

Card grid: Institutional Summary, Department Comparison, Period-over-Period Trend, Sentiment Analysis.

#### `/admin/evaluations/reports/sentiment` — Sentiment Dashboard

Overall distribution (donut chart), by department (bar chart), top positive/negative comments.

### Mobile Views

```
app/student/evaluations/m/     → pending list + evaluation form (mobile-optimized)
app/dean/evaluations/m/        → dean dashboard
app/admin/evaluations/m/       → admin dashboard, results, sentiment
```

Mobile views share the same data layer, using iOS-native patterns: full-width grouped tables, larger touch targets, bottom action sheets.

---

## 6. Effort Estimate

**Methodology**: Each "prompt" = one AI interaction that generates, edits, or reviews code. A prompt can produce 1 file or a logical group of related files. Includes generation + 1 refinement pass.

### Phase 1: Database Setup (3 prompts — risk: none, it's additive)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 1 | Generate SQL migration: 11 new tables + 2 ALTER TABLE on `users` + indexes | `supabase-schema.sql` addition | None — additive only |
| 2 | Generate `lib/types/evaluation.ts` with all entity/DTO types + `lib/types/repository.ts` additions | 1 new file + 1 edit | Low — new types, existing types unaffected |
| 3 | Generate 5 new repositories in `lib/repositories/supabase/` + update `factory.ts` | 5 new files + 1 edit | Low — factory.ts only adds exports |

**Blast radius**: Zero. New tables don't touch existing tables. New repos don't affect existing repos.

### Phase 2: Controllers (3 prompts — risk: low)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 4 | Generate `lib/controllers/evaluation-periods.ts` + `rubrics.ts` | 2 new files | None |
| 5 | Generate `lib/controllers/evaluations.ts` + `evaluation-results.ts` | 2 new files | None |
| 6 | Generate `lib/controllers/sentiment-analysis.ts` + `etl-evaluation.ts` | 2 new files | None |

**Blast radius**: None. Pure new files.

### Phase 3: API Routes (5 prompts — risk: low)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 7 | Generate `app/api/evaluation-periods/route.ts` + `[id]/route.ts` + `[id]/activate/route.ts` | 3 new files | None |
| 8 | Generate `app/api/evaluation-periods/[id]/rubrics/**` + `subjects/**` + `faculty-subjects/**` + `enrollments/**` + `enrollment-stats/**` | ~8 new files | None |
| 9 | Generate `app/api/evaluations/**` (pending, submitted, create, ratings, submit, comments) | ~7 new files | None |
| 10 | Generate `app/api/evaluation-results/**` + `evaluation-comments/**` | ~5 new files | None |
| 11 | Generate `app/api/sentiment-analysis/**` + `evaluation-reports/**` | ~5 new files | None |

**Blast radius**: None. All new route files under `/api/` — no existing routes touched.

### Phase 4: Shared Components (2 prompts — risk: none)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 12 | Generate `RatingScale`, `CategoryProgressBar`, `FacultyResultCard`, `SentimentBadge` | 4 new components | None |
| 13 | Generate `EvaluationFilters`, `EvaluationForm` | 2 new components | None |

**Blast radius**: None. All new files in `components/`.

### Phase 5: Consolidated Bulk Import in `/admin/users` (3 prompts — risk: moderate)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 14 | Edit `lib/constants.ts` — add `evaluation-faculty` and `evaluation-student` to `EtlUploadType` | 1 existing file | Low — adds enum values |
| 15 | Edit `app/admin/users/page.tsx` — add collapsible Bulk Import section with card selector + eval faculty tab | 1 existing file | **Moderate** — must preserve existing CRUD functionality; bulk import is additive above the table |
| 16 | Edit `app/api/admin/etl-upload/validate/route.ts` + `confirm/route.ts` — handle 2 new types OR keep using direct `app/api/import/evaluation-faculty` endpoint | 2 existing files (or none if using direct endpoint) | Low — the eval import endpoints already exist as separate routes |

**Decision**: Use existing `app/api/import/evaluation-faculty` and `app/api/import/evaluation-student` endpoints directly (they're already built). No changes needed to the old `etl-upload/validate` and `etl-upload/confirm` routes. The `/admin/etl-upload` page can be deprecated.

**Blast radius**: The `/admin/users` page must preserve its existing user CRUD table, modals, search, filter, and pagination. The bulk import section is a collapsible area added above the table — visible only when expanded.

### Phase 6: Student Pages (2 prompts — risk: none)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 16 | Generate `app/student/evaluations/page.tsx` + `history/page.tsx` + mobile `m/` views | 4 new files | None |
| 17 | Generate `app/student/evaluations/[periodId]/page.tsx` + mobile version | 2 new files | None |

**Blast radius**: None. Entirely new directory.

### Phase 7: Faculty Pages (1 prompt — risk: none)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 18 | Generate `app/faculty/evaluations/page.tsx` + `[periodId]/page.tsx` + mobile | 3-4 new files | None |

**Blast radius**: None. Entirely new directory.

### Phase 8: Dean Pages (1 prompt — risk: none)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 19 | Generate `app/dean/evaluations/page.tsx` + `results/page.tsx` + `reports/page.tsx` + mobile | 4-5 new files | None |

**Blast radius**: None. Entirely new directory.

### Phase 9: Admin Pages (3 prompts — risk: none)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 20 | Generate `app/admin/evaluations/page.tsx` + `periods/page.tsx` + `rubrics/page.tsx` | 3 new files | None |
| 21 | Generate `app/admin/evaluations/upload/page.tsx` + `results/page.tsx` + `results/[facultyId]/page.tsx` | 3 new files | None |
| 22 | Generate `app/admin/evaluations/reports/page.tsx` + `reports/sentiment/page.tsx` + mobile views | 4-5 new files | None |

**Blast radius**: None. Entirely new directory.

### Phase 10: Integration & Wiring (3 prompts — risk: the side effects)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 23 | Edit `lib/types/index.ts` — add evaluation export | 1 existing file | Low — one line added |
| 24 | Edit `lib/access.ts` DEFAULT_CONFIG — add evaluation paths per role | 1 existing file | Low — adds to existing arrays |
| 25 | Edit `components/Sidebar.tsx` — add collapsible evaluation nav section | 1 existing file | **Low-Medium** — adds new collapsible section alongside admin reports |

**Blast radius**: Low. Sidebar changes add nav items but don't alter existing items. Access config adds paths but doesn't remove any.

### Phase 11: Sentiment AI (1 prompt — risk: none)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 26 | Generate `lib/services/sentiment.ts` + `.env` config | 1-2 files | None — new service, env additions only |

### Phase 12: Testing (3 prompts — risk: none)

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| 27 | Generate unit tests for controllers | `lib/__tests__/` additions | None |
| 28 | Generate unit tests for repositories | `lib/__tests__/` additions | None |
| 29 | Generate ETL validation tests | `lib/__tests__/` additions | None |

### Risk Summary

| Risk Level | Phases | Count |
|-----------|--------|-------|
| **None** (new files only) | 1-4, 6-9, 11-12 | 24 prompts |
| **Low** (add enum values, add exports, add paths to arrays) | 5 (constants), 10 (types, access) | 3 prompts |
| **Moderate** (branching logic in existing routes) | 5 (validate + confirm routes) | 1 prompt |
| **High** (rewrites existing behavior) | None | 0 prompts |

**The ETL validate/confirm routes at Phase 5, Prompt 15 is the only moderate-risk area.** The approach: keep existing logic in clearly separated `if/else` blocks, test all 4 upload types after changes.

### Adjusted Estimate

| Scenario | Prompts | Wall Clock |
|----------|---------|------------|
| **Minimum** (ideal, no iteration) | 26 | ~4-6 hours |
| **Likely** (1 refinement pass, fixes) | 35-40 | ~1-1.5 days |
| **Maximum** (multiple refinements) | 50-55 | ~2 days |

**Key insight**: 24 out of 26 prompts (92%) touch exclusively NEW files. Only 2 prompts touch existing code. The blast radius is concentrated in the ETL routes and integration wiring.
