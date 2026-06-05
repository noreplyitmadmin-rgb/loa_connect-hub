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
| Migration 13: 11 new eval tables (subject-based, periodId FKs) | ✅ Done (`supabase-schema.sql`) |
| Migration 14: ALTER users (`employeeNo`, `evaluationPeriodId`) | ✅ Done |
| Migration 15: `group_access` eval paths | ✅ Done |
| Migration 16: Drop periodId FKs, make nullable — decouple ETL from periods | ✅ Done |
| Migration 17: Introduce `sections` table, rewrite `faculty_subjects` + `student_enrollments` to section-based, add `code` to `subjects` | ✅ Done |

### Types

| File | Status |
|------|--------|
| `lib/types/evaluation.ts` (all entity/DTO types) | ✅ Done |

### Repositories

| Repository | Status |
|------------|--------|
| `evaluation-period` | ✅ Done |
| `subject` | ✅ Done |
| `section` | ✅ Done |
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
| `import/preview` | ✅ Done — parses CSV + checks emails against users table |
| `import/users` | ✅ Updated — accepts `multipart/form-data` (CSV) or `application/json` (preview confirm) |
| `import/students` | ✅ Updated — same dual-accept |
| `admin/reset-data` | ✅ Done — deletes all non-seed data (localhost only) |
| ETL handler for eval types | ✅ N/A — eval hub uses direct import endpoints (`/admin/etl-hub`) |

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
| `users` table (add `employeeNo`, `evaluationPeriodId`) | **Enhance** | Core |
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
| **ETL hub** (`/admin/etl-hub`) | **Enhance** | Core — Faculty-Subject + Student Enrollment CSV imports |
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
│   ├── data-management/, etl-hub/              ← Core (ETL for evaluation data)
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

### Data Model — Section-Based Assignment

Faculty and student data is linked through **sections** (class groups), not direct student-to-faculty assignment.

**Program context**: A department (e.g., College of Computer Studies) offers programs/courses like BSIT and BSCS. Each program has sections identified by name (e.g., "32A1"). In the ETL, these are combined in the display string "BSIT-32A1" but stored separately:
- `sections.name = "32A1"` (the section identifier within a program)
- `sections.program = "BSIT"` (the program/course)

A **faculty member** teaches a **subject** to a **section** within a **program** (e.g., Regie Ellana teaches ELEC-323 to the section "32A1" under program BSIT). A **student** is enrolled in sections (e.g., Rachel is enrolled in section "32A1"/BSIT). Evaluation is derived by joining students → sections → faculty, and the meaningful evaluation grouping is the full triplet **(program-section, subject, faculty)** — e.g., "BSIT-32A1 ELEC-323 by Regie Ellana".

```
Faculty CSV:     faculty email, subject code, section (e.g., "BSIT-32A1")
                          ↓
                     subjects ─── faculty_subjects ─── sections

Student CSV:     student email, section (e.g., "BSIT-32A1")
                          ↓
                     student_enrollments ─── sections

Evaluation:      student_enrollments.sectionId
                 → faculty_subjects.sectionId
                 → faculty_subjects.facultyId
                 → deduplicated faculty list
```

**Example** with your data:

| Person | Role | Program | Section | Subject |
|--------|------|---------|---------|---------|
| Regie Ellana | Faculty | BSIT | 32A1 | ELEC-323 |
| Regie Ellana | Faculty | BSIT | 11M2 | PROG-1 |
| Nin Alamo | Faculty | BSIT | 32A1 | ELEC-212 |
| Rachel Lucban | Student | BSIT | 32A1 | ELEC-323 |
| Rachel Lucban | Student | BSIT | 32A1 | ELEC-212 |
| JB Lobrico | Student | BSIT | 32A1 | ELEC-212 |
| JB Lobrico | Student | BSIT | 11M2 | PROG-1 |

