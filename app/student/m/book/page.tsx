import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import MobileBookingFlow from "@/components/MobileBookingFlow"
import { userRepository, availabilityRuleRepository, departmentRepository } from "@/lib/repositories/factory"
import { hasRole } from "@/lib/utils/roles"
import type { AvailabilityRuleData } from "@/lib/repositories/interfaces"

interface FacultyWithRules {
  id: string
  name: string
  email: string
  hasLoggedInBefore: boolean
  department: string | null
  rules: AvailabilityRuleData[]
}

export default async function MobileStudentBookPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!hasRole((session.user as Record<string, unknown>).role as string, "STUDENT")) redirect("/login")

  const currentUserId = (session.user as Record<string, unknown>).id as string
  const currentUser = await userRepository.findById(currentUserId)
  const studentDepartmentId = currentUser?.departmentId || null

  const facultyUsers = await userRepository.listByRole("FACULTY")
  const sameDeptFaculty = facultyUsers.filter(
    (f) => !f.isDisabled && f.departmentId === studentDepartmentId
  )
  const departments = await departmentRepository.listAll()
  const deptMap = new Map(departments.map((d) => [d.id, d.name]))

  const facultyWithRules = await Promise.all(
    sameDeptFaculty.map(async (f) => {
      const rules = await availabilityRuleRepository.listByFaculty(f.id)
      return { id: f.id, name: f.name, email: f.email, hasLoggedInBefore: f.hasLoggedInBefore, department: f.departmentId ? deptMap.get(f.departmentId) || null : null, rules }
    })
  )

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Book Consultation</h1>
        <p className="text-sm text-slate-500 mt-1">Pick a faculty member and available time.</p>
      </div>
      <MobileBookingFlow facultyWithRules={facultyWithRules as FacultyWithRules[]} userRole="STUDENT" serverNow={new Date().toISOString()} />
    </div>
  )
}
