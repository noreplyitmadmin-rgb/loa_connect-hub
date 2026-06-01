import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { listStudentAppointments } from "@/lib/controllers/appointments"
import { hasRole } from "@/lib/utils/roles"

interface Appointment {
  id: string
  title: string | null
  date: string
  startTime: string
  endTime: string
  status: string
  faculty?: { name: string; email: string }
}

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  COMPLETED: "bg-violet-100 text-violet-700",
  CANCELLED: "bg-slate-200 text-slate-600",
}

const statusLabels: Record<string, string> = {
  all: "All",
  pending: "Pending",
  approved: "Approved",
  completed: "Completed",
  cancelled: "Cancelled",
}

export default async function MobileStudentMeetings(props: {
  searchParams?: Promise<{ filter?: string; sort?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!hasRole((session.user as Record<string, unknown>).role as string, "STUDENT")) redirect("/login")

  const searchParams = await props.searchParams
  const activeFilter = (searchParams?.filter || "all").toLowerCase()
  const activeSort = searchParams?.sort === "asc" ? "asc" : "desc"

  const studentId = (session.user as Record<string, unknown>).id as string
  const appointments = (await listStudentAppointments(studentId)) as unknown as Appointment[]

  const statusFiltered =
    activeFilter === "all"
      ? appointments
      : appointments.filter((a) => a.status.toLowerCase() === activeFilter)

  const sorted = [...statusFiltered].sort((a, b) => {
    const dateCmp = new Date(a.date).getTime() - new Date(b.date).getTime()
    if (dateCmp !== 0) return activeSort === "asc" ? dateCmp : -dateCmp
    const timeA = a.startTime || ""
    const timeB = b.startTime || ""
    return activeSort === "asc" ? timeA.localeCompare(timeB) : timeB.localeCompare(timeA)
  })

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">My Consultations</h1>
        <Link
          href="/student/m/book"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-lg bg-gold-600 text-white hover:bg-gold-700 transition-colors min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Book
        </Link>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(statusLabels).map(([key, label]) => (
            <Link
              key={key}
              href={`/student/m/meetings?filter=${key}&sort=${activeSort}`}
              className={`px-3 py-2 text-xs font-semibold rounded-full transition-colors border min-h-[36px] flex items-center ${
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
          href={`/student/m/meetings?filter=${activeFilter}&sort=${activeSort === "asc" ? "desc" : "asc"}`}
          className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1 shrink-0 min-h-[36px]"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {activeSort === "asc" ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
            )}
          </svg>
          {activeSort === "asc" ? "Oldest" : "Newest"}
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="card p-10 bg-white text-center">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-slate-700 font-semibold text-sm">
            {activeFilter === "all" ? "No consultations" : `No ${activeFilter} consultations`}
          </p>
          <p className="text-slate-400 text-xs mt-1">Book a consultation to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((a) => (
            <Link
              key={a.id}
              href={`/student/m/meetings/${a.id}`}
              className="block card p-4 bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {a.faculty?.name || "Faculty"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{a.date}</p>
                  <p className="text-xs text-slate-500">
                    {a.startTime} &ndash; {a.endTime}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${statusStyles[a.status] || "bg-slate-100 text-slate-600"}`}
                >
                  {a.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="text-center pt-4">
        <Link
          href="/student/meetings?desktop=1"
          className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
        >
          Desktop view
        </Link>
      </div>
    </div>
  )
}
