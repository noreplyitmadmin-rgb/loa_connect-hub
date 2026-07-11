import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { FacultyAppointmentTabs } from "@/features/appointments/components/FacultyAppointmentTabs"
import SearchBar from "@/components/ui/SearchBar"
import { getMeetingsForUser } from "@/features/appointments/appointments.controller"
import { getWeekRange, getMonthRange } from "@/lib/utils/date"

import SegmentedControl from "@/components/ui/SegmentedControl"
import Toggle from "@/components/ui/Toggle"

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
  CANCELLED: "bg-slate-500/20 text-tertiary",
}

const filterSegments = [
  { key: "all", label: "All" },
  { key: "this_week", label: "This Week" },
  { key: "this_month", label: "This Month" },
]

const statusLabels: Record<string, string> = {
  all: "All Statuses",
  PENDING: "Invited",
  APPROVED: "Accepted",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

export default async function MeetingsPage(props: {
  searchParams?: Promise<{ filter?: string; sort?: string; tab?: string; q?: string; showInternal?: string; mine?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

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
  const mineOnly = searchParams?.mine === "1"

  const userId = (session.user as Record<string, unknown>).id as string
  const meetings = (await getMeetingsForUser(userId)) as unknown as MeetingData[]

  const today = new Date()
  const weekRange = getWeekRange(today)
  const monthRange = getMonthRange(today)

  const baseFiltered = meetings.filter((m: MeetingData) => {
    if (activeFilter === "this_week") {
      const d = new Date(m.date)
      if (!(d >= weekRange.start && d <= weekRange.end)) return false
    }
    if (activeFilter === "this_month") {
      const d = new Date(m.date)
      if (!(d >= monthRange.start && d <= monthRange.end)) return false
    }
    if (mineOnly && m.organizerId !== userId) return false
    if (!showInternal && m.meetingType !== "CONSULTATION") return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!m.title.toLowerCase().includes(q) && !(m.description || "").toLowerCase().includes(q)) return false
    }
    return true
  })

  const filtered = baseFiltered.filter((m: MeetingData) => {
    if (activeTab !== "all" && m.status.toLowerCase() !== activeTab) return false
    return true
  })

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
    pending: baseFiltered.filter((m: MeetingData) => m.status === "PENDING").length,
    approved: baseFiltered.filter((m: MeetingData) => m.status === "APPROVED").length,
    completed: baseFiltered.filter((m: MeetingData) => m.status === "COMPLETED").length,
    cancelled: baseFiltered.filter((m: MeetingData) => m.status === "CANCELLED").length,
  }

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Meetings</h1>
          <p className="text-sm text-tertiary mt-1">Schedule and manage meetings</p>
        </div>
        <Link
          href="/faculty/meetings/new"
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-gold-600 text-white text-sm font-semibold hover:bg-gold-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-sm"
        >
          + New Meeting
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5 bg-surface">
          <p className="text-xs font-semibold uppercase tracking-wider text-tertiary">Consultations</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{meetings.filter((m) => m.meetingType === "CONSULTATION").length}</p>
        </div>
        <div className="card p-5 bg-surface">
          <p className="text-xs font-semibold uppercase tracking-wider text-tertiary">Internal</p>
          <p className="text-3xl font-bold text-cyan-600 mt-1">{meetings.filter((m) => m.meetingType !== "CONSULTATION").length}</p>
        </div>
        <div className="card p-5 bg-surface">
          <p className="text-xs font-semibold uppercase tracking-wider text-tertiary">Total</p>
          <p className="text-3xl font-bold text-secondary mt-1">{meetings.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 bg-surface">
        <SegmentedControl
          segments={filterSegments}
          activeKey={activeFilter}
          paramName="filter"
          basePath="/faculty/meetings"
        />
        <div className="flex items-center justify-end gap-3 mt-3">
          <Toggle paramName="mine" label="My Meetings" basePath="/faculty/meetings" />
          <Link
            href={`/faculty/meetings?filter=${activeFilter}&tab=${activeTab}&sort=${activeSort}${searchQuery ? `&q=${searchQuery}` : ""}${showInternal ? "" : "&showInternal=1"}${mineOnly ? "&mine=1" : ""}`}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors border ${showInternal ? "border-gold-500 bg-gold-500 text-white" : "border-default bg-surface text-secondary"}`}
          >
            <svg className={`w-3.5 h-3.5 ${showInternal ? "text-white" : "text-tertiary"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              {showInternal ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              )}
            </svg>
            {showInternal ? "Showing all" : "Consultations only"}
          </Link>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SearchBar query={searchQuery} placeholder="Search meetings..." basePath="/faculty/meetings" />
          </div>
          <FacultyAppointmentTabs
            counts={counts}
            basePath="/faculty/meetings"
          />
          <p className="text-xs text-tertiary">Tip: Click a meeting card to view details.</p>
        </div>
      </div>

      {/* Meetings list */}
      {sorted.length === 0 ? (
        <div className="card p-10 bg-surface text-center">
          <p className="text-tertiary font-medium">No meetings found</p>
        </div>
      ) : (
        <div>
          <div className="flex justify-end">
            <Link
              href={`/faculty/meetings?filter=${activeFilter}&tab=${activeTab}&sort=${activeSort === "asc" ? "desc" : "asc"}${searchQuery ? `&q=${searchQuery}` : ""}${showInternal ? "&showInternal=1" : ""}${mineOnly ? "&mine=1" : ""}`}
              className="text-xs font-semibold text-tertiary hover:text-secondary transition-colors flex items-center gap-1 px-3 py-1.5"
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
          <div className="ios-table-section">
          {sorted.map((meeting: MeetingData) => {
            const isOrganizer = meeting.organizerId === userId

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

            const statusLabel = getStatusLabel()

            return (
              <Link
                key={meeting.id}
                href={`/faculty/meetings/${meeting.id}`}
                className="ios-table-row"
              >
                <div className="ios-table-row-label">
                  <p className="text-sm font-semibold text-primary leading-tight truncate">{meeting.title}</p>
                  <p className="text-xs text-tertiary mt-0.5">
                    {meeting.date} &bull; {meeting.startTime} &ndash; {meeting.endTime}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[meeting.status] || "bg-slate-500/20 text-tertiary"}`}>
                  {statusLabel}
                </span>
                <svg className="ios-table-row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )
          })}
          </div>
        </div>
      )}
    </div>
  )
}