**Evaluation derivation (deduplicated by faculty)**:
- Rachel → Regie Ellana (takes ELEC-323 in BSIT-32A1, which Regie teaches)
- Rachel → Nin Alamo (takes ELEC-212 in BSIT-32A1, which Nin teaches)
- JB → Nin Alamo (takes ELEC-212 in BSIT-32A1, which Nin teaches)
- JB → Regie Ellana (takes PROG-1 in BSIT-11M2, which Regie teaches)

No boolean flags needed — the enrollment data (student → subject → section → faculty) speaks for itself. The constraint `UNIQUE(subjectId, sectionId)` on `faculty_subjects` ensures no two faculty can teach the same subject to the same (program-)section.

#### `users` table enhancements

```sql
ALTER TABLE users ADD COLUMN "employeeNo" TEXT;
ALTER TABLE users ADD COLUMN "evaluationPeriodId" TEXT REFERENCES evaluation_periods(id) ON DELETE SET NULL;
```

`evaluationPeriodId` tracks which evaluation period the user is currently participating in (set when evaluations are created for a period).

### Evaluation ETL (at `/admin/etl-hub`)

The `/admin/etl-hub` page handles **evaluation-specific** imports. Users **must already exist** in the system (created individually via `/admin/users` CRUD). The ETL data is **global** — not scoped to evaluation periods.

#### Faculty-Subject CSV → Table Mapping

**CSV headers:** `faculty email, subject code, section`

Example row: `regie.ellana@lyceumalabang.edu.ph, ELEC-323, BSIT-32A1`

```
┌──────────────────────┐     ┌──────────────────────┐
│   CSV Row            │     │   users table         │
│   faculty email ─────────→ │   (findByEmail)       │
│   regie...@...       │     │   → facultyId         │
└──────────────────────┘     └──────────────────────┘
         │
         ▼
┌──────────────────────┐     ┌──────────────────────┐
│   subject code       │     │   subjects table      │
│   "ELEC-323" ────────────→│   code="ELEC-323"      │
│                       │     │   name="ELEC-323"     │
│                       │     │   (upsert by code)    │
│                       │     │   → subjectId         │
└──────────────────────┘     └──────────────────────┘
         │
         ▼
┌──────────────────────┐     ┌──────────────────────┐
│   section column     │     │   sections table      │
│   "BSIT-32A1"        │     │                       │
│       │              │     │   program="BSIT"       │
│   parsed:            │     │   name="32A1"          │
│   program = "BSIT"   │     │   (upsert by name+prog)│
│   name   = "32A1"    │     │   → sectionId          │
└──────────────────────┘     └──────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│              faculty_subjects table               │
│  facultyId │ subjectId │ sectionId                │
│  (from     │ (from     │ (from                    │
│   users)   │  subjects)│  sections)               │
├──────────────────────────────────────────────────┤
│  uuid-123  │ uuid-456  │ uuid-789                │
└──────────────────────────────────────────────────┘
         │
   Grouped by sectionId →
   Delete all existing for section
   Insert new batch (replace strategy)
```

| Step | CSV Column | Database Table | Column(s) | Operation |
|------|-----------|---------------|-----------|-----------|
| 1 | `faculty email` | `users` | `id` (lookup) | `findByEmail()` — must exist or row is skipped with error |
| 2 | `subject code` | `subjects` | `code`, `name` | Upsert: `name` defaults to `code`; if `code` exists, reuse row |
| 3 | `section` → parsed `program`+`name` | `sections` | `program`, `name` | Upsert: splits on first `-`; unique key = `(name, program)` |
| 4 | resolved UUIDs | `faculty_subjects` | `facultyId`, `subjectId`, `sectionId` | Grouped by `sectionId` → delete-then-insert (atomic replace) |

#### Student Enrollment CSV → Table Mapping

**CSV headers:** `student email, section`

Example row: `rachel.lucban@itmlyceumalabang.onmicrosoft.com, BSIT-32A1`

