import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getMeetingsForUser } from "@/lib/controllers/meetings"

function getInitial(name: string) {
  return name?.charAt(0)?.toUpperCase() || "?"
}

const statusColors: Record<string, string> = {
  CONFIRMED: "bg-emerald-500/20 text-emerald-400",
  CANCELLED: "bg-slate-500/20 text-slate-400",
}

const participantStatusColors: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-400",
  ACCEPTED: "bg-emerald-500/20 text-emerald-400",
  DECLINED: "bg-red-500/20 text-red-400",
}

export default async function MeetingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if ((session.user as any).role !== "FACULTY") redirect("/login")

  const userId = (session.user as any).id
  const meetings = await getMeetingsForUser(userId) as any[]

  const confirmedMeetings = meetings.filter((m: any) => m.status === "CONFIRMED")
  const cancelledMeetings = meetings.filter((m: any) => m.status === "CANCELLED")

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Internal Meetings</h1>
          <p className="text-sm text-slate-500 mt-1">Schedule and manage faculty-to-faculty meetings</p>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Confirmed</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{confirmedMeetings.length}</p>
        </div>
        <div className="card p-5 bg-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Meetings</p>
          <p className="text-3xl font-bold text-slate-700 mt-1">{meetings.length}</p>
        </div>
      </div>

      {/* Meetings list */}
      {meetings.length === 0 ? (
        <div className="card p-10 bg-white text-center">
          <p className="text-slate-400 font-medium">No meetings yet</p>
          <Link href="/faculty/meetings/new" className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold mt-2 inline-block">
            Schedule your first meeting
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting: any) => {
            const isOrganizer = meeting.organizerId === userId
            const participantCount = meeting.participants?.length || 0
            const acceptedCount = meeting.participants?.filter((p: any) => p.status === "ACCEPTED").length || 0

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
                      {meeting.status}
                    </span>
                    {isOrganizer && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-400">
                        Organizer
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
