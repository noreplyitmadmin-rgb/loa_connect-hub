import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import StudentBooking from "@/features/appointments/components/StudentBooking"
import { userRepository, availabilityRuleRepository, departmentRepository } from "@/lib/repositories/factory"
import { hasRole } from "@/lib/utils/roles"
import type { AvailabilityRuleData } from "@/lib/types"

interface FacultyWithRules {
  id: string
  name: string
  email: string
  hasLoggedInBefore: boolean
  department: string | null
  rules: AvailabilityRuleData[]
}

export default async function StudentBookPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!hasRole((session.user as Record<string, unknown>).role as string, "STUDENT")) redirect("/login")

  const facultyUsers = await userRepository.listByRole("FACULTY")
const deanUsers = await userRepository.listByRole("DEAN")
  const allFaculty = [...facultyUsers, ...deanUsers].filter((f) => !f.isDisabled && f.email.trim().toLowerCase().includes("lyceumalabang.edu.ph"))
  const departments = await departmentRepository.listAll()
  const deptMap = new Map(departments.map((d) => [d.id, d.name]))

  const facultyWithRules = await Promise.all(
    allFaculty.map(async (f) => {
      const rules = await availabilityRuleRepository.listByFaculty(f.id)
      return { id: f.id, name: f.name, email: f.email, hasLoggedInBefore: f.hasLoggedInBefore, department: f.departmentId ? deptMap.get(f.departmentId) || null : null, rules }
    })
  )

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-primary">Book a Consultation</h1>
        <p className="text-sm text-tertiary mt-1">Select faculty and schedule your consultation time.</p>
      </div>
      <StudentBooking facultyList={facultyWithRules as FacultyWithRules[]} userRole="STUDENT" serverNow={new Date().toISOString()} />
    </div>
  )
}
