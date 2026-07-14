import type { UserData } from "@/lib/types"

export interface QueryError {
  code?: string
  message?: string
}

export interface SingleBuilder {
  single(): Promise<{ data: unknown; error: QueryError | null }>
}

export type DbRecord = Record<string, unknown>

export const USER_SELECT = `id, name, email, "departmentId", course, "employeeNo", "semesterId", "isDisabled", "hasLoggedInBefore", "lastLoginAt", "tokenVersion", "onboardingVersion", "createdAt", "deletedAt", userrole(roleName)`
export const USER_SELECT_WITH_PASSWORD = `id, name, email, "passwordHash", "departmentId", course, "employeeNo", "semesterId", "isDisabled", "hasLoggedInBefore", "lastLoginAt", "tokenVersion", "onboardingVersion", "createdAt", "deletedAt", userrole(roleName)`
export const USER_COLUMNS_NO_PASSWORD = `id, name, email, "departmentId", course, "employeeNo", "semesterId", "isDisabled", "hasLoggedInBefore", "lastLoginAt", "tokenVersion", "onboardingVersion", "createdAt", "deletedAt"`
export const USER_BRIEF = "id, name, email"

export function toUserWithRole(item: Record<string, unknown>): UserData {
  const roleArr = (item.userrole as Array<{ roleName: string }>) || []
  const roles = roleArr.map((r) => r.roleName)
  const role = roles.length > 0 ? roles.join("|") : "GUEST"
  return { ...item, role } as unknown as UserData
}

export function toUsersWithRoles(items: DbRecord[]): UserData[] {
  return (items || []).map(toUserWithRole)
}

export async function singleQuery<T>(builder: SingleBuilder): Promise<T | null> {
  const { data, error } = await builder.single()
  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }
  return data as T
}

export async function singleQueryWithRoles(builder: SingleBuilder): Promise<UserData | null> {
  const { data, error } = await builder.single()
  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }
  return toUserWithRole(data as DbRecord)
}

export function isMissingUserrole(err: QueryError): boolean {
  return !!(err?.message?.includes('relation "userrole" does not exist') || err?.message?.includes('"userrole"'))
}

export const appointmentSelect = `
  *,
  student:users!appointments_studentId_fkey(${USER_BRIEF}),
  faculty:users!appointments_facultyId_fkey(${USER_BRIEF}),
  attendees:appointment_attendees(id, appointmentId, userId, status, isMandatory, user:users(${USER_BRIEF})),
  timeSlots:appointment_time_slots(id, appointmentId, date, startTime, endTime)
`