```
┌──────────────────────┐     ┌──────────────────────┐
│   CSV Row            │     │   users table         │
│   student email ─────────→│   (findByEmail)        │
│   rachel...@...      │     │   → studentId         │
└──────────────────────┘     └──────────────────────┘
         │
         ▼
┌──────────────────────┐     ┌──────────────────────┐
│   section column     │     │   sections table      │
│   "BSIT-32A1" ──────────→│   program="BSIT"       │
│   parsed:             │     │   name="32A1"          │
│   program = "BSIT"   │     │   (upsert by name+prog)│
│   name   = "32A1"    │     │   → sectionId          │
└──────────────────────┘     └──────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│       student_enrollments table      │
│  studentId │ sectionId              │
│  (from     │ (from                  │
│   users)   │  sections)             │
├────────────────────────────────────┤
│  uuid-abc  │ uuid-789              │
└────────────────────────────────────┘
         │
   Grouped by sectionId →
   Delete all existing for section
   Insert new batch (replace strategy)
```

| Step | CSV Column | Database Table | Column(s) | Operation |
|------|-----------|---------------|-----------|-----------|
| 1 | `student email` | `users` | `id` (lookup) | `findByEmail()` — must exist or row is skipped |
| 2 | `section` → parsed `program`+`name` | `sections` | `program`, `name` | Upsert: splits on first `-`; unique key = `(name, program)` |
| 3 | resolved UUIDs | `student_enrollments` | `studentId`, `sectionId` | Grouped by `sectionId` → delete-then-insert (atomic replace) |

#### Key Behaviors

- **Users must pre-exist** — the ETL matches emails against the `users` table and errors if not found
- **Subjects** are upserted by `code`; `name` defaults to `code` (a separate subject naming flow can update names later)
- **Sections** are parsed from the format `PROGRAM-NAME` (e.g., `BSIT-32A1` → program=`BSIT`, name=`32A1`) and upserted by unique `(name, program)`
- **Replace strategy**: faculty_subjects and student_enrollments are grouped by section and replaced atomically — all existing entries for a section are deleted before inserting new ones
- **No period linkage**: ETL data is independent of evaluation periods. Period-scoping happens only at the evaluation level

#### User Creation

Users must be created individually via the `/admin/users` CRUD UI (Create User button + form). The bulk import feature was decommissioned — there is no CSV import for creating users.

| Method | What It Does |
|--------|-------------|
| `/admin/users` CRUD | Admin creates users one-by-one with name, email, role, department |

**Department**: Users are NOT auto-assigned a department. The admin assigns it later via user management UI.

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
| **ETL** | Unified at `/admin/etl-hub` | Two CSV imports (Faculty-Subject, Student Enrollments) |
| **Assignments** | Auto-derived from ETL data (sections → faculty_subjects → student_enrollments) | No manual assignment UI needed; driven by real academic data |
| **Faculty-Subject Uniqueness** | `UNIQUE(subjectId, sectionId)` — one faculty per subject per section | A faculty member teaches one subject to one section |
| **Evaluation Dedup** | One evaluation per faculty per period per student | If student has 2 subjects with same faculty, only 1 evaluation needed |
| **Sentiment Analysis** | Cloud AI API (OpenAI / HuggingFace) | Async analysis on submission + batch reanalysis |
| **Results Computation** | Lazy on-demand + cached in `evaluation_results` | Avoids recomputation on every view |
| **Rubric Versioning** | Copy-per-period (categories + items duplicated) | Past period rubrics immutable |
| **Rating Scale** | Configurable per-period | Default 1-5 (Poor→Excellent) |
| **Remarks Logic** | Computed from `generalRating` threshold | 1.00-1.49=Poor ... 4.50-5.00=Excellent |
| **Report Export** | Reuse `jspdf` + `html2canvas` | Already in dependencies |

### Workflow Summary

