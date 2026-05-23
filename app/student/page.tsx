import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ConsultationsTimeline } from "@/components/ConsultationsTimeline"
import { listStudentAppointments } from "@/lib/controllers/appointments"

export default async function StudentDashboard() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if ((session.user as any).role !== "STUDENT") redirect("/login")

  const appointments = await listStudentAppointments((session.user as any).id)

  const upcomingCount = appointments.filter((a: any) => a.status === "APPROVED" || a.status === "PENDING").length
  const pendingCount = appointments.filter((a: any) => a.status === "PENDING").length

  const timelineEvents = appointments.map((a: any) => ({
    id: a.id,
    title: a.title || `Consultation with ${a.faculty?.name || "Faculty"}`,
    subtitle: a.faculty?.email,
    date: a.date || "",
    startTime: a.startTime || "",
    endTime: a.endTime || "",
    status: a.status,
    type: "appointment" as const,
    teamsLink: a.teamsLink,
  }))

  return (
      // <div className="p-6 md:p-8 max-w-6xl">
    <div className="max-w-6xl mx-auto space-y-8 pb-12"> 
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="card p-5 bg-white">
          <p className="text-3xl font-bold text-slate-900">{upcomingCount}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Upcoming Consultations</p>
        </div>
        <div className="card p-5 bg-white">
          <p className="text-3xl font-bold text-slate-900">{pendingCount}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Pending Requests</p>
        </div>
      </div>

      {/* Quick Book CTA */}
      <div className="card p-6 bg-white flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">Need to meet with a faculty member?</p>
          <p className="text-xs text-slate-500 mt-0.5">Book a consultation slot with available faculty.</p>
        </div>
        <Link
          href="/student/book"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gold-600 text-white text-sm font-semibold hover:bg-gold-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Book a Consultation
        </Link>
      </div>

      {/* Calendar Timeline */}
      <section className="space-y-4">
        <ConsultationsTimeline events={timelineEvents} />
      </section>
    </div>
  )
}
