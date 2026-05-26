import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import StatusDropdown from "@/components/StatusDropdown"
import { getMeetingsForUser } from "@/lib/controllers/meetings"
import { getWeekRange, getMonthRange } from "@/lib/utils/date"

function getInitial(name: string) {
  return name?.charAt(0)?.toUpperCase() || "?"
}

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-400",
  APPROVED: "bg-cyan-500/20 text-cyan-400",
  REJECTED: "bg-red-500/20 text-red-400",
  COMPLETED: "bg-violet-500/20 text-violet-400",
  CANCELLED: "bg-slate-500/20 text-slate-400",
}

const participantStatusColors: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-400",
  ACCEPTED: "bg-emerald-500/20 text-emerald-400",
  DECLINED: "bg-red-500/20 text-red-400",
}

const filterLabels: Record<string, string> = {
  all: "All Meetings",
  this_week: "This Week",
  this_month: "This Month",
  created_by_me: "Created by Me",
  // declined: "Declined",
}

const statusLabels: Record<string, string> = {
  all: "All Statuses",
  PENDING: "Invited",
  APPROVED: "Accepted",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

export default async function MeetingsPage(props: {
  searchParams?: Promise<{ filter?: string; sort?: string; status?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as any).role
  if (role !== "FACULTY" && role !== "DEAN") redirect("/login")

  const searchParams = await props.searchParams
  const hasQueryParams = !!searchParams && Object.keys(searchParams).length > 0
  if (!hasQueryParams) {
    redirect("/faculty/meetings?filter=this_week&status=all&sort=desc")
  }

  const activeFilter = searchParams?.filter || "all"
  const activeStatus = statusLabels[searchParams?.status || "all"] ? (searchParams?.status as string) : "all"
  const activeSort = searchParams?.sort === "desc" ? "desc" : "asc"

  const userId = (session.user as any).id
  const meetings = await getMeetingsForUser(userId) as any[]

  const today = new Date()
  const weekRange = getWeekRange(today)
  const monthRange = getMonthRange(today)

  const filtered = meetings.filter((m: any) => {
    if (activeFilter === "this_week") {
      const d = new Date(m.date)
      if (!(d >= weekRange.start && d <= weekRange.end)) return false
    }
    if (activeFilter === "this_month") {
      const d = new Date(m.date)
      if (!(d >= monthRange.start && d <= monthRange.end)) return false
    }
    if (activeFilter === "created_by_me" && m.organizerId !== userId) {
      return false
    }
    if (activeFilter === "declined" && !m.participants?.some((p: any) => p.userId === userId && p.status === "DECLINED")) {
      return false
    }
    if (activeStatus !== "all" && m.status !== activeStatus) {
      return false
    }
    return true
  })

  // CORRECTED SORTING LOGIC
  const sorted = [...filtered].sort((a: any, b: any) => {
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

  const acceptedMeetings = sorted.filter((m: any) => m.status === "APPROVED")
  const cancelledMeetings = sorted.filter((m: any) => m.status === "CANCELLED")

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Meetings</h1>
          <p className="text-sm text-slate-500 mt-1">Schedule and manage meetings</p>
        </div>
        <Link
          href="/faculty/meetings/new"
          className="btn-primary text-sm font-semibold px-5 py-2.5"
        >
          + New Meeting
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="card p-5 bg-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Accepted</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{acceptedMeetings.length}</p>
        </div>
        <div className="card p-5 bg-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total</p>
          <p className="text-3xl font-bold text-slate-700 mt-1">{sorted.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 bg-white mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(filterLabels).map(([key, label]) => (
              <Link
                key={key}
                href={`/faculty/meetings?filter=${key}&status=${activeStatus}&sort=${activeSort}`}
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
            href={`/faculty/meetings?filter=${activeFilter}&status=${activeStatus}&sort=${activeSort === "asc" ? "desc" : "asc"}`}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1"
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

        <div className="mt-4">
          <StatusDropdown
            activeFilter={activeFilter}
            activeSort={activeSort}
            activeStatus={activeStatus}
          />
          <p className="text-xs text-slate-400 mt-3">Tip: Click a meeting card to view details.</p>
        </div>
      </div>

      {/* Meetings list */}
      {sorted.length === 0 ? (
        <div className="card p-10 bg-white text-center">
          <p className="text-slate-400 font-medium">No meetings found</p>
          <Link href="/faculty/meetings/new" className="text-sm text-gold-600 hover:text-gold-700 font-semibold mt-2 inline-block">
            Schedule your first meeting
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((meeting: any) => {
            const isOrganizer = meeting.organizerId === userId
            const participantCount = meeting.participants?.length || 0
            const acceptedCount = meeting.participants?.filter((p: any) => p.status === "ACCEPTED").length || 0
            const myParticipant = meeting.participants?.find((p: any) => p.userId === userId)
            const statusLabel = meeting.status === "APPROVED" && !isOrganizer
              ? "YOU ACCEPTED"
              : statusLabels[meeting.status] || meeting.status

            return (
              <Link
                key={meeting.id}
                href={`/faculty/meetings/${meeting.id}`}
                className="card p-5 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:shadow-md transition-shadow"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-800">{meeting.title}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[meeting.status] || "bg-slate-500/20 text-slate-400"}`}>
                      {isOrganizer ? "SCHEDULED" : statusLabel}
                    </span>
                    {isOrganizer && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold-500/20 text-gold-400">
                        You organized this meeting
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {meeting.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {meeting.startTime} &ndash; {meeting.endTime}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                      </svg>
                      {acceptedCount}/{participantCount} accepted
                    </span>
                  </div>
                </div>
                <div className="flex -space-x-2 shrink-0">
                  {meeting.participants?.slice(0, 4).map((p: any) => (
                    <div
                      key={p.id}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-white ${
                        p.status === "ACCEPTED" ? "bg-emerald-500" : p.status === "DECLINED" ? "bg-red-400" : "bg-slate-400"
                      }`}
                      title={`${p.user?.name || "Unknown"} (${p.status})`}
                    >
                      {getInitial(p.user?.name || "")}
                    </div>
                  ))}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}