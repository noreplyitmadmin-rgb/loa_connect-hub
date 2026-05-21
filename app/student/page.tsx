import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppointmentCard } from "@/components/AppointmentCard"
import { CalendarView } from "@/components/CalendarView"
import BookingCalendar from "@/components/BookingCalendar"
import { listAvailableSchedules } from "@/lib/controllers/schedules"
import { listStudentAppointments } from "@/lib/controllers/appointments"

export default async function StudentDashboard() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if ((session.user as any).role !== "STUDENT") redirect("/login")

  const schedules = await listAvailableSchedules()
  const appointments = await listStudentAppointments((session.user as any).id)

  const upcomingCount = appointments.filter((a: any) => a.status === "APPROVED" || a.status === "PENDING").length
  const pendingCount = appointments.filter((a: any) => a.status === "PENDING").length

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="card p-5 bg-white">
          <p className="text-3xl font-bold text-slate-900">{upcomingCount}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Upcoming Appointments</p>
        </div>
        <div className="card p-5 bg-white">
          <p className="text-3xl font-bold text-slate-900">{schedules.length}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Available Slots</p>
        </div>
        <div className="card p-5 bg-white">
          <p className="text-3xl font-bold text-slate-900">{pendingCount}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Pending Requests</p>
        </div>
      </div>

      {/* Calendar Booking */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Browse Available Slots</h2>
        <BookingCalendar schedules={schedules as any} />
      </section>

      {/* Calendar Timeline */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">My Schedule Timeline</h2>

        <CalendarView
          events={appointments.map((a: any) => ({
            id: a.id,
            title: `Consultation with ${a.faculty?.name || "Faculty"}`,
            subtitle: a.faculty?.email,
            date: a.schedule?.date || "",
            startTime: a.schedule?.startTime || "",
            endTime: a.schedule?.endTime || "",
            status: a.status,
            type: "appointment" as const,
            teamsLink: a.teamsLink,
          }))}
          emptyMessage="No scheduled consultations yet"
          emptySubtext="Book a consultation slot above to populate your calendar timeline."
        />
      </section>

      {/* Appointment List */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">My Appointment Cards</h2>

        {appointments.length === 0 ? (
          <div className="card p-12 text-center bg-white">
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-700 font-semibold text-sm">No appointments yet</p>
            <p className="text-slate-400 text-xs mt-1">Select and book a slot above to request your first e-consultation.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment: any) => (
              <AppointmentCard key={appointment.id} appointment={appointment} role="STUDENT" />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
