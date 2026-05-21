import {
  userRepository,
  scheduleRepository,
  appointmentRepository,
  availabilityRuleRepository,
  meetingRepository,
} from "./prisma"

export { userRepository, scheduleRepository, appointmentRepository, availabilityRuleRepository, meetingRepository }

export function getProviderName(): string {
  return process.env.DB_PROVIDER || "sqlite"
}
