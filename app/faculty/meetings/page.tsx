import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { FacultyAppointmentTabs } from "@/components/FacultyAppointmentTabs"
import SearchInput from "@/components/SearchInput"
import { getMeetingsForUser } from "@/lib/controllers/appointments"
import { getWeekRange, getMonthRange } from "@/lib/utils/date"
import { hasRole } from "@/lib/utils/roles"

interface ParticipantData {
  id: string
  meetingId: string
  userId: string
  status: string
  user?: Record<string, unknown>
}

interface MeetingData {
  id: string
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  meetingType: string
  organizerId: string
  teamsEventId: string | null
  teamsLink: string | null
  status: string
  createdAt: string
  organizer: Record<string, unknown> | null
  participants: ParticipantData[]
}

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-400",
  APPROVED: "bg-cyan-500/20 text-cyan-400",
  REJECTED: "bg-red-500/20 text-red-400",
  COMPLETED: "bg-violet-500/20 text-violet-400",
  CANCELLED: "bg-slate-500/20 text-slate-400",
}

const filterLabels: Record<string, string> = {
  all: "All Meetings",
  this_week: "This Week",
  this_month: "This Month",
  created_by_me: "Created by Me",
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
  searchParams?: Promise<{ filter?: string; sort?: string; tab?: string; q?: string; showInternal?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as Record<string, unknown>).role as string
  if (!hasRole(role, "FACULTY") && !hasRole(role, "DEAN")) redirect("/login")

  const searchParams = await props.searchParams
  const hasQueryParams = !!searchParams && Object.keys(searchParams).length > 0
  if (!hasQueryParams) {
    redirect("/faculty/meetings?filter=this_week&tab=all&sort=desc")
  }

  const activeFilter = searchParams?.filter || "all"
  const activeTab = (searchParams?.tab || "all").toLowerCase()
  const activeSort = searchParams?.sort === "desc" ? "desc" : "asc"
  const searchQuery = searchParams?.q || ""
  const showInternal = searchParams?.showInternal === "1"

  const userId = (session.user as Record<string, unknown>).id as string
  const meetings = (await getMeetingsForUser(userId)) as unknown as MeetingData[]

  const today = new Date()
  const weekRange = getWeekRange(today)
  const monthRange = getMonthRange(today)

  const filtered = meetings.filter((m: MeetingData) => {
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
    if (activeFilter === "declined" && !m.participants?.some((p: ParticipantData) => p.userId === userId && p.status === "DECLINED")) {
      return false
    }
    if (activeTab !== "all" && m.status.toLowerCase() !== activeTab) {
      return false
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!m.title.toLowerCase().includes(q) && !(m.description || "").toLowerCase().includes(q)) {
        return false
      }
    }
    if (!showInternal && m.meetingType !== "CONSULTATION") {
      return false
    }
    return true
  })

  // CORRECTED SORTING LOGIC
  const sorted = [...filtered].sort((a: MeetingData, b: MeetingData) => {
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
    pending: meetings.filter((m: MeetingData) => m.status === "PENDING").length,
    approved: meetings.filter((m: MeetingData) => m.status === "APPROVED").length,
    completed: meetings.filter((m: MeetingData) => m.status === "COMPLETED").length,
    cancelled: meetings.filter((m: MeetingData) => m.status === "CANCELLED").length,
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
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
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5 bg-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Consultations</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{meetings.filter((m) => m.meetingType === "CONSULTATION").length}</p>
        </div>
        <div className="card p-5 bg-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Internal</p>
          <p className="text-3xl font-bold text-cyan-600 mt-1">{meetings.filter((m) => m.meetingType !== "CONSULTATION").length}</p>
        </div>
        <div className="card p-5 bg-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total</p>
          <p className="text-3xl font-bold text-slate-700 mt-1">{meetings.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 bg-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(filterLabels).map(([key, label]) => (
              <Link
                key={key}
                href={`/faculty/meetings?filter=${key}&tab=${activeTab}&sort=${activeSort}${searchQuery ? `&q=${searchQuery}` : ""}${showInternal ? "&showInternal=1" : ""}`}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors border ${activeFilter === key
                    ? "border-gold-500 bg-gold-500 text-white"
                    : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/faculty/meetings?filter=${activeFilter}&tab=${activeTab}&sort=${activeSort}${searchQuery ? `&q=${searchQuery}` : ""}${showInternal ? "" : "&showInternal=1"}`}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors border ${showInternal ? "border-gold-500 bg-gold-500 text-white" : "border-slate-200 bg-slate-100 text-slate-600"}`}
            >
              <svg className={`w-3.5 h-3.5 ${showInternal ? "text-white" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                {showInternal ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                )}
              </svg>
              {showInternal ? "Showing all" : "Consultations only"}
            </Link>
            <Link
            href={`/faculty/meetings?filter=${activeFilter}&tab=${activeTab}&sort=${activeSort === "asc" ? "desc" : "asc"}${searchQuery ? `&q=${searchQuery}` : ""}${showInternal ? "&showInternal=1" : ""}`}
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
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SearchInput key={searchQuery} query={searchQuery} />
          </div>
          <FacultyAppointmentTabs
            counts={counts}
            basePath="/faculty/meetings"
          />
          <p className="text-xs text-slate-400">Tip: Click a meeting card to view details.</p>
        </div>
      </div>

      {/* Meetings list */}
      {sorted.length === 0 ? (
        <div className="card p-10 bg-white text-center">
          <p className="text-slate-400 font-medium">No meetings found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((meeting: MeetingData) => {
            const isOrganizer = meeting.organizerId === userId
            let statusLabel = meeting.status === "APPROVED" && !isOrganizer
              ? "YOU ACCEPTED"
              : statusLabels[meeting.status] || meeting.status

            const getStatusLabel = () =>{
              if (isOrganizer) {
                if(meeting.status === "APPROVED"){
                  return "SCHEDULED"
                } else if(meeting.status === "REJECTED"){
                  return "DECLINED BY PRIMARY PARTICIPANT"
                } else {
                  return statusLabels[meeting.status] || meeting.status
                }
              }else {
                const participant = meeting.participants?.find((p: ParticipantData) => p.userId === userId)
                if(participant?.status === "APPROVED"){
                  return "YOU ACCEPTED"
                } else if(participant?.status === "REJECTED"){
                  return "YOU DECLINED"
                } else if(participant?.status === "PENDING"){
                  return "Invited"
                } else {
                  return statusLabels[meeting.status] || meeting.status
                }
              }
            }

            statusLabel = getStatusLabel()

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
                    {meeting.meetingType === "CONSULTATION" && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400">
                        Consultation
                      </span>
                    )}
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
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-xs font-semibold text-gold-600 inline-flex items-center gap-1 cursor-default">
                    View Details
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}