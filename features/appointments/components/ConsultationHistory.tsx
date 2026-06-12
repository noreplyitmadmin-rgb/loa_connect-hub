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

interface Props {
  studentName: string
  course: string | null
  appointments: HistoryAppointment[]
  evaluations?: HistoryEvaluation[]
}

interface TimelineItem {
  type: "consultation" | "evaluation"
  date: string
  sortKey: string
  data: HistoryAppointment | HistoryEvaluation
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })
}

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a + "T00:00:00").getTime()
  const d2 = new Date(b + "T00:00:00").getTime()
  return Math.round((d2 - d1) / 86400000)
}

export default function ConsultationHistory({ studentName, course, appointments, evaluations = [] }: Props) {
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
        const dateStr = d.toISOString().slice(0, 10)
        return {
          type: "evaluation" as const,
          date: dateStr,
          sortKey: e.submittedAt,
          data: e,
        }
      }),
    ]
    items.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    return items
  }, [appointments, evaluations])

  const completed = appointments.filter((a) => a.status === "COMPLETED")
  const uniqueFaculty = useMemo(
    () => [...new Set(appointments.map((a) => a.faculty?.name).filter(Boolean))],
    [appointments]
  )

  const firstDate = timeline.length > 0 ? timeline[0].date : null
  const lastDate = timeline.length > 0 ? timeline[timeline.length - 1].date : null
  const timespan = firstDate && lastDate ? daysBetween(firstDate, lastDate) : 0
  const submissionCount = evaluations.length

  const firstName = studentName.split(" ")[0]

  return (
    <div className="max-w-6xl mx-auto pb-16">
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
        <article className="space-y-0">
          {/* ── Title Page ────────────────────────────────── */}
          <div className="text-center py-12 sm:py-16 border-b border-default mb-10">
            <p className="text-xs font-semibold text-gold-600 uppercase tracking-widest mb-3">Student Activity Log</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-primary tracking-tight leading-tight">
              {studentName}&apos;s Journey
            </h1>
            <p className="text-base text-tertiary mt-3">
              {studentName}{course ? ` · ${course}` : ""}
            </p>
            <div className="flex items-center justify-center gap-4 mt-6 text-xs text-tertiary">
              <span>{timeline.length} entr{timeline.length === 1 ? "y" : "ies"}</span>
              <span className="text-slate-300">·</span>
              <span>{completed.length} consultations</span>
              {submissionCount > 0 && (
                <>
                  <span className="text-slate-300">·</span>
                  <span>{submissionCount} evaluation{submissionCount !== 1 ? "s" : ""}</span>
                </>
              )}
              <span className="text-slate-300">·</span>
              <span>{uniqueFaculty.length} facult{uniqueFaculty.length === 1 ? "y" : "ies"}</span>
              {timespan > 0 && (
                <>
                  <span className="text-slate-300">·</span>
                  <span>{timespan} day{timespan !== 1 ? "s" : ""}</span>
                </>
              )}
            </div>
          </div>

          {/* ── Foreword ──────────────────────────────────── */}
          <div className="prose prose-sm max-w-none text-secondary mb-12 px-1">
            <p>
              This report documents {firstName}&apos;s activity throughout {firstName.split(" ")[0]}&apos;s academic journey.
              {firstDate && <> It begins on <strong>{formatDate(firstDate)}</strong></>}
              {lastDate && firstDate !== lastDate && <> and spans through <strong>{formatDate(lastDate)}</strong></>}
              {timespan > 0 && <>, covering a period of <strong>{timespan} day{timespan !== 1 ? "s" : ""}</strong>.</>}
              {completed.length > 0 && <> Of the <strong>{appointments.length}</strong> consultation{appointments.length === 1 ? "" : "s"} conducted, <strong>{completed.length}</strong> {completed.length === 1 ? "has" : "have"} been completed.</>}
              {submissionCount > 0 && <> {firstName} also submitted <strong>{submissionCount}</strong> facult{submissionCount === 1 ? "y" : "ies"} evaluation{submissionCount !== 1 ? "s" : ""}.</>}
              {uniqueFaculty.length > 0 && <> {firstName} engaged with <strong>{uniqueFaculty.length}</strong> facult{uniqueFaculty.length === 1 ? "y" : "ies"} member{uniqueFaculty.length === 1 ? "" : "s"}.</>}
            </p>
          </div>

          {/* ── Narrative Entries ─────────────────────────── */}
          <div className="space-y-10">
            {timeline.map((item, i) => {
              const prev = i > 0 ? timeline[i - 1] : null
              const gap = prev ? daysBetween(prev.date, item.date) : 0
              const isEval = item.type === "evaluation"

              if (isEval) {
                const ev = item.data as HistoryEvaluation
                return (
                  <section key={ev.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.04}s` }}>
                    {gap > 1 && (
                      <div className="flex items-center gap-3 mb-5 text-xs text-tertiary">
                        <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                        <span className="italic">{gap} day{gap !== 1 ? "s" : ""} later</span>
                        <span className="flex-1 h-px bg-slate-200" />
                      </div>
                    )}
                    <div className="group relative pl-8 sm:pl-10">
                      <div className="absolute left-[11px] sm:left-[13px] top-0 bottom-0 w-px bg-slate-200" />
                      <div className="absolute left-0 sm:left-1 top-1 w-[23px] sm:w-[27px] h-[23px] sm:h-[27px] rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ring-4 ring-white z-10 bg-purple-500 text-white">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="pb-2">
                        <time className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                          {formatDateTime(ev.submittedAt)}
                        </time>
                        <div className="mt-4 space-y-4 text-sm text-secondary leading-relaxed">
                          <p>
                            {firstName} submitted a facult{firstName.split(" ")[0] ? "y" : ""} evaluation for <strong>{ev.facultyName}</strong>.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                )
              }

              const apt = item.data as HistoryAppointment
              const isCompleted = apt.status === "COMPLETED"

              return (
                <section key={apt.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.04}s` }}>
                  {/* Time gap indicator */}
                  {gap > 1 && (
                    <div className="flex items-center gap-3 mb-5 text-xs text-tertiary">
                      <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                      <span className="italic">{gap} day{gap !== 1 ? "s" : ""} later</span>
                      <span className="flex-1 h-px bg-slate-200" />
                    </div>
                  )}

                  {/* Entry */}
                  <div className="group relative pl-8 sm:pl-10">
                    {/* Vertical line */}
                    <div className="absolute left-[11px] sm:left-[13px] top-0 bottom-0 w-px bg-slate-200" />

                    {/* Clock dot */}
                    <div className={`absolute left-0 sm:left-1 top-1 w-[23px] sm:w-[27px] h-[23px] sm:h-[27px] rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ring-4 ring-white z-10 ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-300 text-white"
                    }`}>
                      <svg className={`w-3 h-3 ${isCompleted ? "" : "opacity-60"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="pb-2">
                      <time className="text-xs font-semibold text-gold-700 uppercase tracking-wider">
                        {formatDate(apt.date)}
                      </time>

                      <p className="text-sm text-tertiary mt-0.5">
                        {apt.startTime} – {apt.endTime}
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[8px] uppercase tracking-wider ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-700"
                            : apt.status === "APPROVED"
                              ? "bg-gold-100 text-gold-700"
                              : apt.status === "PENDING"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-surface text-tertiary"
                        }`}>
                          {apt.status}
                        </span>
                      </p>

                      <div className="mt-4 space-y-4 text-sm text-secondary leading-relaxed">
                        <p>
                          {firstName} met with <strong>{apt.faculty?.name || "a faculty member"}</strong>
                          {apt.title ? <> to discuss &ldquo;<em>{apt.title}</em>&rdquo;.</> : "."}
                        </p>

                        {apt.description && (
                          <div className="pl-4 border-l-2 border-default text-secondary">
                            <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-1">Topics discussed</p>
                            <p className="whitespace-pre-wrap">{apt.description}</p>
                          </div>
                        )}

                        {apt.actionTaken && (
                          <div className="pl-4 border-l-2 border-emerald-300 bg-emerald-50/50 -ml-0.5 p-3 rounded-r-lg">
                            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Faculty notes</p>
                            <p className="text-emerald-800 whitespace-pre-wrap">{apt.actionTaken}</p>
                          </div>
                        )}

                        {!apt.description && !apt.actionTaken && (
                          <p className="text-tertiary italic text-xs">No details recorded for this session.</p>
                        )}
                      </div>

                      <div className="mt-3">
                        <Link
                          href={`/student/meetings/${apt.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-gold-600 hover:text-gold-700 transition-colors"
                        >
                          Read full entry →
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>
              )
            })}
          </div>

          {/* ── Closing ───────────────────────────────────── */}
          <div className="mt-16 pt-10 border-t border-default">
            <div className="text-center max-w-lg mx-auto">
              <span className="text-3xl block mb-4">📖</span>
              <p className="text-sm text-secondary leading-relaxed">
                This concludes {firstName}&apos;s activity log.
                {completed.length < appointments.length
                  ? ` ${appointments.length - completed.length} consultation${appointments.length - completed.length === 1 ? "" : "s"} still pending.`
                  : " All consultations have been completed."}
                {submissionCount > 0 && ` ${submissionCount} evaluation${submissionCount !== 1 ? "s" : ""} submitted.`}
              </p>
              <p className="text-xs text-tertiary mt-2">
                {uniqueFaculty.length} facult{uniqueFaculty.length === 1 ? "y" : "ies"} · {appointments.length} consultation{appointments.length === 1 ? "" : "s"}
                {submissionCount > 0 && ` · ${submissionCount} evaluation${submissionCount !== 1 ? "s" : ""}`}
                {timespan > 0 ? ` · ${timespan} day${timespan !== 1 ? "s" : ""}` : ""}
              </p>
            </div>
          </div>
        </article>
      )}
    </div>
  )
}
