import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { listFacultyAppointments } from "@/features/appointments/appointments.service"
import { userRepository } from "@/lib/repositories/factory"
import { OnboardingWalkthrough } from "@/features/users/components/OnboardingWalkthrough"
import { hasRole } from "@/lib/utils/roles"
import FacultyDeanDashboard from "@/features/appointments/components/FacultyDeanDashboard"

export default async function FacultyDashboard() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as Record<string, unknown>).role as string
  if (!hasRole(role, "FACULTY") && !hasRole(role, "DEAN")) redirect("/login")

  const facultyId = (session.user as Record<string, unknown>).id as string
  const dbUser = await userRepository.findById(facultyId)
  const needsOnboarding = dbUser?.onboardingVersion === 0 && hasRole(role, "FACULTY")
  const { data: appointments } = await listFacultyAppointments(facultyId)

  return (
    <>
      {needsOnboarding && (
        <OnboardingWalkthrough role="FACULTY" userId={facultyId} />
      )}
      <FacultyDeanDashboard
        userName={dbUser?.name || "Faculty"}
        role={hasRole(role, "DEAN") ? "DEAN" : "FACULTY"}
        appointments={appointments}
      />
    </>
  )
}
