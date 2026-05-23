import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppointmentCard } from "@/components/AppointmentCard"
import { FacultyAppointmentTabs } from "@/components/FacultyAppointmentTabs"
import { listStudentAppointments } from "@/lib/controllers/appointments"

export default async function StudentMeetings(props: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if ((session.user as any).role !== "STUDENT") redirect("/login")

  const searchParams = await props.searchParams
  const activeTab = searchParams?.tab || "approved"

  const studentId = (session.user as any).id
  const appointments = await listStudentAppointments(studentId)

  const counts = {
    pending: appointments.filter((a: any) => a.status === "PENDING").length,
    approved: appointments.filter((a: any) => a.status === "APPROVED").length,
    completed: appointments.filter((a: any) => a.status === "COMPLETED").length,
    cancelled: appointments.filter((a: any) => a.status === "CANCELLED").length,
  }

  const filteredAppointments =
    activeTab === "all"
      ? appointments
      : appointments.filter((a: any) => a.status === activeTab.toUpperCase())

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">My Requests</h2>
        {counts.pending > 0 && (
          <span className="text-xs font-semibold bg-amber-500/20 text-amber-600 px-2.5 py-0.5 rounded-full">
            {counts.pending} pending
          </span>
        )}
      </div>

      {/* Tabs */}
      <FacultyAppointmentTabs counts={counts} basePath="/student/meetings" />

      {/* Appointment Cards */}
      {filteredAppointments.length === 0 ? (
        <div className="card p-12 text-center bg-white">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-slate-700 font-semibold text-sm">
            {activeTab === "all"
              ? "No requests yet"
              : `No ${activeTab} requests`}
          </p>
          <p className="text-slate-400 text-xs mt-1">
            {activeTab === "approved"
              ? "Accepted consultations will appear here once faculty confirms your booking."
              : activeTab === "all"
              ? "Book a consultation to see your requests here."
              : `You have no ${activeTab} consultation requests.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment: any) => (
            <AppointmentCard key={appointment.id} appointment={appointment} role="STUDENT" />
          ))}
        </div>
      )}
    </div>
  )
}
