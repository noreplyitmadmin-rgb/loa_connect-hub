import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { listStudentAppointments } from "@/features/appointments/appointments.service"
import { userRepository } from "@/lib/repositories/factory"
import { OnboardingWalkthrough } from "@/features/users/components/OnboardingWalkthrough"
import StudentDashboard from "@/features/users/components/StudentDashboard"
import { hasRole } from "@/lib/utils/roles"

interface StudentAppointment {
  id: string
  title: string | null
  date: string
  startTime: string
  endTime: string
  status: string
  teamsLink: string | null
  faculty?: { name: string; email: string } | null
}

export default async function StudentDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!hasRole((session.user as Record<string, unknown>).role as string, "STUDENT")) redirect("/login")

  const userId = (session.user as Record<string, unknown>).id as string
  const dbUser = await userRepository.findById(userId)
  const needsOnboarding = dbUser?.onboardingVersion === 0

  const appointments = (await listStudentAppointments(userId)).data as StudentAppointment[]

  return (
    <>
      {needsOnboarding && (
        <OnboardingWalkthrough role="STUDENT" userId={userId} />
      )}
      <StudentDashboard
        studentName={dbUser?.name || "Student"}
        course={dbUser?.course || null}
        appointments={appointments}
      />
    </>
  )
}
