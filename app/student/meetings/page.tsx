import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AppointmentCard } from "@/components/AppointmentCard"
import { FacultyAppointmentTabs } from "@/components/FacultyAppointmentTabs"
import { listStudentAppointments } from "@/lib/controllers/appointments"
import { getWeekRange, getMonthRange } from "@/lib/utils/date"
import { hasRole } from "@/lib/utils/roles"

const filterLabels: Record<string, string> = {
  all: "All Consultations",
  this_week: "This Week",
  this_month: "This Month",
}

export default async function StudentMeetings(props: {
  searchParams?: Promise<{ filter?: string; tab?: string; sort?: string }>
}) {
  const session = await auth()

  if (!session?.user) redirect("/login")
  if (!hasRole((session.user as any).role, "STUDENT")) redirect("/login")

  const searchParams = await props.searchParams
  const hasQueryParams = !!searchParams && Object.keys(searchParams).length > 0
  if (!hasQueryParams) {
    redirect("/student/meetings?filter=this_week")
  }

  const activeFilter = searchParams?.filter || "all"
  const activeTab = (searchParams?.tab || "all").toLowerCase()
  const activeSort = searchParams?.sort === "asc" ? "asc" : "desc"

  const studentId = (session.user as any).id
  const appointments = await listStudentAppointments(studentId)

  // Apply time/ownership filter
  const today = new Date()
  const weekRange = getWeekRange(today)
  const monthRange = getMonthRange(today)

  const timeFiltered = appointments.filter((a: any) => {
    if (activeFilter === "this_week") {
      const d = new Date(a.date)
      if (!(d >= weekRange.start && d <= weekRange.end)) return false
    }
    if (activeFilter === "this_month") {
      const d = new Date(a.date)
      if (!(d >= monthRange.start && d <= monthRange.end)) return false
    }
    return true
  })

  // Apply status tab filter
  const statusFiltered =
    activeTab === "all"
      ? timeFiltered
      : timeFiltered.filter((a: any) => a.status.toLowerCase() === activeTab)

  // Sort by date then startTime
  const sorted = [...statusFiltered].sort((a: any, b: any) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    const dateCmp = dateA - dateB

    if (dateCmp !== 0) {
      return activeSort === "asc" ? dateCmp : -dateCmp
    }

    const timeA = a.startTime || ""
    const timeB = b.startTime || ""

    return activeSort === "asc"
      ? timeA.localeCompare(timeB)
      : timeB.localeCompare(timeA)
  })

  const counts = {
    pending: appointments.filter((a: any) => a.status === "PENDING").length,
    approved: appointments.filter((a: any) => a.status === "APPROVED").length,
    completed: appointments.filter((a: any) => a.status === "COMPLETED").length,
    cancelled: appointments.filter((a: any) => a.status === "CANCELLED").length,
  }

  const filterLabel = filterLabels[activeFilter] || "All Consultations"

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">
          My Requests
        </h2>

        {counts.pending > 0 && (
          <span className="text-xs font-semibold bg-amber-500/20 text-amber-600 px-2.5 py-0.5 rounded-full">
            {counts.pending} pending
          </span>
        )}
      </div>

      {/* Filter Pills + Sort Toggle */}
      <div className="card p-4 bg-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(filterLabels).map(([key, label]) => (
              <Link
                key={key}
                href={`/student/meetings?filter=${key}&tab=${activeTab}&sort=${activeSort}`}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors border ${
                  activeFilter === key
                    ? "border-gold-500 bg-gold-500 text-white"
                    : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
          <Link
            href={`/student/meetings?filter=${activeFilter}&tab=${activeTab}&sort=${activeSort === "asc" ? "desc" : "asc"}`}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1 shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {activeSort === "asc" ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
              )}
            </svg>
            {activeSort === "asc" ? "Oldest First" : "Newest First"}
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <FacultyAppointmentTabs
        counts={counts}
        basePath="/student/meetings"
      />

      {/* Appointment Cards */}
      {sorted.length === 0 ? (
        <div className="card p-12 text-center bg-white">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>

          <p className="text-slate-700 font-semibold text-sm">
            {activeTab === "all"
              ? `No ${filterLabel.toLowerCase()}`
              : `No ${activeTab} ${filterLabel.toLowerCase()}`}
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
          {sorted.map((appointment: any) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              role="STUDENT"
            />
          ))}
        </div>
      )}
    </div>
  )
}