```
 1. ADMIN creates users (Faculty/Student) individually via `/admin/users` CRUD (Create User form)
 2. ADMIN creates Evaluation Period (semester-based) via `/admin/evaluations/periods`
 3. ADMIN sets up Rubric for the period (categories + items)
 4. ADMIN imports Faculty-Subject mappings via `/admin/etl-hub` → links faculty, subjects, sections
 5. ADMIN imports Student Enrollments via `/admin/etl-hub` → links students to sections
 6. STUDENT sees pending evaluations (derived from section membership)
 7. STUDENT submits evaluation → DRAFT → SUBMITTED
 8. SYSTEM computes results (category averages, general rating, remarks)
 9. SYSTEM runs AI sentiment analysis on comments (async)
10. FACULTY views results on /faculty/evaluations
11. DEAN views department rollup on /dean/evaluations
12. ADMIN views institutional results, reports, sentiment dashboard
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

#### `users` — add employee number + evaluation period reference

```sql
ALTER TABLE users ADD COLUMN "employeeNo" TEXT;
ALTER TABLE users ADD COLUMN "evaluationPeriodId" TEXT REFERENCES evaluation_periods(id) ON DELETE SET NULL;
```

`employeeNo` matches the "Employee No" column in evaluation spreadsheet output.
`evaluationPeriodId` tracks which evaluation period the user is currently linked to. No boolean flag needed — enrollment data itself determines who evaluates whom.

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

Defines the rating options per period. Default 1-5: Poor, Fair, Good, Very Good, Excellent. `periodId` FK was dropped (Migration 16) making it nullable.

```sql
CREATE TABLE rating_scales (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "periodId" TEXT,                         -- nullable, no FK constraint
  name TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value >= 1),
  "displayOrder" INTEGER NOT NULL,
  UNIQUE("periodId", value)
);
```

#### `rubric_categories`

The 8 evaluation categories (Professional Manner, Communication, etc.). `periodId` FK was dropped (Migration 16) making it nullable.

```sql
CREATE TABLE rubric_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "periodId" TEXT,                         -- nullable, no FK constraint
  name TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
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

Academic subjects identified by a short `code` (e.g., "ELEC-323"). Subjects are global (not period-scoped). The `name` can hold a descriptive title (e.g., "Elective 3: Fullstack Web Development").

```sql
CREATE TABLE subjects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  code TEXT NOT NULL UNIQUE,              -- "ELEC-323"
  name TEXT NOT NULL                      -- "Elective 3: Fullstack Web Development" (defaults to code)
);

CREATE INDEX idx_subjects_code ON subjects(code);
```

#### `sections`

Class groups identified by `name` within a `program` (e.g., program="BSIT", name="32A1"). Each section is globally unique by `(name, program)`. Links are established through `faculty_subjects` and `student_enrollments`.

```sql
CREATE TABLE sections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,                     -- "32A1"
  program TEXT NOT NULL,                  -- "BSIT"
  UNIQUE(name, program)
);

CREATE INDEX idx_sections_name ON sections(name);
CREATE INDEX idx_sections_program ON sections(program);
```

#### `faculty_subjects`

Links a faculty member, a subject, and a section together — a faculty member teaches one subject to one section. This table has **no periodId** because the ETL data is global.

```sql
CREATE TABLE faculty_subjects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "facultyId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "subjectId" TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  "sectionId" TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  UNIQUE("subjectId", "sectionId")         -- one faculty per subject per section
);

CREATE INDEX idx_faculty_subjects_section ON faculty_subjects("sectionId");
CREATE INDEX idx_faculty_subjects_faculty ON faculty_subjects("facultyId");
CREATE INDEX idx_faculty_subjects_subject ON faculty_subjects("subjectId");
```

#### `student_enrollments`

Links a student to a section they attend. Evaluation is derived by joining `student_enrollments.sectionId → faculty_subjects.sectionId` to find which faculty teach the sections a student belongs to.

