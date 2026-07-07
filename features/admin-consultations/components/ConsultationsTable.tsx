"use client"

import { useState, useMemo } from "react"
import type { AdminConsultationRow } from "@/lib/types"

interface Props {
  consultations: AdminConsultationRow[]
  departments: { id: string; name: string }[]
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "badge-emerald",
  PENDING: "badge-amber",
  APPROVED: "badge-blue",
  REJECTED: "badge-red",
  CANCELLED: "bg-surface-tertiary text-tertiary",
}

const MEETING_TYPE_STYLES: Record<string, string> = {
  CONSULTATION: "badge-blue",
  INTERNAL: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
}

export default function ConsultationsTable({ consultations, departments }: Props) {
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [upcomingOnly, setUpcomingOnly] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const sevenDaysLater = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() + 7)
    return d
  }, [today])

  const filtered = useMemo(() => {
    let result = consultations

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.studentName.toLowerCase().includes(q) ||
          r.facultyName.toLowerCase().includes(q) ||
          r.departmentName.toLowerCase().includes(q) ||
          (r.title || "").toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q)
      )
    }

    if (deptFilter) {
      result = result.filter((r) => r.departmentId === deptFilter)
    }

    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter)
    }

    if (upcomingOnly) {
      result = result.filter((r) => {
        const d = new Date(r.date + "T00:00:00")
        return d >= today && d <= sevenDaysLater
      })
    }

    return result
  }, [consultations, search, deptFilter, statusFilter, upcomingOnly, today, sevenDaysLater])

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-2xl border border-default/70 bg-surface shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-tertiary mb-1.5 block">
              Search
            </label>
            <input
              type="text"
              placeholder="Student, faculty, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-secondary bg-surface border border-default placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500 transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-tertiary mb-1.5 block">
              Department
            </label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-lg text-sm text-secondary bg-surface border border-default focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500 transition-all"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-tertiary mb-1.5 block">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-lg text-sm text-secondary bg-surface border border-default focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500 transition-all"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="flex items-end pb-0.5">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-default text-sm text-secondary bg-surface cursor-pointer select-none hover:bg-surface-hover transition-colors">
              <input
                type="checkbox"
                checked={upcomingOnly}
                onChange={(e) => setUpcomingOnly(e.target.checked)}
                className="rounded border-default text-gold-600 focus:ring-gold-500/40"
              />
              Upcoming (7 days)
            </label>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-default/70 bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-muted">
                <th className="text-left px-4 py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-tertiary">Student</th>
                <th className="text-left px-4 py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-tertiary">Faculty</th>
                <th className="text-left px-4 py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-tertiary">Department</th>
                <th className="text-left px-4 py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-tertiary">Type</th>
                <th className="text-left px-4 py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-tertiary">Date / Time</th>
                <th className="text-left px-4 py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-tertiary">Status</th>
                <th className="text-left px-4 py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-tertiary">Teams</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="py-16 text-center">
                      <div className="w-14 h-14 bg-surface-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-primary mb-1">No consultations found</p>
                      <p className="text-xs text-tertiary">Try adjusting your search or filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const isExpanded = expandedRow === row.id
                  return (
                    <tr key={row.id} className="border-b border-default last:border-0 hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-primary">{row.studentName}</td>
                      <td className="px-4 py-3 text-sm text-secondary">{row.facultyName}</td>
                      <td className="px-4 py-3 text-sm text-secondary">{row.departmentName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${MEETING_TYPE_STYLES[row.meetingType] || "bg-surface-tertiary text-tertiary"}`}>
                          {row.meetingType === "INTERNAL" ? "Internal" : "Consultation"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary whitespace-nowrap">
                        {row.date}
                        <span className="text-tertiary ml-1">
                          {row.startTime?.slice(0, 5)}
                          {row.endTime ? ` - ${row.endTime.slice(0, 5)}` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[row.status] || "bg-surface-tertiary text-tertiary"}`}>
                          {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.teamsLink ? (
                          <a
                            href={row.teamsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gold-600 hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300 underline text-xs font-medium"
                          >
                            Open
                          </a>
                        ) : (
                          <span className="text-tertiary text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpandedRow(isExpanded ? null : row.id)}
                          className="p-1 text-tertiary hover:text-secondary transition-colors rounded-lg hover:bg-surface-hover"
                        >
                          <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded details */}
      {expandedRow && (
        <div className="rounded-2xl border border-default/70 bg-surface shadow-sm p-6 space-y-4 animate-fade-in">
          {(() => {
            const row = filtered.find((r) => r.id === expandedRow)
            if (!row) return null
            return (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-primary">Consultation Details</h3>
                  <button
                    type="button"
                    onClick={() => setExpandedRow(null)}
                    className="text-xs font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
                <div className="h-px bg-default -mx-6" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {row.title && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">Title</span>
                      <p className="text-primary mt-0.5">{row.title}</p>
                    </div>
                  )}
                  {row.description && (
                    <div className="sm:col-span-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">Description</span>
                      <p className="text-primary mt-0.5 whitespace-pre-wrap">{row.description}</p>
                    </div>
                  )}
                  {row.actionTaken && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">Action Taken</span>
                      <p className="text-primary mt-0.5">{row.actionTaken}</p>
                    </div>
                  )}
                  {row.additionalRemarks && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">Additional Remarks</span>
                      <p className="text-primary mt-0.5">{row.additionalRemarks}</p>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
