"use client"

import { useMemo } from "react"
import Link from "next/link"

interface HistoryAppointment {
  id: string
  title: string | null
  description: string | null
  actionTaken: string | null
  date: string
  startTime: string
  endTime: string
  status: string
  faculty?: { name: string; email: string } | null
}

interface HistoryEvaluation {
  id: string
  facultyName: string
  submittedAt: string
}

interface HistoryAuditEvent {
  id: string
  action: string
  email: string | null
  details: string | null
  createdAt: string
}

interface Props {
  studentName: string
  course: string | null
  appointments: HistoryAppointment[]
  evaluations?: HistoryEvaluation[]
  auditEvents?: HistoryAuditEvent[]
}

interface TimelineItem {
  type: "consultation" | "evaluation" | "audit"
  date: string
  sortKey: string
  data: HistoryAppointment | HistoryEvaluation | HistoryAuditEvent
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`
}

function formatMonth(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function getMonthKey(dateStr: string) {
  return dateStr.slice(0, 7)
}

const statusColors: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  APPROVED: "bg-gold-100 text-gold-700 dark:bg-amber-900/40 dark:text-amber-300",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
}

export default function ConsultationHistory({ studentName: _studentName, course, appointments, evaluations = [], auditEvents = [] }: Props) {
  const timeline = useMemo(() => {
    const items: TimelineItem[] = [
      ...appointments.map((a) => ({
        type: "consultation" as const,
        date: a.date,
        sortKey: `${a.date}T${a.startTime}`,
        data: a,
      })),
      ...evaluations.map((e) => {
        const d = new Date(e.submittedAt)
        return {
          type: "evaluation" as const,
          date: d.toISOString().slice(0, 10),
          sortKey: e.submittedAt,
          data: e,
        }
      }),
      ...auditEvents.map((e) => {
        const d = new Date(e.createdAt)
        return {
          type: "audit" as const,
          date: d.toISOString().slice(0, 10),
          sortKey: e.createdAt,
          data: e,
        }
      }),
    ]
    items.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    return items
  }, [appointments, evaluations, auditEvents])

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineItem[]>()
    for (const item of timeline) {
      const key = getMonthKey(item.date)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    const sorted = Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
    return sorted
  }, [timeline])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
      {timeline.length === 0 ? (
        <div className="card p-12 sm:p-16 bg-surface text-center animate-fade-in mt-8">
          <div className="w-16 h-16 bg-surface border border-default rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">📖</span>
          </div>
          <h2 className="text-lg font-bold text-primary mb-2">No history yet</h2>
          <p className="text-sm text-tertiary max-w-md mx-auto mb-6">
            Your consultation and evaluation history will appear here once you start meeting with faculty and submitting evaluations.
          </p>
          <Link
            href="/student/book"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gold-600 text-white font-semibold text-sm hover:bg-gold-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-sm"
          >
            Book Your First Consultation
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-xl sm:text-2xl font-bold text-primary pt-6 pb-1">Activity Timeline</h1>
          {course && <p className="text-sm text-tertiary mb-6">{course}</p>}

          <div className="relative">
            {grouped.map(([monthKey, items]) => (
              <div key={monthKey} className="mb-8">
                <div className="sticky top-0 z-10 bg-white dark:bg-gray-950 pb-3 pt-2">
                  <h2 className="text-sm font-bold text-primary uppercase tracking-wider">
                    {formatMonth(items[0].date)}
                  </h2>
                </div>

                <div className="relative">
                  <div className="absolute left-[17px] sm:left-[19px] top-2 bottom-0 w-px bg-slate-200 dark:bg-gray-700" />

                  {items.map((item, _i) => {
                    if (item.type === "evaluation") {
                      const ev = item.data as HistoryEvaluation
                      return (
                        <div key={`eval-${ev.id}`} className="relative pl-10 sm:pl-12 pb-6 last:pb-0">
                          <div className="absolute left-[11px] sm:left-[13px] top-[6px] w-[13px] h-[13px] rounded-full ring-2 ring-white dark:ring-gray-950 z-10 bg-purple-500" />
                          <time className="text-xs text-tertiary font-medium">{formatDateTime(ev.submittedAt)}</time>
                          <div className="mt-1 bg-surface border border-default rounded-lg p-3 sm:p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Evaluation</span>
                                <p className="text-sm text-secondary mt-1">
                                  Evaluated <span className="font-semibold text-primary">{ev.facultyName}</span>
                                </p>
                              </div>
                              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                Submitted
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    if (item.type === "audit") {
                      const ev = item.data as HistoryAuditEvent
                      return (
                        <div key={`audit-${ev.id}`} className="relative pl-10 sm:pl-12 pb-6 last:pb-0">
                          <div className="absolute left-[11px] sm:left-[13px] top-[6px] w-[13px] h-[13px] rounded-full ring-2 ring-white dark:ring-gray-950 z-10 bg-red-500" />
                          <time className="text-xs text-tertiary font-medium">{formatDateTime(ev.createdAt)}</time>
                          <div className="mt-1 bg-surface border border-default rounded-lg p-3 sm:p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Email Issue</span>
                                <p className="text-sm text-secondary mt-1">
                                  Delivery to <span className="font-semibold text-primary">{ev.email}</span> failed
                                </p>
                                {ev.details && <p className="text-xs text-tertiary mt-0.5">{ev.details}</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    const apt = item.data as HistoryAppointment
                    const isCompleted = apt.status === "COMPLETED"

                    return (
                      <div key={`apt-${apt.id}`} className="relative pl-10 sm:pl-12 pb-6 last:pb-0">
                        <div className={`absolute left-[11px] sm:left-[13px] top-[6px] w-[13px] h-[13px] rounded-full ring-2 ring-white dark:ring-gray-950 z-10 ${
                          isCompleted ? "bg-emerald-500" : "bg-slate-300 dark:bg-gray-600"
                        }`} />
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <time className="text-xs text-tertiary font-medium">
                            {formatDate(apt.date)}
                          </time>
                          <span className="text-[11px] text-tertiary">
                            {formatTime(apt.startTime)} – {formatTime(apt.endTime)}
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${statusColors[apt.status] || "bg-surface text-tertiary"}`}>
                            {apt.status}
                          </span>
                        </div>
                        <div className="mt-1 bg-surface border border-default rounded-lg p-3 sm:p-4">
                          <p className="text-sm font-semibold text-primary">
                            {apt.faculty?.name || "Faculty Member"}
                          </p>
                          {apt.title && (
                            <p className="text-sm text-secondary mt-0.5">&ldquo;{apt.title}&rdquo;</p>
                          )}
                          {apt.description && (
                            <p className="text-xs text-tertiary mt-1.5 line-clamp-2">{apt.description}</p>
                          )}
                          {apt.actionTaken && (
                            <div className="mt-2 pl-3 border-l-2 border-emerald-300 dark:border-emerald-700">
                              <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Faculty notes</p>
                              <p className="text-xs text-secondary mt-0.5 line-clamp-2">{apt.actionTaken}</p>
                            </div>
                          )}
                          <Link
                            href={`/student/meetings/${apt.id}`}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gold-600 hover:text-gold-700 dark:text-gold-500 dark:hover:text-gold-400 transition-colors"
                          >
                            View details →
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
