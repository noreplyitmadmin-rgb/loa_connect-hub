import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AppointmentCard } from "@/features/appointments/components/AppointmentCard"
import { FacultyAppointmentTabs } from "@/features/appointments/components/FacultyAppointmentTabs"
import { listStudentAppointments } from "@/features/appointments/appointments.service"
import { getWeekRange, getMonthRange } from "@/lib/utils/date"
import { hasRole } from "@/lib/utils/roles"
import SegmentedControl from "@/components/ui/SegmentedControl"

interface StudentAppointment {
  id: string
  title: string | null
  date: string
  startTime: string
  endTime: string
  status: string
  teamsLink: string | null
  requestedAt: string
  student?: { name: string; email: string }
  faculty?: { name: string; email: string }
}

const filterSegments = [
  { key: "all", label: "All" },
  { key: "this_week", label: "This Week" },
  { key: "this_month", label: "This Month" },
]

export default async function StudentMeetings(props: {
  searchParams?: Promise<{ filter?: string; tab?: string; sort?: string }>
}) {
  const session = await auth()

  if (!session?.user) redirect("/login")
  if (!hasRole((session.user as Record<string, unknown>).role as string, "STUDENT")) redirect("/login")

  const searchParams = await props.searchParams
  const hasQueryParams = !!searchParams && Object.keys(searchParams).length > 0
  if (!hasQueryParams) {
    redirect("/student/meetings?filter=this_week")
  }

  const activeFilter = searchParams?.filter || "all"
  const activeTab = (searchParams?.tab || "all").toLowerCase()
  const activeSort = searchParams?.sort === "asc" ? "asc" : "desc"

  const studentId = (session.user as Record<string, unknown>).id as string
  const appointments = (await listStudentAppointments(studentId)).data as unknown as StudentAppointment[]

  // Apply time/ownership filter
  const today = new Date()
  const weekRange = getWeekRange(today)
  const monthRange = getMonthRange(today)

  const timeFiltered = appointments.filter((a: StudentAppointment) => {
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
      : timeFiltered.filter((a: StudentAppointment) => a.status.toLowerCase() === activeTab)

  // Sort by date then startTime
  const sorted = [...statusFiltered].sort((a: StudentAppointment, b: StudentAppointment) => {
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
    pending: appointments.filter((a: StudentAppointment) => a.status === "PENDING").length,
    approved: appointments.filter((a: StudentAppointment) => a.status === "APPROVED").length,
    completed: appointments.filter((a: StudentAppointment) => a.status === "COMPLETED").length,
    cancelled: appointments.filter((a: StudentAppointment) => a.status === "CANCELLED").length,
  }

  const filterLabel = filterSegments.find((s) => s.key === activeFilter)?.label || "All Consultations"

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <h2 className="text-lg font-bold text-primary">
          My Requests
        </h2>

        <div className="flex items-center gap-2">
          {counts.pending > 0 && (
            <span className="text-xs font-semibold bg-amber-500/20 text-amber-600 px-2.5 py-0.5 rounded-full">
              {counts.pending} pending
            </span>
          )}
          <Link
            href="/student/book"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-3 sm:py-1.5 text-xs font-semibold rounded-lg bg-gold-600 text-white hover:bg-gold-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-sm min-h-[44px] sm:min-h-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Request Consultation
          </Link>
        </div>
      </div>

      {/* Filter Pills + Sort Toggle */}
      <div className="card p-4 bg-surface">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <SegmentedControl
            segments={filterSegments}
            activeKey={activeFilter}
            paramName="filter"
            basePath="/student/meetings"
            className="flex-1"
          />
          <Link
            href={`/student/meetings?filter=${activeFilter}&tab=${activeTab}&sort=${activeSort === "asc" ? "desc" : "asc"}`}
            className="text-xs font-semibold text-tertiary hover:text-secondary transition-colors flex items-center gap-1 shrink-0 py-2 sm:py-0"
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
        <div className="card p-12 text-center bg-surface">
          <div className="w-12 h-12 bg-surface border border-default rounded-xl flex items-center justify-center mx-auto mb-4 text-tertiary">
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

          <p className="text-secondary font-semibold text-sm">
            {activeTab === "all"
              ? `No ${filterLabel.toLowerCase()}`
              : `No ${activeTab} ${filterLabel.toLowerCase()}`}
          </p>

          <p className="text-tertiary text-xs mt-1">
            {activeTab === "approved"
              ? "Accepted consultations will appear here once faculty confirms your booking."
              : activeTab === "all"
              ? "Book a consultation to see your requests here."
              : `You have no ${activeTab} consultation requests.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((appointment: StudentAppointment) => (
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
