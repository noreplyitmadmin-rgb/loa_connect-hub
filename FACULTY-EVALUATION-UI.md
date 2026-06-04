# Faculty Evaluation — UI Design

## Design Principles

- Every new page follows existing **page structure**: server component with async data fetching
- Interactive components use `"use client"` with **SWR** data fetching
- All styling uses existing **Tailwind CSS v4** custom properties (`bg-surface`, `card`, `btn-*`, etc.)
- Mobile views follow the existing `m/` subdirectory pattern
- Loading states use the existing `Skeleton` component
- Empty states use the existing `EmptyState` component
- iOS design patterns (grouped tables, frosted glass, tab bar) are maintained

---

## Existing Components Reused Without Changes

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

---

## New Shared Components

### `RatingScale`
- **Location**: `components/RatingScale.tsx`
- **Props**: `value: number`, `onChange: (val: number) => void`, `disabled?: boolean`
- **Used by**: Student evaluation form

### `CategoryProgressBar`
- **Location**: `components/CategoryProgressBar.tsx`
- **Props**: `label: string`, `value: number`, `max: number` (default 5)
- **Used by**: Faculty result detail, Dean department view

### `FacultyResultCard`
- **Location**: `components/FacultyResultCard.tsx`
- **Props**: `faculty`, `result: EvaluationResult`, `onClick?`
- **Used by**: Faculty list views

### `SentimentBadge`
- **Location**: `components/SentimentBadge.tsx`
- **Props**: `label: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED"`
- **Used by**: Comment lists, sentiment dashboard

### `EvaluationFilters`
- **Location**: `components/EvaluationFilters.tsx`
- **Props**: `periods`, `departments?`, `faculties?`, `onFilter`
- **Used by**: Results pages, report pages

### `EvaluationForm`
- **Location**: `components/EvaluationForm.tsx`
- **Props**: `rubric: RubricCategory[]`, `facultyName`, `periodName`, `onSubmit`
- **Used by**: Student evaluation page

---

## Existing ETL Enhancement (`/admin/etl-upload`)

Two new tabs are added alongside the existing Student and Faculty/Dean uploads:

```
┌─────────────────────────────────────────────────────┐
│ [Student] [Faculty/Dean] [Eval Faculty] [Eval Student] │ ← tab bar
└─────────────────────────────────────────────────────┘
```

### Evaluation Faculty Tab

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

### Evaluation Student Tab

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

---

## STUDENT PAGES

### `/student/evaluations` — Pending Evaluations List

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

### `/student/evaluations/[periodId]` — Evaluation Form

Full scrolling form with 8 category sections, each containing:
- Category header (e.g., "I. PROFESSIONAL MANNER")
- Individual items with 5-star `RatingScale` per item
- All 34 items must be rated before submit
- Optional comments textarea at the bottom
- Submit button → confirmation Alert

### `/student/evaluations/history` — Past Submissions

iOS grouped table showing past evaluations with faculty name, rating, submission date.

---

## FACULTY PAGES

### `/faculty/evaluations` — My Evaluation Results Dashboard

Dashboard cards: latest evaluation period, general rating, category breakdown, respondent count. Links to per-period detail.

### `/faculty/evaluations/[periodId]` — Period Detail

Hero number (general rating), `CategoryProgressBar` for each of 8 categories, comment section with `SentimentBadge` indicators.

---

## DEAN PAGES

### `/dean/evaluations` — Department Evaluation Dashboard

Active period info, submission rate, department average, faculty summary table (clickable → detail).

### `/dean/evaluations/results` — Department Results Table

Full results table matching spreadsheet format: NO, NAME, 8 categories, general rating, remarks, respondents.

### `/dean/evaluations/reports` — Department Reports

Department summary, export to CSV/PDF.

---

## ADMIN PAGES

### `/admin/evaluations` — Dashboard

Active period stats, quick links grid, department comparison table.

### `/admin/evaluations/periods` — Period Management

iOS grouped table with create/edit modals, activate/deactivate.

### `/admin/evaluations/rubrics` — Rubric Editor

Period selector, expandable category accordion with inline editing, add/remove items and categories, copy from previous period, preview form.

### `/admin/evaluations/upload` — Upload Status

Shows what data has been uploaded for the current period (faculty count, subject count, enrollment count). Links to re-upload via the ETL page.

### `/admin/evaluations/results` — Full Results Table

Full-width table matching spreadsheet exactly. Employee No, Name, Department, 8 category columns, General Rating, Remarks, Respondents. Filterable by period/department/faculty. Sortable columns. Export CSV/PDF. Click row → faculty detail.

### `/admin/evaluations/reports` — Reports Landing

Card grid: Institutional Summary, Department Comparison, Period-over-Period Trend, Sentiment Analysis.

### `/admin/evaluations/reports/sentiment` — Sentiment Dashboard

Overall distribution (donut chart), by department (bar chart), top positive/negative comments.

---

## Mobile Views

```
app/student/evaluations/m/     → pending list + evaluation form (mobile-optimized)
app/dean/evaluations/m/        → dean dashboard
app/admin/evaluations/m/       → admin dashboard, results, sentiment
```

Mobile views share the same data layer, using iOS-native patterns: full-width grouped tables, larger touch targets, bottom action sheets.
