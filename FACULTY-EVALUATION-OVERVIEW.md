# Faculty Evaluation Module — Architecture Overview

## Classification Matrix

| Label | Meaning |
|-------|---------|
| **Existing** | Already exists, reused without changes |
| **Enhance** | Existing component requiring modification |
| **Shared** | New component usable by both e-Consultation and Faculty Evaluation |
| **New** | Developed specifically for Faculty Evaluation |

---

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

---

## Module Directory Structure

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

---

## Data Model — Subject-Based Assignment

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

### `users` table enhancements

```sql
ALTER TABLE users ADD COLUMN "employeeNo" TEXT;
ALTER TABLE users ADD COLUMN "evaluationEligible" BOOLEAN NOT NULL DEFAULT FALSE;
```

`evaluationEligible` is set to `TRUE` when a student is uploaded via the evaluation Student ETL.

---

## ETL Strategy (Unified at `/admin/etl-upload`)

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

---

## Permission Model

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

---

## Navigation Items (Sidebar.tsx)

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

---

## Key Architecture Decisions

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

---

## Workflow Summary

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
