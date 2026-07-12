import type {
  IUserRepository,
  IDepartmentRepository,
  IDepartmentCourseRepository,
  IAppointmentRepository,
  IAvailabilityRuleRepository,
  IPasswordResetTokenRepository,
  IAuditLogRepository,
  IReportsRepository,
  ISemesterRepository,
  IEvaluationPeriodRepository,
  ISubjectRepository,
  ISectionRepository,
  IFacultySubjectRepository,
  IStudentEnrollmentRepository,
  IRubricRepository,
  IEvaluationRepository,
  IEvaluationResultRepository,
  IBugReportRepository,
} from "@/lib/types"

import { userRepository as supabaseUserRepo } from "@/features/users/users.repository"
import { departmentRepository as supabaseDeptRepo } from "@/features/admin-data/department.repository"
import { departmentCourseRepository as supabaseDeptCourseRepo } from "@/features/admin-data/department-course.repository"
import { appointmentRepository as supabaseApptRepo } from "@/features/appointments/appointments.repository"
import { availabilityRuleRepository as supabaseAvailRepo } from "@/features/appointments/availability.repository"
import { passwordResetTokenRepository as supabaseTokenRepo } from "@/features/users/password-reset.repository"
import { auditLogRepository as supabaseAuditLogRepo } from "@/features/audit/audit.repository"
import { reportsRepository as supabaseReportsRepo } from "@/features/reports/reports.repository"
import { semesterRepository as supabaseSemesterRepo } from "@/features/admin-data/semester.repository"
import { evaluationPeriodRepository as supabaseEvalPeriodRepo } from "@/features/admin-data/evaluation-period.repository"
import { subjectRepository as supabaseSubjectRepo } from "@/features/admin-data/subject.repository"
import { sectionRepository as supabaseSectionRepo } from "@/features/admin-data/section.repository"
import { facultySubjectRepository as supabaseFacultySubjectRepo } from "@/features/admin-data/faculty-subject.repository"
import { studentEnrollmentRepository as supabaseStudentEnrollmentRepo } from "@/features/admin-data/student-enrollment.repository"
import { rubricRepository as supabaseRubricRepo } from "@/features/rubrics/rubrics.repository"
import { evaluationRepository as supabaseEvalRepo } from "@/features/evaluations/evaluations.repository"
import { evaluationResultRepository as supabaseEvalResultRepo } from "@/features/evaluation-results/evaluation-results.repository"
import { bugReportRepository as supabaseBugReportRepo } from "@/features/bug-reports/bug-report.repository"

export const userRepository: IUserRepository = supabaseUserRepo
export const departmentRepository: IDepartmentRepository = supabaseDeptRepo
export const departmentCourseRepository: IDepartmentCourseRepository = supabaseDeptCourseRepo
export const appointmentRepository: IAppointmentRepository = supabaseApptRepo
export const availabilityRuleRepository: IAvailabilityRuleRepository = supabaseAvailRepo
export const passwordResetTokenRepository: IPasswordResetTokenRepository = supabaseTokenRepo
export const auditLogRepository: IAuditLogRepository = supabaseAuditLogRepo
export const reportsRepository: IReportsRepository = supabaseReportsRepo
export const semesterRepository: ISemesterRepository = supabaseSemesterRepo
export const evaluationPeriodRepository: IEvaluationPeriodRepository = supabaseEvalPeriodRepo
export const subjectRepository: ISubjectRepository = supabaseSubjectRepo
export const sectionRepository: ISectionRepository = supabaseSectionRepo
export const facultySubjectRepository: IFacultySubjectRepository = supabaseFacultySubjectRepo
export const studentEnrollmentRepository: IStudentEnrollmentRepository = supabaseStudentEnrollmentRepo
export const rubricRepository: IRubricRepository = supabaseRubricRepo
export const evaluationRepository: IEvaluationRepository = supabaseEvalRepo
export const evaluationResultRepository: IEvaluationResultRepository = supabaseEvalResultRepo
export const bugReportRepository: IBugReportRepository = supabaseBugReportRepo
