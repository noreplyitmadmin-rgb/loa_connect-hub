import { departmentRepository } from "@/lib/repositories/factory"
import { hasRole } from "./roles"
import type { Session } from "next-auth"

export function getDefaultDateRange() {
  const now = new Date()
  const end = now.toISOString().slice(0, 10)
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const start = first.toISOString().slice(0, 10)
  return { defaultStartDate: start, defaultEndDate: end }
}

export interface DepartmentOption {
  id: string
  name: string
}

export async function resolveReportDepartment(
  session: Session | null,
  departmentIdFromParams: string | null
): Promise<{ departmentId: string | null; departments: DepartmentOption[]; isDean: boolean }> {
  const departments = await departmentRepository.listAll()
  const deptOptions: DepartmentOption[] = departments.map((d) => ({ id: d.id, name: d.name }))

  const role = (session?.user as Record<string, unknown>)?.role as string || ""
  const isDean = hasRole(role, "DEAN")

  if (isDean) {
    const userId = (session?.user as Record<string, unknown>)?.id as string
    const dept = await departmentRepository.findByDeanId(userId)
    return { departmentId: dept?.id || null, departments: deptOptions, isDean: true }
  }

  return { departmentId: departmentIdFromParams, departments: deptOptions, isDean: false }
}
