import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { listStudentAppointments } from "@/features/appointments/appointments.service"
import { userRepository, auditLogRepository } from "@/lib/repositories/factory"
import { getMyEvaluations } from "@/features/evaluations/evaluations.service"
import ConsultationHistory from "@/features/appointments/components/ConsultationHistory"


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

interface AuditEvent {
  id: string
  action: string
  email: string | null
  details: string | null
  createdAt: string
}

export default async function StudentHistoryPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const userId = (session.user as Record<string, unknown>).id as string
  const dbUser = await userRepository.findById(userId)
  const appointments = (await listStudentAppointments(userId)).data as unknown as HistoryAppointment[]

  const evaluations = (await getMyEvaluations(userId)).filter((e) => e.status === "SUBMITTED" && e.submittedAt)

  const enriched: HistoryEvaluation[] = []
  if (evaluations.length > 0) {
    const facultyIds = [...new Set(evaluations.map((e) => e.evaluateeId))]
    const users = await userRepository.listByIds(facultyIds)
    const nameMap = new Map(users.map((u) => [u.id, u.name]))
    for (const ev of evaluations) {
      enriched.push({
        id: ev.id,
        facultyName: nameMap.get(ev.evaluateeId) || ev.evaluateeId,
        submittedAt: typeof ev.submittedAt === "string" ? ev.submittedAt : (ev.submittedAt as Date)?.toISOString() || "",
      })
    }
  }

  const auditEvents: AuditEvent[] = dbUser?.email
    ? (await auditLogRepository.findByEmailAndActions(dbUser.email, ["EMAIL_FAILED"], 50)).map((e) => ({
        id: e.id,
        action: e.action,
        email: e.email,
        details: e.details,
        createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt),
      }))
    : []

  return (
    <ConsultationHistory
      studentName={dbUser?.name || "Student"}
      course={dbUser?.course || null}
      appointments={appointments}
      evaluations={enriched}
      auditEvents={auditEvents || []}
    />
  )
}
