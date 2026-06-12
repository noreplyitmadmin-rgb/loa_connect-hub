// ── Entity Types ──────────────────────────────────────────

export interface Semester {
  id: string
  title: string
  evalStartDate: string
  evalEndDate: string | null
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
  semesterId: string
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
  semesterId: string
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
  semesterId: string
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

export interface SubjectData {
  id: string
  code: string
  name: string
}

export interface SectionData {
  id: string
  name: string
  program: string
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
  semesterId: string
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
  semesterId: string
  evaluatorId: string
  evaluateeId: string
  status: "DRAFT" | "SUBMITTED"
  submittedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface EvaluationResultData {
  id: string
  semesterId: string
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

export interface ISubjectRepository {
  list(): Promise<SubjectData[]>
  upsertMany(items: { code: string; name: string }[]): Promise<{ data: Map<string, SubjectData>; created: number }>
  findByCode(code: string): Promise<SubjectData | null>
}

export interface ISectionRepository {
  list(): Promise<SectionData[]>
  upsertMany(items: { name: string; program: string }[]): Promise<{ data: Map<string, SectionData>; created: number }>
  findByNameAndProgram(name: string, program: string): Promise<SectionData | null>
}

export interface IFacultySubjectRepository {
  list(filters?: { faculty_id?: string; section_id?: string; semesterId?: string }): Promise<FacultySubjectData[]>
  replaceBySection(section_id: string, items: { faculty_id: string; subject_id: string; semesterId?: string | null }[]): Promise<void>
  findBySubjectAndSection(subject_id: string, section_id: string): Promise<FacultySubjectData | null>
}

export interface IStudentEnrollmentRepository {
  list(filters?: { student_id?: string; section_id?: string; semesterId?: string }): Promise<StudentEnrollmentData[]>
  replaceBySection(section_id: string, items: { student_id: string; semesterId?: string | null }[]): Promise<void>
  addEnrollments(items: { student_id: string; section_id: string; semesterId?: string | null }[]): Promise<void>
  getDistinctFaculty(student_id: string, semesterId?: string): Promise<string[]>
  getFacultySubjectsByStudent(student_id: string, faculty_id: string, semesterId: string): Promise<{ id: string; code: string; title: string }[]>
}

export interface IRubricRepository {
  getCategoriesWithItems(semesterId: string): Promise<RubricCategoryData[]>
  replaceRubric(semesterId: string, categories: { name: string; displayOrder: number; items: { text: string; displayOrder: number; weight?: number }[] }[]): Promise<RubricCategoryData[]>
  copyFromSource(semesterId: string, sourceSemesterId: string): Promise<RubricCategoryData[]>
  deleteCategory(id: string): Promise<void>
  deleteItem(id: string): Promise<void>
}

export interface IEvaluationRepository {
  findPending(evaluatorId: string, semesterId: string): Promise<{ evaluateeId: string }[]>
  findByEvaluator(evaluatorId: string): Promise<EvaluationData[]>
  findById(id: string): Promise<EvaluationData | null>
  findByComposite(semesterId: string, evaluatorId: string, evaluateeId: string): Promise<EvaluationData | null>
  create(semesterId: string, evaluatorId: string, evaluateeId: string): Promise<EvaluationData>
  setRatings(evaluationId: string, ratings: { itemId: string; rating: number }[]): Promise<void>
  submit(evaluationId: string): Promise<EvaluationData>
  getRatings(evaluationId: string): Promise<{ itemId: string; rating: number }[]>
  addComment(evaluationId: string, comment: string): Promise<EvaluationComment>
  getComment(evaluationId: string): Promise<EvaluationComment | null>
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
  list(semesterId: string, filters?: { departmentId?: string; facultyId?: string }): Promise<EvaluationResultData[]>
  findByFaculty(semesterId: string, facultyId: string): Promise<EvaluationResultData | null>
  compute(semesterId: string, facultyId?: string): Promise<void>
  computeAll(semesterId: string): Promise<void>
  setVisibility(semesterId: string, facultyIds: string[], visible: boolean): Promise<void>
  getVisibilityMap(semesterId: string): Promise<Map<string, boolean>>
}