```sql
CREATE TABLE student_enrollments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "studentId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "sectionId" TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  UNIQUE("studentId", "sectionId")
);

CREATE INDEX idx_student_enrollments_section ON student_enrollments("sectionId");
CREATE INDEX idx_student_enrollments_student ON student_enrollments("studentId");
```

#### `evaluations`

One row per student-faculty-period combination. Status: DRAFT → SUBMITTED. Uses `evaluatorId` (student) and `evaluateeId` (faculty) for column naming. The `periodId` FK constraint was dropped (Migration 16) to decouple from evaluation_periods.

```sql
CREATE TABLE evaluations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "periodId" TEXT,                         -- references evaluation_periods(id) — nullable, no FK constraint
  "evaluatorId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "evaluateeId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED')),
  "submittedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("periodId", "evaluatorId", "evaluateeId")
);
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

Pre-computed aggregate results per faculty per period. Mirrors spreadsheet output. `periodId` FK was dropped (Migration 16) to decouple from evaluation_periods.

```sql
CREATE TABLE evaluation_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "periodId" TEXT,                         -- nullable, no FK constraint
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
users(faculty) ──┐
                 ├── faculty_subjects ── subjects
                 │         │
                 │    sections ──────────── student_enrollments ── users(student)
                 │         │
                 └── evaluations ── evaluation_periods (via periodId)
                       │
                       ├── evaluation_ratings ── rubric_items
                       ├── evaluation_comments
                       └── evaluation_results (1:1 per faculty per period)
```

**Key relationships**:
- `faculty_subjects` links faculty + subject + section (no period scope)
- `student_enrollments` links student + section (no period scope)
- `evaluations` links evaluator + evaluatee + period (period-scoped)
- ETL data (subjects, sections, faculty_subjects, student_enrollments) is **global** — periods only scope evaluations and results

### Evaluation Assignment Derivation (SQL / Repository)

```typescript
// Which faculty should student X evaluate in period Y?
// 1. Find all sections the student belongs to
const enrollments = await db
  .from("student_enrollments")
  .select("sectionId")
  .eq("studentId", studentId)

// 2. Find all faculty teaching those sections (deduplicated)
const facultyIds = await db
  .from("faculty_subjects")
  .select("facultyId")
  .in("sectionId", sectionIds)

// 3. Result is the distinct list of faculty
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
| `POST /api/import/evaluation-faculty` | CSV upload for Faculty-Subject mappings | ETL for evaluation data |
| `POST /api/import/evaluation-student` | CSV upload for Student Enrollments | ETL for evaluation data |

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

These are NOT separate CRUD APIs. Data is managed entirely through the unified ETL upload. The following are **read-only** views returning **global** data (not period-scoped):

```
GET    /api/evaluation-periods/[id]/subjects
       → { data: Subject[] }
       Auth: ADMIN, DEAN
       Note: Returns ALL subjects (ignores [id])

GET    /api/evaluation-periods/[id]/faculty-subjects
       → { data: FacultySubject[] }
       Auth: ADMIN, DEAN
       Note: Returns ALL faculty-subject mappings (ignores [id])

GET    /api/evaluation-periods/[id]/enrollments
       → { data: StudentEnrollment[] }
       Auth: ADMIN, DEAN
       Note: Returns ALL enrollments (ignores [id])

GET    /api/evaluation-periods/[id]/enrollment-stats
       → { data: { facultyCount, subjectCount, studentCount, enrollmentCount } }
       Auth: ADMIN, DEAN
       Note: Returns global counts (ignores [id])
```

#### Student Evaluations

```
GET    /api/evaluations/pending
       → { data: { period: EvaluationPeriod, faculty: User[] }[] }
       Auth: STUDENT — auto-derived from section enrollments

GET    /api/evaluations/submitted
       → { data: Evaluation[] }
       Auth: STUDENT

POST   /api/evaluations
       → { data: Evaluation }
       Auth: STUDENT
       Body: { periodId, evaluateeId }
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

### Types (`lib/types/evaluation.ts`)

```typescript
// ── Entity Types ──

