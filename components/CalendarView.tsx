export interface CalendarEvent {
  id: string
  title: string
  subtitle?: string
  date: string
  startTime: string
  endTime: string
  status?: string
  type: "appointment" | "available" | "booked"
  teamsLink?: string | null
}

interface CalendarViewProps {
  events: CalendarEvent[]
  emptyMessage?: string
  emptySubtext?: string
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const diff = d.getTime() - today.getTime()
  const daysDiff = Math.round(diff / 86400000)

  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }

  if (daysDiff === 0) return "Today"
  if (daysDiff === 1) return "Tomorrow"
  if (daysDiff > 0 && daysDiff < 7) return d.toLocaleDateString("en-US", { weekday: "long" })
  return d.toLocaleDateString("en-US", options)
}

function isPast(dateStr: string, endTime: string) {
  const now = new Date()
  const eventEnd = new Date(dateStr + "T" + endTime + ":00")
  return eventEnd < now
}

export function CalendarView({ events, emptyMessage, emptySubtext }: CalendarViewProps) {
  const grouped: Record<string, CalendarEvent[]> = {}
  for (const event of events) {
    if (!grouped[event.date]) grouped[event.date] = []
    grouped[event.date].push(event)
  }

  const sortedDates = Object.keys(grouped).sort()

  if (sortedDates.length === 0) {
    return (
      <div className="card p-12 text-center bg-white">
        <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-slate-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-slate-700 font-semibold text-sm">{emptyMessage || "No upcoming events"}</p>
        {emptySubtext && <p className="text-slate-400 text-xs mt-1">{emptySubtext}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {sortedDates.map((date) => {
        const dayEvents = grouped[date].sort((a, b) => a.startTime.localeCompare(b.startTime))
        const lastEndTime = dayEvents[dayEvents.length - 1]?.endTime || "23:59"
        const past = isPast(date, lastEndTime)
        const dateFormatted = formatDate(date)

        return (
          <div key={date} className={`card overflow-hidden bg-white transition-opacity duration-200 ${past ? "opacity-60" : ""}`}>
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 ring-4 ring-indigo-50" />
              <h3 className="font-semibold text-slate-800 text-sm tracking-tight">{dateFormatted}</h3>
              <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded border border-slate-200/40">{date}</span>
              {past && (
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Past</span>
              )}
            </div>
            <div className="divide-y divide-slate-100">
              {dayEvents.map((event) => (
                <div key={event.id} className="px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 w-16 shrink-0 text-right">
                      <span className={`text-sm font-bold tabular-nums leading-none tracking-tight block ${
                        event.type === "available" ? "text-emerald-600" :
                        event.type === "booked" ? "text-amber-600" :
                        "text-indigo-600"
                      }`}>
                        {event.startTime}
                      </span>
                      <span className="block text-[11px] text-slate-400 font-semibold tabular-nums leading-none mt-1">
                        {event.endTime}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 tracking-tight truncate">{event.title}</p>
                      {event.subtitle && (
                        <p className="text-xs text-slate-500 mt-1 truncate">{event.subtitle}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {event.type === "available" && (
                          <span className="badge-emerald">Available</span>
                        )}
                        {event.type === "booked" && (
                          <span className="badge-amber">Booked</span>
                        )}
                        {event.status && event.type === "appointment" && (
                          <span className={`${
                            event.status === "PENDING" ? "badge-amber" :
                            event.status === "APPROVED" ? "badge-emerald" :
                            event.status === "REJECTED" ? "badge-red" :
                            "badge-blue"
                          }`}>
                            {event.status}
                          </span>
                        )}
                        {event.teamsLink && (
                          <a
                            href={event.teamsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/50 hover:bg-indigo-100 transition-colors shadow-sm"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Join
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
