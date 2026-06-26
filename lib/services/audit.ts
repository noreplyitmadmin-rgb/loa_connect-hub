import { logAuditWorkflow } from "@/lib/workflows/audit-workflows"

export async function logAuditEvent(params: {
  userId?: string | null
  email?: string | null
  action: string
  details?: string | null
}) {
  try {
    await logAuditWorkflow(params)
  } catch (error) {
    console.error("Audit log error:", error)
  }
}
