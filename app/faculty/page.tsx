import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AvailabilityForm } from "@/components/AvailabilityForm"
import { AppointmentCard } from "@/components/AppointmentCard"
import { FacultyAppointmentTabs } from "@/components/FacultyAppointmentTabs"
import { CalendarView, type CalendarEvent } from "@/components/CalendarView"
import { listFacultySchedules } from "@/lib/controllers/schedules"
import { listFacultyAppointments } from "@/lib/controllers/appointments"

export default async function FacultyDashboard(props: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if ((session.user as any).role !== "FACULTY") redirect("/login")

  const searchParams = await props.searchParams
  const activeTab = searchParams?.tab || "all"

  const facultyId = (session.user as any).id
  const schedules = await listFacultySchedules(facultyId)
  const appointments = await listFacultyAppointments(facultyId)

  const calendarEvents: CalendarEvent[] = [
    ...schedules.map((s: any) => ({
      id: s.id,
      title: s.isAvailable ? "Available Slot" : "Booked Slot",
      subtitle: "",
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      type: (s.isAvailable ? "available" : "booked") as "available" | "booked",
    })),
    ...appointments.map((a: any) => ({
      id: a.id,
      title: `Appointment with ${a.student?.name || "Student"}`,
      subtitle: a.student?.email,
      date: a.schedule?.date || "",
      startTime: a.schedule?.startTime || "",
      endTime: a.schedule?.endTime || "",
      status: a.status,
      type: "appointment" as const,
      teamsLink: a.teamsLink,
    })),
  ]

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
          <p className="text-3xl font-bold text-slate-900">{schedules.length}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Total Slots</p>
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

      {/* Schedule Timeline */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">My Schedule Timeline</h2>
        <CalendarView
          events={calendarEvents}
          emptyMessage="No schedule slots yet"
          emptySubtext="Use the creation tool below to set up your first availability window."
        />
      </section>

      {/* Create Availability */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Create Availability Window</h2>
        <div className="card p-6 bg-white">
          <AvailabilityForm />
        </div>
      </section>

      {/* Availability List */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">My Created Slots ({schedules.length})</h2>
        {schedules.length === 0 ? (
          <div className="card p-12 text-center bg-white">
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-slate-700 font-semibold text-sm">No schedules yet</p>
            <p className="text-slate-400 text-xs mt-1">Availability slots will appear here once created above.</p>
          </div>
        ) : (
          <div className="card overflow-x-auto bg-white">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Time Window</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.map((schedule: any) => (
                  <tr key={schedule.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{schedule.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium tabular-nums">{schedule.startTime} &ndash; {schedule.endTime}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        schedule.isAvailable
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/50"
                          : "bg-slate-100 text-slate-500 border-slate-200/50"
                      }`}>
                        {schedule.isAvailable ? "Available" : "Booked"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Appointment Requests with Tabs */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Appointment Requests</h2>
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
      </section>
    </div>
  )
}
