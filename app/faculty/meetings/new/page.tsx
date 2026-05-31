import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import StudentBooking from "@/components/StudentBooking"
import { userRepository, availabilityRuleRepository, departmentRepository } from "@/lib/repositories/factory"
import type { AvailabilityRuleData } from "@/lib/repositories/interfaces"

interface FacultyWithRules {
  id: string
  name: string
  email: string
  hasLoggedInBefore: boolean
  department: string | null
  rules: AvailabilityRuleData[]
}

export default async function FacultyBookPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const role = (session.user as Record<string, unknown>).role as string
  if (!["FACULTY", "DEAN"].includes(role)) redirect("/login")

  const currentUser = session.user as Record<string, unknown>
  const currentUserId = currentUser.id as string

  const facultyUsers = await userRepository.listByRole("FACULTY")
  const deanUsers = await userRepository.listByRole("DEAN")
  const allFaculty = [...facultyUsers, ...deanUsers].filter((f) => !f.isDisabled)
  const departments = await departmentRepository.listAll()
  const deptMap = new Map(departments.map((d) => [d.id, d.name]))

  const studentUsers = await userRepository.listByRole("STUDENT")
  const students = studentUsers.filter((s) => !s.isDisabled).map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    department: s.departmentId ? deptMap.get(s.departmentId) || null : null,
  }))

  const facultyWithRules = await Promise.all(
    allFaculty.map(async (f) => {
      const rules = await availabilityRuleRepository.listByFaculty(f.id)
      return {
        id: f.id,
        name: f.name,
        email: f.email,
        hasLoggedInBefore: f.hasLoggedInBefore,
        department: f.departmentId ? deptMap.get(f.departmentId) || null : null,
        rules,
      }
    })
  )

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Schedule a Meeting</h1>
        <p className="text-sm text-slate-500 mt-1">Schedule a meeting with optional attendees.</p>
      </div>
      <StudentBooking facultyWithRules={facultyWithRules as FacultyWithRules[]} userRole={role as "STUDENT" | "FACULTY" | "DEAN"} students={students} serverNow={new Date().toISOString()} currentUserId={currentUserId} />
    </div>
  )
}
