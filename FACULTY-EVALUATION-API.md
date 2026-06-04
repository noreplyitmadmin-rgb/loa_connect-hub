# Faculty Evaluation — API Design

## Conventions

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

---

## Existing APIs Requiring Enhancement

| API | Enhancement | Reason |
|-----|-------------|--------|
| `GET /api/admin/users` | Include `employeeNo` in response | Spreadsheet output |
| `POST /api/admin/users` | Accept `employeeNo` in request body | User creation |
| `PATCH /api/admin/users/[id]` | Accept `employeeNo` | User editing |
| `POST /api/admin/etl-upload/validate` | Handle `evaluation-faculty` and `evaluation-student` types | ETL for evaluation data |
| `POST /api/admin/etl-upload/confirm` | Handle `evaluation-faculty` and `evaluation-student` types | ETL for evaluation data |

---

## New API Routes

### Evaluation Periods

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

### Rubrics

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

### ETL Data (Subjects, Faculty-Subjects, Student Enrollments)

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

### Student Evaluations

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

### Evaluation Results

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

### Evaluation Comments & Sentiment

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

### Evaluation Reports

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

---

## New Types (`lib/types/evaluation.ts`)

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

---

## Repository Interface Additions

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

---

## Controllers (`lib/controllers/`)

| Controller | Key Functions |
|------------|---------------|
| `evaluation-periods.ts` | `listPeriods`, `createPeriod`, `updatePeriod`, `deletePeriod`, `activatePeriod` |
| `rubrics.ts` | `getRubric`, `saveRubric`, `copyRubric`, `addItem`, `updateItem`, `deleteItem`, `addCategory`, `deleteCategory` |
| `evaluations.ts` | `getPendingEvaluations` (derives from enrollments), `createDraft`, `saveRatings`, `submitEvaluation`, `addComment` |
| `evaluation-results.ts` | `computeResults`, `getResults`, `getResultDetail` |
| `sentiment-analysis.ts` | `analyzeComment` (calls external AI API), `batchAnalyze` |
| `etl-evaluation.ts` (NEW) | `validateFacultyCsv`, `confirmFacultyCsv`, `validateStudentCsv`, `confirmStudentCsv` |

---

## ETL Enhancement

### New upload types for existing ETL routes

```typescript
// lib/constants.ts additions
export type EtlUploadType = "student" | "faculty" | "evaluation-faculty" | "evaluation-student"
```

### Validate route enhancement (`app/api/admin/etl-upload/validate/route.ts`)

For `evaluation-faculty` type:
- Expected columns: `name, email, department, subject`
- Validates: email domain, user existence (creates if not found), subject format
- Returns preview rows with name, email, department, subject, status

For `evaluation-student` type:
- Expected columns: `name, email, subject`
- Validates: email domain, user existence (creates if not found), subject exists in system
- Skips rows where subject has no faculty assignment (flagged as error)
- Returns preview rows with name, email, subject, inferred faculty, status

### Confirm route enhancement (`app/api/admin/etl-upload/confirm/route.ts`)

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

---

## Sentiment Analysis Integration

```typescript
// lib/services/sentiment.ts
// Calls external AI API (OpenAI / HuggingFace)
// Triggered on comment submission (fire-and-forget, matching existing email/audit patterns)
// Batch reanalysis available via admin action
```

API key stored in `.env`. Analysis runs:
1. **On submission**: single comment analyzed immediately (fire-and-forget)
2. **Batch reanalysis**: admin can trigger for all unprocessed comments