export interface EvaluationPeriod {
  id: string
  name: string                           // "First Semester 2026 - 2027"
  semester: string
  schoolYear: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: Date
}

export interface Subject {
  id: string
  code: string                           // "ELEC-323"
  name: string                           // "Elective 3: Fullstack Web Development"
}

export interface Section {
  id: string
  name: string                           // "32A1"
  program: string                        // "BSIT"
}

export interface FacultySubject {
  id: string
  facultyId: string
  subjectId: string
  sectionId: string
}

export interface StudentEnrollment {
  id: string
  studentId: string
  sectionId: string
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

export interface Evaluation {
  id: string
  periodId: string                      // scopes to period at evaluation level only
  evaluatorId: string                   // the student
  evaluateeId: string                   // the faculty
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
  result?: EvaluationResult
}

export interface EvaluationResultDetail extends EvaluationResult {
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

### Repository Interfaces (`lib/types/evaluation.ts` — current)

```typescript
export interface ISubjectRepository {
  list(): Promise<SubjectData[]>
  upsertMany(items: { code: string; name: string }[]): Promise<Map<string, SubjectData>>
  findByCode(code: string): Promise<SubjectData | null>
}

export interface ISectionRepository {
  list(): Promise<SectionData[]>
  upsertMany(items: { name: string; program: string }[]): Promise<Map<string, SectionData>>
  findByNameAndProgram(name: string, program: string): Promise<SectionData | null>
}

export interface IFacultySubjectRepository {
  list(filters?: { facultyId?: string; sectionId?: string }): Promise<FacultySubjectData[]>
  replaceBySection(sectionId: string, items: { facultyId: string; subjectId: string }[]): Promise<void>
  findBySubjectAndSection(subjectId: string, sectionId: string): Promise<FacultySubjectData | null>
}

export interface IStudentEnrollmentRepository {
  list(filters?: { studentId?: string; sectionId?: string }): Promise<StudentEnrollmentData[]>
  replaceBySection(sectionId: string, items: { studentId: string }[]): Promise<void>
  getDistinctFaculty(studentId: string): Promise<string[]>
}
```

### Controllers (`lib/controllers/`)

| Controller | Key Functions |
|------------|---------------|
| `evaluation-periods.ts` | `listPeriods`, `createPeriod`, `updatePeriod`, `deletePeriod`, `activatePeriod` |
| `rubrics.ts` | `getRubric`, `saveRubric`, `copyRubric`, `addItem`, `updateItem`, `deleteItem`, `addCategory`, `deleteCategory` |
| `evaluations.ts` | `getPendingEvaluations` (derives from sections → faculty), `createDraft`, `saveRatings`, `submitEvaluation`, `addComment` |
| `evaluation-results.ts` | `computeResults`, `getResults`, `getResultDetail` |
| `sentiment-analysis.ts` | `analyzeComment` (calls external AI API), `batchAnalyze` |

> Note: There is no `etl-evaluation.ts` controller — the ETL import routes (`/api/import/evaluation-faculty`, `/api/import/evaluation-student`) call the `etlEvaluation.ts` service directly.

### ETL Implementation

The evaluation ETL uses direct import endpoints (no validate/confirm separation):

- **`/api/import/evaluation-faculty`** — accepts CSV file (`multipart/form-data`), parses via `parseFacultySubjectCsv()`, imports via `importFacultySubjects()` in `lib/services/etlEvaluation.ts`
- **`/api/import/evaluation-student`** — accepts CSV file (`multipart/form-data`), parses via `parseStudentEnrollmentCsv()`, imports via `importStudentEnrollments()` in `lib/services/etlEvaluation.ts`

Both endpoints perform immediate import (no separate preview-then-confirm flow for evaluation data).

Upload types defined in `lib/constants.ts`:
```typescript
export type EtlUploadType = "student" | "faculty" | "evaluation-faculty" | "evaluation-student"
```

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

### `/admin/users` — User Management (CRUD only)

**Current**: `/admin/users` (table/manage) handles individual user CRUD only. The bulk import component was decommissioned — no CSV import for creating users.

**Page Layout**:

```
┌─────────────────────────────────────────────────────────────┐
│  Manage Users                                   [+ Create] │
│  Search, filter, paginate users table                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  User table with edit/create modals, role mgmt       │   │
│  │  No bulk CSV import                                  │   │
│  │  Users created one-by-one via Create User modal      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Key**: User creation is manual (individual CRUD). Evaluation ETL data (faculty-subject, student-enrollment) is handled exclusively at `/admin/etl-hub`.

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
| `/admin/users` | ✅ Done | Individual CRUD only — bulk import decommissioned; users created via Create User modal |
| `/admin/etl-hub` | ✅ Done | Evaluation-specific ETL (Faculty-Subject, Student Enrollments) |
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

### Bulk Import in `/admin/users`

The `/admin/users` page has a collapsible **Bulk Import** section above the user table. The flow:

1. **Select type**: Faculty/Staff (3-column CSV) or Students
2. **Preview**: Upload CSV → `/api/import/preview` parses it and checks each email against the `users` table
3. **Edit**: Preview table shows all rows with inline-editable fields (name, email, section, code, title). Existing users are flagged with an orange **EXISTS** badge; new rows show **NEW**
4. **Confirm**: Sends the edited rows as JSON to the import endpoint

#### Faculty CSV Format

```
name, microsoft email, section, code, title
Jane Faculty, jane.faculty@lyceumalabang.edu.ph, BSIT-32A1, ELEC-323, Elective 3 - Fullstack Development
Mike Dean, mike.dean@lyceumalabang.edu.ph, BSCS-41B2, CCS-412, Capstone Project 2
```

#### Student CSV Format (unchanged)

```
name, microsoft email, course
Alice Student, alice.student@lyceumalabang.edu.ph, BSIT
```

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
| 15 | Edit `app/admin/users/page.tsx` — add collapsible Bulk Import section with card selector, CSV preview with inline editing, confirm flow, localhost-only Reset Data button | 1 existing file | **Moderate** — must preserve existing CRUD functionality; bulk import is additive above the table |
| 16 | Edit `app/api/import/users/route.ts` + `students/route.ts` — add JSON body support for preview confirm flow | 2 existing files | Low — additive branching on content-type |

**Decision**: Use existing `app/api/import/evaluation-faculty` and `app/api/import/evaluation-student` endpoints directly (they're already built). The `/admin/etl-hub` page serves as the import UI.

**Blast radius**: The `/admin/users` page must preserve its existing user CRUD table, modals, search, filter, and pagination. The bulk import section is a collapsible area added above the table — visible only when expanded.

### Additional: CSV Format Change + Seed Cleanup

| # | Prompt | What It Touches | Existing Risk |
|---|--------|----------------|---------------|
| — | Update `csvParser.ts`: full template headers `name, microsoft email, section, code, title` (was `name, microsoft email, subject`); add `section`, `code`, `title` to `CsvRow` interface | 1 existing file | Low — clean interface change |
| — | Update `userImport.ts`: remove `parseSubject()`, use `row.code` directly | 1 existing file | Low — simpler logic |
| — | Reduce seed users in `supabase-schema.sql` to Admin, Regie Ellana, Nin Alamo only; delete `prisma/seed-supabase.ts` | 1 existing file + 1 deleted | Low — seed data only |
| — | Create `POST /api/import/preview` — CSV parsing + email existence check | 1 new file | None |
| — | Create `POST /api/admin/reset-data` — clears non-seed data via supabase client | 1 new file | Low — requires ADMIN role |
| — | Create `scripts/reset-data.sql` — SQL reference for the reset | 1 new file | None |

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
