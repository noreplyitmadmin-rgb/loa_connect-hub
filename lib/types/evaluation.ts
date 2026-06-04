// ── Entity Types ──────────────────────────────────────────

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

export interface Subject {
  id: string
  name: string
  periodId: string
}

export interface FacultySubject {
  id: string
  facultyId: string
  subjectId: string
  periodId: string
}

export interface StudentEnrollment {
  id: string
  studentId: string
  subjectId: string
  periodId: string
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
  periodId: string
  evaluatorId: string
  evaluateeId: string
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

// ── Data Types (for repositories) ─────────────────────────

export interface EvaluationPeriodData {
  id: string
  name: string
  semester: string
  schoolYear: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: Date
}

export interface CreateEvaluationPeriodInput {
  name: string
  semester: string
  schoolYear: string
  startDate: string
  endDate: string
}

export interface SubjectData {
  id: string
  name: string
  periodId: string | null
}

export interface FacultySubjectData {
  id: string
  facultyId: string
  subjectId: string
  periodId: string | null
}

export interface StudentEnrollmentData {
  id: string
  studentId: string
  subjectId: string
  periodId: string | null
}

export interface RubricCategoryData {
  id: string
  periodId: string
  name: string
  displayOrder: number
}

export interface RubricItemData {
  id: string
  categoryId: string
  text: string
  displayOrder: number
  weight: number
}

export interface EvaluationData {
  id: string
  periodId: string
  evaluatorId: string
  evaluateeId: string
  status: "DRAFT" | "SUBMITTED"
  submittedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface EvaluationResultData {
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

// ── DTO Types ─────────────────────────────────────────────

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
  distribution: {
    label: string
    count: number
    percentage: number
  }[]
  averageScore: number | null
}

export interface EnrollmentStats {
  facultyCount: number
  subjectCount: number
  studentCount: number
  enrollmentCount: number
}

// ── Repository Interfaces ─────────────────────────────────

export interface IEvaluationPeriodRepository {
  list(filter?: { isActive?: boolean; schoolYear?: string }): Promise<EvaluationPeriodData[]>
  findById(id: string): Promise<EvaluationPeriodData | null>
  findActive(): Promise<EvaluationPeriodData | null>
  create(input: CreateEvaluationPeriodInput): Promise<EvaluationPeriodData>
  update(id: string, data: Partial<EvaluationPeriodData>): Promise<EvaluationPeriodData>
  delete(id: string): Promise<void>
  setActive(id: string): Promise<EvaluationPeriodData>
}

export interface ISubjectRepository {
  list(periodId: string | null): Promise<SubjectData[]>
  upsertMany(periodId: string | null, names: string[]): Promise<Map<string, SubjectData>>
  deleteByPeriod(periodId: string | null): Promise<void>
}

export interface IFacultySubjectRepository {
  list(periodId: string | null, facultyId?: string): Promise<FacultySubjectData[]>
  replaceAll(periodId: string | null, items: { facultyId: string; subjectId: string }[]): Promise<void>
  findBySubject(periodId: string | null, subjectId: string): Promise<FacultySubjectData | null>
}

export interface IStudentEnrollmentRepository {
  list(periodId: string | null, studentId?: string): Promise<StudentEnrollmentData[]>
  replaceAll(periodId: string | null, items: { studentId: string; subjectId: string }[]): Promise<void>
  getDistinctFaculty(studentId: string, periodId: string): Promise<string[]>
}

export interface IRubricRepository {
  getCategoriesWithItems(periodId: string): Promise<RubricCategoryData[]>
  replaceRubric(periodId: string, categories: { name: string; displayOrder: number; items: { text: string; displayOrder: number; weight?: number }[] }[]): Promise<RubricCategoryData[]>
  copyFromSource(periodId: string, sourcePeriodId: string): Promise<RubricCategoryData[]>
  deleteCategory(id: string): Promise<void>
  deleteItem(id: string): Promise<void>
}

export interface IEvaluationRepository {
  findPending(evaluatorId: string, periodId: string): Promise<{ evaluateeId: string }[]>
  findByEvaluator(evaluatorId: string): Promise<EvaluationData[]>
  findById(id: string): Promise<EvaluationData | null>
  findByComposite(periodId: string, evaluatorId: string, evaluateeId: string): Promise<EvaluationData | null>
  create(periodId: string, evaluatorId: string, evaluateeId: string): Promise<EvaluationData>
  setRatings(evaluationId: string, ratings: { itemId: string; rating: number }[]): Promise<void>
  submit(evaluationId: string): Promise<EvaluationData>
  getRatings(evaluationId: string): Promise<{ itemId: string; rating: number }[]>
  addComment(evaluationId: string, comment: string): Promise<EvaluationComment>
}

export interface IEvaluationResultRepository {
  list(periodId: string, filters?: { departmentId?: string; facultyId?: string }): Promise<EvaluationResultData[]>
  findByFaculty(periodId: string, facultyId: string): Promise<EvaluationResultData | null>
  compute(periodId: string, facultyId?: string): Promise<void>
  computeAll(periodId: string): Promise<void>
}
