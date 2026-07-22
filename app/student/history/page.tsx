import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { listStudentAppointments } from "@/features/appointments/appointments.service"
import { auditLogRepository } from "@/lib/repositories/factory"
import { getMyEvaluationsBrief } from "@/features/evaluations/evaluations.service"
import ConsultationHistory from "@/features/appointments/components/ConsultationHistory"
import { supabase } from "@/lib/db"


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

  // Wave 1: independent queries in parallel
  const [dbUser, appointmentsResult, evaluations] = await Promise.all([
    supabase.from("users").select("id, name, email, course").eq("id", userId).single(),
    listStudentAppointments(userId),
    getMyEvaluationsBrief(userId),
  ])

  const appointments = appointmentsResult.data as unknown as HistoryAppointment[]
  const filteredEvals = evaluations.filter((e) => e.status === "SUBMITTED" && e.submittedAt)

  // Wave 2: dependent queries in parallel
  const facultyIds = [...new Set(filteredEvals.map((e) => e.evaluateeId))]

  const [facultyUsers, auditRaw] = await Promise.all([
    facultyIds.length > 0
      ? supabase.from("users").select("id, name").in("id", facultyIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    dbUser?.data?.email
      ? auditLogRepository.findByEmailAndActions(dbUser.data.email, ["EMAIL_FAILED"], 50)
      : Promise.resolve([]),
  ])

  const nameMap = new Map((facultyUsers.data || []).map((u) => [u.id, u.name]))
  const enriched: HistoryEvaluation[] = filteredEvals.map((ev) => ({
    id: ev.id,
    facultyName: nameMap.get(ev.evaluateeId) || ev.evaluateeId,
    submittedAt: typeof ev.submittedAt === "string" ? ev.submittedAt : (ev.submittedAt as Date)?.toISOString() || "",
  }))

  const auditEvents: AuditEvent[] = auditRaw.map((e) => ({
    id: e.id,
    action: e.action,
    email: e.email,
    details: e.details,
    createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt),
  }))

  return (
    <ConsultationHistory
      studentName={dbUser?.data?.name || "Student"}
      course={dbUser?.data?.course || null}
      appointments={appointments}
      evaluations={enriched}
      auditEvents={auditEvents}
    />
  )
}
