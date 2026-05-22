import { auditLogRepository } from "@/lib/repositories/factory"

export async function logAuditEvent(params: {
  userId?: string | null
  email?: string | null
  action: string
  details?: string | null
}) {
  try {
    await auditLogRepository.create(params)
  } catch (error) {
    console.error("Audit log error:", error)
  }
}
