import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { listFacultyAppointments } from "@/features/appointments/appointments.service"
import { userRepository, departmentRepository, reportsRepository } from "@/lib/repositories/factory"
import { OnboardingWalkthrough } from "@/features/users/components/OnboardingWalkthrough"
import { hasRole } from "@/lib/utils/roles"
import FacultyDeanDashboard from "@/features/appointments/components/FacultyDeanDashboard"

export default async function DeanDashboard() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!hasRole((session.user as Record<string, unknown>).role as string, "DEAN")) redirect("/login")

  const deanId = (session.user as Record<string, unknown>).id as string
  const dbUser = await userRepository.findById(deanId)
  const needsOnboarding = dbUser?.onboardingVersion === 0
  const department = await departmentRepository.findByDeanId(deanId)

  // Dean's own appointments (personal dashboard sections)
  const { data: appointments } = await listFacultyAppointments(deanId)

  // Department-wide stats for the dean-only section
  let departmentStats: { facultyCount: number; total: number; pending: number; completed: number } | undefined

  if (department) {
    const facultyUsers = await userRepository.listByDepartment(department.id)
    const facultyMembers = facultyUsers.filter(
      (u) => hasRole(u.role, "FACULTY") || hasRole(u.role, "DEAN")
    )
    const workload = await reportsRepository.getWorkloadDistribution(department.id)
    departmentStats = {
      facultyCount: facultyMembers.length,
      total: workload.departmentTotal,
      pending: workload.entries.reduce((s, e) => s + e.pending, 0),
      completed: workload.entries.reduce((s, e) => s + e.completed, 0),
    }
  }

  return (
    <>
      {needsOnboarding && (
        <OnboardingWalkthrough role="DEAN" userId={deanId} />
      )}
      <FacultyDeanDashboard
        userName={dbUser?.name || "Dean"}
        role="DEAN"
        appointments={appointments}
        departmentName={department?.name}
        departmentStats={departmentStats}
      />
    </>
  )
}
