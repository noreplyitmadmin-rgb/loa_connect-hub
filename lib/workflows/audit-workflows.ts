import { auditLogRepository } from "@/lib/repositories/factory"

export async function logAuditWorkflow(params: {
  userId?: string | null
  email?: string | null
  action: string
  details?: string | null
}) {
  "use workflow"

  await auditLogRepository.create(params)
}
