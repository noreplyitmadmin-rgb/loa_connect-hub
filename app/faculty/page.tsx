import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppointmentCard } from "@/components/AppointmentCard"
import { FacultyAppointmentTabs } from "@/components/FacultyAppointmentTabs"
import { listFacultyAppointments } from "@/lib/controllers/appointments"
import Link from "next/link"

export default async function FacultyDashboard(props: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as any).role
  if (role !== "FACULTY" && role !== "DEAN") redirect("/login")

  const searchParams = await props.searchParams
  const activeTab = searchParams?.tab || "all"

  const facultyId = (session.user as any).id
  const appointments = await listFacultyAppointments(facultyId)

  const today = new Date().toISOString().slice(0, 10)

  const upcoming = appointments.filter(
    (a: any) => a.date >= today && (a.status === "APPROVED" || a.status === "PENDING")
  )

  const requests = appointments.filter((a: any) => a.status === "PENDING")

  const filteredAppointments = activeTab === "all"
    ? appointments
    : appointments.filter((a: any) => a.status === activeTab.toUpperCase())

  const counts = {
    pending: appointments.filter((a: any) => a.status === "PENDING").length,
    approved: appointments.filter((a: any) => a.status === "APPROVED").length,
    completed: appointments.filter((a: any) => a.status === "COMPLETED").length,
    cancelled: appointments.filter((a: any) => a.status === "CANCELLED").length,
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="card p-5 bg-white">
          <p className="text-3xl font-bold text-slate-900">{appointments.length}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Total Appointments</p>
        </div>
        <div className="card p-5 bg-white">
          <p className="text-3xl font-bold text-slate-900">{counts.pending}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Pending Requests</p>
        </div>
        <div className="card p-5 bg-white">
          <p className="text-3xl font-bold text-slate-900">{counts.completed}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Completed Consultations</p>
        </div>
      </div>

      {/* Upcoming Consultation Schedules */}
      {/* <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Upcoming Meetings</h2>
          <Link
            href="/faculty/availability"
            className="text-xs font-semibold text-gold-600 hover:text-gold-800 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configure Availability
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="card p-12 text-center bg-white">
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-slate-700 font-semibold text-sm">No upcoming schedules</p>
            <p className="text-slate-400 text-xs mt-1">Upcoming approved and pending appointments will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((appointment: any) => (
              <AppointmentCard key={appointment.id} appointment={appointment} role="FACULTY" />
            ))}
          </div>
        )}
      </section> */}

      {/* Consultation Requests */}
      {/* <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Consultation Requests</h2>
           <Link
            href="/faculty/availability"
            className="text-xs font-semibold text-gold-600 hover:text-gold-800 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configure Availability
          </Link>
          {requests.length > 0 && (
            <span className="text-xs font-semibold bg-amber-500/20 text-amber-600 px-2.5 py-0.5 rounded-full">
              {requests.length} pending
            </span>
          )}
        </div>
        <FacultyAppointmentTabs counts={counts} />
        {filteredAppointments.length === 0 ? (
          <div className="card p-12 text-center bg-white">
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-700 font-semibold text-sm">No appointments in this view</p>
            <p className="text-slate-400 text-xs mt-1">
              {activeTab === "all"
                ? "Requests will appear here when students book your slots."
                : `No ${activeTab} appointments to show.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment: any) => (
              <AppointmentCard key={appointment.id} appointment={appointment} role="FACULTY" />
            ))}
          </div>
        )}
      </section> */}
    </div>
  )
}
