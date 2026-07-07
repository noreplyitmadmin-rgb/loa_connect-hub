import { reportsRepository } from "@/lib/repositories/factory"
import { departmentRepository } from "@/lib/repositories/factory"
import type { AdminConsultationRow } from "@/lib/types"

export async function getAllConsultations(filters?: {
  departmentId?: string
  status?: string
  upcoming?: boolean
  search?: string
}): Promise<AdminConsultationRow[]> {
  return reportsRepository.getAllAppointments(filters)
}

export async function getDepartments() {
  const depts = await departmentRepository.listAll()
  return depts.map((d) => ({ id: d.id, name: d.name }))
}
