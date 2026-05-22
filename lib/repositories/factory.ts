import type {
  IUserRepository,
  IDepartmentRepository,
  IAppointmentRepository,
  IAvailabilityRuleRepository,
  IMeetingRepository,
  IPasswordResetTokenRepository,
  IAuditLogRepository,
} from "./interfaces"

import { userRepository as sqliteUserRepo, departmentRepository as sqliteDeptRepo, appointmentRepository as sqliteApptRepo, availabilityRuleRepository as sqliteAvailRepo, meetingRepository as sqliteMeetingRepo, passwordResetTokenRepository as sqliteTokenRepo, auditLogRepository as sqliteAuditLogRepo } from "./prisma"
import { userRepository as supabaseUserRepo, departmentRepository as supabaseDeptRepo, appointmentRepository as supabaseApptRepo, availabilityRuleRepository as supabaseAvailRepo, meetingRepository as supabaseMeetingRepo, passwordResetTokenRepository as supabaseTokenRepo, auditLogRepository as supabaseAuditLogRepo } from "./supabase"

const useSupabase = process.env.DB_PROVIDER === "supabase"

export const userRepository: IUserRepository = useSupabase ? supabaseUserRepo : sqliteUserRepo
export const departmentRepository: IDepartmentRepository = useSupabase ? supabaseDeptRepo : sqliteDeptRepo
export const appointmentRepository: IAppointmentRepository = useSupabase ? supabaseApptRepo : sqliteApptRepo
export const availabilityRuleRepository: IAvailabilityRuleRepository = useSupabase ? supabaseAvailRepo : sqliteAvailRepo
export const meetingRepository: IMeetingRepository = useSupabase ? supabaseMeetingRepo : sqliteMeetingRepo
export const passwordResetTokenRepository: IPasswordResetTokenRepository = useSupabase ? supabaseTokenRepo : sqliteTokenRepo
export const auditLogRepository: IAuditLogRepository = supabaseAuditLogRepo

export function getProviderName(): string {
  return process.env.DB_PROVIDER || "sqlite"
}
