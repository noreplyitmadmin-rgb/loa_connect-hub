import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { listStudentAppointments } from "@/features/appointments/appointments.service"
import { userRepository } from "@/lib/repositories/factory"
import { getMyEvaluations } from "@/features/evaluations/evaluations.service"
import { supabase } from "@/lib/db"
import ConsultationHistory from "@/components/ConsultationHistory"
import { hasRole } from "@/lib/utils/roles"

interface HistoryAppointment {
  id: string
  title: string | null
  description: string | null
  actionTaken: string | null
  date: string
  startTime: string
  endTime: string
  status: string
  faculty?: { name: string; email: string } | null
}

interface HistoryEvaluation {
  id: string
  facultyName: string
  submittedAt: string
}

export default async function StudentHistoryPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!hasRole((session.user as Record<string, unknown>).role as string, "STUDENT")) redirect("/login")

  const userId = (session.user as Record<string, unknown>).id as string
  const dbUser = await userRepository.findById(userId)
  const appointments = (await listStudentAppointments(userId)) as unknown as HistoryAppointment[]

  const evaluations = (await getMyEvaluations(userId)).filter((e) => e.status === "SUBMITTED" && e.submittedAt)

  const enriched: HistoryEvaluation[] = []
  if (evaluations.length > 0) {
    const facultyIds = [...new Set(evaluations.map((e) => e.evaluateeId))]
    const { data: users } = await supabase.from("users").select("id, name").in("id", facultyIds)
    const nameMap = new Map((users || []).map((u) => [u.id, u.name]))
    for (const ev of evaluations) {
      enriched.push({
        id: ev.id,
        facultyName: nameMap.get(ev.evaluateeId) || ev.evaluateeId,
        submittedAt: (ev.submittedAt as Date).toISOString(),
      })
    }
  }

  return (
    <ConsultationHistory
      studentName={dbUser?.name || "Student"}
      course={dbUser?.course || null}
      appointments={appointments}
      evaluations={enriched}
    />
  )
}
