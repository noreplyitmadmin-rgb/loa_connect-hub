import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import StudentBooking from "@/components/StudentBooking"
import { userRepository, departmentRepository } from "@/lib/repositories/factory"

export default async function MobileFacultyNewMeetingPage() {
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

  const facultyList = allFaculty.map((f) => ({
    id: f.id,
    name: f.name,
    email: f.email,
    hasLoggedInBefore: f.hasLoggedInBefore,
    department: f.departmentId ? deptMap.get(f.departmentId) || null : null,
  }))

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Schedule a Meeting</h1>
          <p className="text-sm text-slate-500 mt-1">Schedule a meeting with a student.</p>
        </div>
        <Link
          href="/faculty/m/meetings"
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors shrink-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>
      </div>
      <StudentBooking
        facultyList={facultyList}
        userRole={role as "STUDENT" | "FACULTY" | "DEAN"}
        students={students}
        serverNow={new Date().toISOString()}
        currentUserId={currentUserId}
      />
      <div className="text-center pt-2">
        <Link
          href="/faculty/meetings/new?desktop=1"
          className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
        >
          Desktop version
        </Link>
      </div>
    </div>
  )
}
