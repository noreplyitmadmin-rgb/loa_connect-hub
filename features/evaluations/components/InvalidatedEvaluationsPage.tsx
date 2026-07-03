"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { SkeletonTable } from "@/components/ui/Skeleton"
import LockedTab from "@/components/ui/LockedTab"
import { usePagination, Paginator } from "@/components/ui/Paginator"
import { SearchInput } from "@/features/admin-data/components/shared"

interface DisabledEval {
  id: string
  source: string | null
  status: "DRAFT" | "SUBMITTED"
  remarks: string | null
  createdAt: string
  updatedAt: string
  evaluator: { id: string; name: string; email: string } | null
  evaluatee: { id: string; name: string; email: string } | null
  faculty_subject: {
    id: string
    faculty: { id: string; name: string } | null
    subject: { id: string; code: string; name: string } | null
    section: { id: string; name: string; program: string } | null
  } | null
}

export default function InvalidatedEvaluationsPage() {
  const [data, setData] = useState<DisabledEval[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [locked, setLocked] = useState("")
  const [search, setSearch] = useState("")

  const fetchData = useCallback(async (isRefresh?: boolean) => {
    if (isRefresh) { setLoading(true); setError("") }
    try {
      const res = await fetch("/api/admin/evaluations/disabled")
      if (res.status === 403) { setLocked("/api/admin/evaluations/disabled"); return }
      if (!res.ok) throw new Error("Failed to load disabled evaluations")
      const json = await res.json()
      setData(json.evaluations)
    } catch (err) { setError(err instanceof Error ? err.message : "Unknown error") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { Promise.resolve().then(() => fetchData()) }, [fetchData])

  const filtered = useMemo(() => {
    if (!data) return []
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter((ev) =>
      ev.evaluator?.name.toLowerCase().includes(q) ||
      ev.evaluator?.email.toLowerCase().includes(q) ||
      ev.evaluatee?.name.toLowerCase().includes(q) ||
      ev.evaluatee?.email.toLowerCase().includes(q) ||
      ev.faculty_subject?.subject?.code.toLowerCase().includes(q) ||
      ev.faculty_subject?.subject?.name.toLowerCase().includes(q) ||
      `${ev.faculty_subject?.section?.program ?? ""}-${ev.faculty_subject?.section?.name ?? ""}`.toLowerCase().includes(q)
    )
  }, [data, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [filtered])

  const { page, totalPages, pageSize, paginatedItems, setPage, setPageSize } = usePagination(sorted, 25)

  if (locked) {
    return (
      <div className="w-full pb-12 px-4 sm:px-0">
        <LockedTab endpoint={locked} />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 pb-12 px-4 sm:px-0 animate-ios-slide-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-primary">Invalidated Evaluations</h1>
        <p className="text-xs sm:text-sm text-tertiary mt-0.5 sm:mt-1">
          Evaluations that have been disabled due to faculty re-assignment, disputes, or stale mappings.
        </p>
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      <div className="card p-4 sm:p-6 bg-surface space-y-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v) }} placeholder="Search by student, faculty, subject, or section..." />
        {loading && !data ? (
          <SkeletonTable rows={6} cols={6} />
        ) : sorted.length === 0 ? (
          <p className="text-xs text-tertiary text-center py-8">No invalidated evaluations found.</p>
        ) : (
          <>
            <div className="desktop-only max-h-96 overflow-y-auto tbl-container tbl">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Faculty (Evaluatee)</th>
                    <th>Subject</th>
                    <th>Section</th>
                    <th>Remarks</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((ev) => {
                    return (
                      <tr key={ev.id}>
                        <td className="font-medium text-secondary">{ev.evaluator?.name ?? <span className="text-tertiary italic">Deleted</span>}</td>
                        <td className="text-secondary">{ev.evaluatee?.name ?? <span className="text-tertiary italic">Deleted</span>}</td>
                        <td className="text-secondary">
                          {ev.faculty_subject?.subject
                            ? <>{ev.faculty_subject.subject.code} - {ev.faculty_subject.subject.name}</>
                            : <span className="text-tertiary italic">—</span>}
                        </td>
                        <td className="text-secondary">
                          {ev.faculty_subject?.section
                            ? <>{ev.faculty_subject.section.program}-{ev.faculty_subject.section.name}</>
                            : <span className="text-tertiary italic">—</span>}
                        </td>
                        <td>
                          <span className="text-xs text-tertiary">{ev.remarks ?? "—"}</span>
                        </td>
                        <td>
                          <span className={`badge-${ev.status === "SUBMITTED" ? "emerald" : "blue"}`}>{ev.status}</span>
                        </td>
                        <td className="text-tertiary text-xs whitespace-nowrap">
                          {new Date(ev.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="mobile-only space-y-2">
              {paginatedItems.map((ev) => {
                return (
                  <div key={ev.id} className="p-4 rounded-xl bg-surface border border-default">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-primary truncate">{ev.evaluator?.name ?? "Deleted student"}</p>
                        <p className="text-xs text-tertiary truncate">
                          {ev.evaluatee?.name ?? "Deleted faculty"}
                          {ev.faculty_subject?.subject ? <> · {ev.faculty_subject.subject.code}</> : ""}
                        </p>
                        <p className="text-xs text-tertiary truncate mt-0.5">
                          {ev.faculty_subject?.section
                            ? <>{ev.faculty_subject.section.program}-{ev.faculty_subject.section.name}</>
                            : "No section"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right flex flex-col items-end gap-1">
                        <span className="text-xs text-tertiary">{ev.remarks ?? "—"}</span>
                        <span className={`badge-${ev.status === "SUBMITTED" ? "emerald" : "blue"}`}>{ev.status}</span>
                        <span className="text-[11px] text-tertiary">{new Date(ev.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <Paginator page={page} totalPages={totalPages} pageSize={pageSize} totalItems={sorted.length} setPage={setPage} setPageSize={setPageSize} />
          </>
        )}
        {data && <p className="text-xs text-tertiary">{sorted.length} invalidated evaluation{sorted.length !== 1 ? "s" : ""}</p>}
      </div>
    </div>
  )
}
