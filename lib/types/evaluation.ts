// ── Entity Types ──────────────────────────────────────────

export interface Semester {
  id: string
  title: string
  evalStartDate: string
  evalEndDate: string | null
  isActive: boolean
  createdAt: Date
}

export interface EvaluationPeriod {
  id: string
  semesterId: string
  name: string
  source: string | null
  startDate: string | null
  endDate: string | null
  isActive: boolean
  createdAt: Date
}

export interface Subject {
  id: string
  code: string
  name: string
}

export interface Section {
  id: string
  name: string
  program: string
  departmentCourseId: string
  isDisabled?: boolean
}

export interface FacultySubject {
  id: string
  facultyId: string
  subjectId: string
  sectionId: string
  semesterId: string | null
}

export interface StudentEnrollment {
  id: string
  studentId: string
  sectionId: string
  semesterId: string | null
}

export interface RubricCategory {
  id: string
  evaluationPeriodId: string
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
  evaluationPeriodId: string
  evaluatorId: string
  evaluateeId: string
  facultySubjectId: string
  status: "DRAFT" | "SUBMITTED" | "INVALID"
  submittedAt: Date | null
  createdAt: Date
  updatedAt: Date
  source: string | null
  remarks: string | null
  isDisabled?: boolean
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

export interface EvaluationCommentWithEvaluation extends EvaluationComment {
  evaluation: EvaluationData
}

export interface EvaluationResult {
  id: string
  evaluationPeriodId: string
  facultyId: string
  subjectId: string
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

export interface SemesterData {
  id: string
  title: string
  evalStartDate: string
  evalEndDate: string | null
  isActive: boolean
  createdAt: Date
}

export interface CreateSemesterInput {
  title: string
  evalStartDate?: string | null
  evalEndDate?: string | null
}

export interface EvaluationPeriodData {
  id: string
  semesterId: string
  name: string
  source: string | null
  startDate: string | null
  endDate: string | null
  isActive: boolean
  createdAt: Date
  semesterTitle?: string
}

export interface CreateEvaluationPeriodInput {
  semesterId: string
  name: string
  source?: string | null
  startDate?: string | null
  endDate?: string | null
}

export interface SubjectData {
  id: string
  code: string
  name: string
}

export interface SectionData {
  id: string
  name: string
  program: string
  departmentCourseId: string
  isDisabled?: boolean
}

export interface FacultySubjectData {
  id: string
  faculty_id: string
  subject_id: string
  section_id: string
  semesterId: string | null
}

export interface StudentEnrollmentData {
  id: string
  student_id: string
  section_id: string
  faculty_subject_id: string | null
  semesterId: string | null
}

export interface RubricCategoryData {
  id: string
  evaluationPeriodId: string
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
  evaluationPeriodId: string
  evaluatorId: string
  evaluateeId: string
  facultySubjectId: string
  status: "DRAFT" | "SUBMITTED" | "INVALID"
  submittedAt: Date | null
  createdAt: Date
  updatedAt: Date
  source: string | null
  remarks: string | null
  isDisabled?: boolean
}

export interface PendingEvaluationItem {
  evaluateeId: string
  facultySubjectId: string
  subjectId: string
}

export interface EvaluationResultData {
  id: string
  evaluationPeriodId: string
  facultyId: string
  subjectId: string
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
  isResultsVisible: boolean
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

export interface ISemesterRepository {
  list(filter?: { isActive?: boolean }): Promise<SemesterData[]>
  findById(id: string): Promise<SemesterData | null>
  findActive(): Promise<SemesterData | null>
  create(input: CreateSemesterInput): Promise<SemesterData>
  update(id: string, data: Partial<SemesterData>): Promise<SemesterData>
  delete(id: string): Promise<void>
  setActive(id: string): Promise<SemesterData>
}

export interface IEvaluationPeriodRepository {
  list(filter?: { semesterId?: string; isActive?: boolean }): Promise<EvaluationPeriodData[]>
  findById(id: string): Promise<EvaluationPeriodData | null>
  findActive(): Promise<EvaluationPeriodData | null>
  findBySemester(semesterId: string): Promise<EvaluationPeriodData[]>
  create(input: CreateEvaluationPeriodInput): Promise<EvaluationPeriodData>
  update(id: string, data: Partial<EvaluationPeriodData>): Promise<EvaluationPeriodData>
  delete(id: string): Promise<void>
  setActive(id: string): Promise<EvaluationPeriodData>
}

export interface ISubjectRepository {
  list(): Promise<SubjectData[]>
  upsertMany(items: { code: string; name: string }[]): Promise<{ data: Map<string, SubjectData>; created: number }>
  findByCode(code: string): Promise<SubjectData | null>
  findById(id: string): Promise<SubjectData | null>
  findByIds(ids: string[]): Promise<SubjectData[]>
  update(id: string, data: Partial<SubjectData>): Promise<SubjectData>
}

export interface ISectionRepository {
  list(): Promise<SectionData[]>
  upsertMany(items: { name: string; program: string; departmentCourseId: string }[]): Promise<{ data: Map<string, SectionData>; created: number }>
  findByNameAndProgram(name: string, program: string): Promise<SectionData | null>
  findById(id: string): Promise<SectionData | null>
  create(data: { name: string; program: string; departmentCourseId: string; isDisabled?: boolean }): Promise<SectionData>
  update(id: string, data: Partial<SectionData>): Promise<SectionData>
}

export interface IFacultySubjectRepository {
  list(filters?: { faculty_id?: string; section_id?: string; semesterId?: string }): Promise<FacultySubjectData[]>
  replaceBySection(section_id: string, items: { faculty_id: string; subject_id: string; semesterId?: string | null }[]): Promise<void>
  findById(id: string): Promise<FacultySubjectData | null>
  create(data: { faculty_id: string; subject_id: string; section_id: string; semesterId?: string | null }): Promise<FacultySubjectData>
  findBySubjectAndSection(subject_id: string, section_id: string): Promise<FacultySubjectData | null>
  findBySubjectSectionAndFaculty(subject_id: string, section_id: string, faculty_id: string): Promise<FacultySubjectData | null>
}

export interface IStudentEnrollmentRepository {
  list(filters?: { student_id?: string; section_id?: string; semesterId?: string }): Promise<StudentEnrollmentData[]>
  replaceBySection(section_id: string, items: { student_id: string; semesterId?: string | null }[]): Promise<void>
  addEnrollments(items: { student_id: string; section_id: string; faculty_subject_id?: string | null; semesterId?: string | null }[]): Promise<void>
  findExisting(student_id: string, faculty_subject_id: string, semesterId?: string | null): Promise<StudentEnrollmentData | null>
  create(data: { student_id: string; faculty_subject_id: string; section_id: string; semesterId?: string | null }): Promise<StudentEnrollmentData>
  findById(id: string): Promise<StudentEnrollmentData | null>
  deleteById(id: string): Promise<void>
  getDistinctFaculty(student_id: string, semesterId?: string): Promise<string[]>
  getFacultySubjectsByStudent(student_id: string, faculty_id: string, semesterId: string): Promise<{ id: string; code: string; title: string }[]>
}

export interface IRubricRepository {
  getCategoriesWithItems(evaluationPeriodId: string): Promise<RubricCategoryData[]>
  replaceRubric(evaluationPeriodId: string, categories: { name: string; displayOrder: number; items: { text: string; displayOrder: number; weight?: number }[] }[]): Promise<RubricCategoryData[]>
  copyFromSource(evaluationPeriodId: string, sourcePeriodId: string): Promise<RubricCategoryData[]>
  deleteCategory(id: string): Promise<void>
  createItem(data: { categoryId: string; text: string; displayOrder: number; weight?: number }): Promise<RubricItemData>
  updateItem(id: string, data: Partial<RubricItemData>): Promise<RubricItemData>
  deleteItem(id: string): Promise<void>
}

export interface IEvaluationRepository {
  findPending(evaluatorId: string, evaluationPeriodId: string): Promise<PendingEvaluationItem[]>
  findByEvaluator(evaluatorId: string, evaluationPeriodId?: string): Promise<EvaluationData[]>
  findById(id: string): Promise<EvaluationData | null>
  findByComposite(evaluationPeriodId: string, evaluatorId: string, facultySubjectId: string): Promise<EvaluationData | null>
  create(evaluationPeriodId: string, evaluatorId: string, evaluateeId: string, facultySubjectId: string, source?: string | null): Promise<EvaluationData>
  setRatings(evaluationId: string, ratings: { itemId: string; rating: number }[]): Promise<void>
  submit(evaluationId: string): Promise<EvaluationData>
  getRatings(evaluationId: string): Promise<{ itemId: string; rating: number }[]>
  addComment(evaluationId: string, comment: string): Promise<EvaluationComment>
  getComment(evaluationId: string): Promise<EvaluationComment | null>
  listCommentsWithFilters(filters?: { evaluationPeriodId?: string | null; sentimentLabel?: string | null }): Promise<EvaluationCommentWithEvaluation[]>
  bulkDisableByPeriod(evaluationPeriodId: string, filter?: { facultyId?: string; facultySubjectId?: string }): Promise<void>
  restoreByIds(ids: string[]): Promise<void>
  listDisabled(): Promise<unknown[]>
  deleteDisabled(ids?: string[]): Promise<void>
  invalidateByFacultySubjectAndEvaluator(facultySubjectId: string, evaluatorId: string, remarks: string): Promise<void>
  invalidateById(id: string, remarks: string): Promise<void>
  invalidateByEvaluatorAndPeriod(evaluatorId: string, facultySubjectId: string, evaluationPeriodId: string, remarks: string): Promise<void>
  listSubmittedWithSentiment(evaluationPeriodId: string): Promise<{ evaluateeId: string; sentimentScore: number | null }[]>
  countSubmittedByFacultyIds(facultyIds: string[]): Promise<number>
  countDistinctSubmittedEvaluateesByFacultyIds(facultyIds: string[]): Promise<{ total: number; distinctEvaluatees: number }>
}

// ── Dean Report Types ──────────────────────────────────────

export interface StudentBreakdownItem {
  professionalManner: number | null
  communicationWithStudent: number | null
  studentEngagement: number | null
  learningMaterials: number | null
  timeManagement: number | null
  experientialLearning: number | null
  respectUniqueness: number | null
  assessmentAndFeedback: number | null
  generalRating: number | null
  comment: string | null
  sentimentLabel: string | null
  sentimentScore: number | null
}

export interface FacultyEvalDetail {
  facultyId: string
  facultyName: string
  totalRespondents: number
  generalRating: number | null
  remarks: string | null
  professionalManner: number | null
  communicationWithStudent: number | null
  studentEngagement: number | null
  learningMaterials: number | null
  timeManagement: number | null
  experientialLearning: number | null
  respectUniqueness: number | null
  assessmentAndFeedback: number | null
  students: StudentBreakdownItem[]
}

export interface IEvaluationResultRepository {
  list(evaluationPeriodId: string, filters?: { departmentId?: string; facultyId?: string }): Promise<EvaluationResultData[]>
  findByFaculty(evaluationPeriodId: string, facultyId: string): Promise<EvaluationResultData | null>
  compute(evaluationPeriodId: string, facultyId?: string): Promise<void>
  computeAll(evaluationPeriodId: string): Promise<void>
  setVisibility(evaluationPeriodId: string, facultyIds: string[], visible: boolean): Promise<void>
  getVisibilityMap(evaluationPeriodId: string): Promise<Map<string, boolean>>
}
