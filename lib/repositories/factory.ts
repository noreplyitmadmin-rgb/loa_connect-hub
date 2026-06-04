import type {
  IUserRepository,
  IDepartmentRepository,
  IAppointmentRepository,
  IAvailabilityRuleRepository,
  IPasswordResetTokenRepository,
  IAuditLogRepository,
  IReportsRepository,
  IEvaluationPeriodRepository,
  ISubjectRepository,
  IFacultySubjectRepository,
  IStudentEnrollmentRepository,
  IRubricRepository,
  IEvaluationRepository,
  IEvaluationResultRepository,
} from "@/lib/types"

import { userRepository as supabaseUserRepo } from "./supabase/user"
import { departmentRepository as supabaseDeptRepo } from "./supabase/department"
import { appointmentRepository as supabaseApptRepo } from "./supabase/appointment"
import { availabilityRuleRepository as supabaseAvailRepo } from "./supabase/availability-rule"
import { passwordResetTokenRepository as supabaseTokenRepo } from "./supabase/password-reset-token"
import { auditLogRepository as supabaseAuditLogRepo } from "./supabase/audit-log"
import { reportsRepository as supabaseReportsRepo } from "./supabase/reports"
import { evaluationPeriodRepository as supabaseEvalPeriodRepo } from "./supabase/evaluation-period"
import { subjectRepository as supabaseSubjectRepo } from "./supabase/subject"
import { facultySubjectRepository as supabaseFacultySubjectRepo } from "./supabase/faculty-subject"
import { studentEnrollmentRepository as supabaseStudentEnrollmentRepo } from "./supabase/student-enrollment"
import { rubricRepository as supabaseRubricRepo } from "./supabase/rubric"
import { evaluationRepository as supabaseEvalRepo } from "./supabase/evaluation"
import { evaluationResultRepository as supabaseEvalResultRepo } from "./supabase/evaluation-result"

export const userRepository: IUserRepository = supabaseUserRepo
export const departmentRepository: IDepartmentRepository = supabaseDeptRepo
export const appointmentRepository: IAppointmentRepository = supabaseApptRepo
export const availabilityRuleRepository: IAvailabilityRuleRepository = supabaseAvailRepo
export const passwordResetTokenRepository: IPasswordResetTokenRepository = supabaseTokenRepo
export const auditLogRepository: IAuditLogRepository = supabaseAuditLogRepo
export const reportsRepository: IReportsRepository = supabaseReportsRepo
export const evaluationPeriodRepository: IEvaluationPeriodRepository = supabaseEvalPeriodRepo
export const subjectRepository: ISubjectRepository = supabaseSubjectRepo
export const facultySubjectRepository: IFacultySubjectRepository = supabaseFacultySubjectRepo
export const studentEnrollmentRepository: IStudentEnrollmentRepository = supabaseStudentEnrollmentRepo
export const rubricRepository: IRubricRepository = supabaseRubricRepo
export const evaluationRepository: IEvaluationRepository = supabaseEvalRepo
export const evaluationResultRepository: IEvaluationResultRepository = supabaseEvalResultRepo
