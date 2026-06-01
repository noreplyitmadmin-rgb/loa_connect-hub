import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ConsultationsTimeline } from "@/components/ConsultationsTimeline"
import { listFacultyAppointments } from "@/lib/controllers/appointments"
import { userRepository } from "@/lib/repositories/factory"
import { OnboardingWalkthrough } from "@/components/OnboardingWalkthrough"
import { hasRole } from "@/lib/utils/roles"

interface FacultyAppointment {
  id: string
  title: string | null
  date: string
  startTime: string
  endTime: string
  status: string
  teamsLink: string | null
  student?: { name: string; email: string } | null
}

export default async function FacultyDashboard() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as Record<string, unknown>).role as string
  if (!hasRole(role, "FACULTY") && !hasRole(role, "DEAN")) redirect("/login")

  const facultyId = (session.user as Record<string, unknown>).id as string
  const dbUser = await userRepository.findById(facultyId)
  const needsOnboarding = dbUser?.onboardingVersion === 0 && hasRole(role, "FACULTY")
  const appointments = (await listFacultyAppointments(facultyId)) as FacultyAppointment[]

  const upcomingCount = appointments.filter(
    (a: FacultyAppointment) => a.status === "APPROVED" || a.status === "PENDING"
  ).length
  const pendingCount = appointments.filter((a: FacultyAppointment) => a.status === "PENDING").length

  const timelineEvents = appointments.map((a: FacultyAppointment) => ({
    id: a.id,
    title: a.title || `Meeting with ${a.student?.name || "Attendee"}`,
    subtitle: a.student?.email,
    date: a.date || "",
    startTime: a.startTime || "",
    endTime: a.endTime || "",
    status: a.status,
    type: "appointment" as const,
    teamsLink: a.teamsLink,
  }))

  return (
    <>
      {needsOnboarding && (
        <OnboardingWalkthrough role="FACULTY" userId={facultyId} />
      )}
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <div className="card p-5 bg-white flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-900">{upcomingCount}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Upcoming Meetings</p>
          </div>
        </div>
        <div className="card p-5 bg-white flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-900">{pendingCount}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Pending Requests</p>
          </div>
        </div>
      </div>

      {/* Quick Create CTA — stacks on mobile */}
      <div className="card p-5 sm:p-6 bg-white flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-0 sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">Need to schedule a meeting?</p>
          <p className="text-xs text-slate-500 mt-0.5">Create a meeting with your colleagues.</p>
        </div>
        <Link
          href="/faculty/meetings/new"
          className="inline-flex items-center justify-center gap-1.5 px-5 py-3 sm:py-2 rounded-lg bg-gold-600 text-white text-sm font-semibold hover:bg-gold-700 transition-colors shadow-sm w-full sm:w-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create a Meeting
        </Link>
      </div>

      {/* Calendar Timeline */}
      <section className="space-y-4">
        <ConsultationsTimeline events={timelineEvents} variant="meetings" />
      </section>
    </div>
    </>
  )
}
