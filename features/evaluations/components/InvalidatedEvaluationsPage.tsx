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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

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

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const pageIds = paginatedItems.map((ev) => ev.id)
      const allSelected = pageIds.every((id) => prev.has(id))
      if (allSelected) {
        const next = new Set(prev)
        pageIds.forEach((id) => next.delete(id))
        return next
      } else {
        const next = new Set(prev)
        pageIds.forEach((id) => next.add(id))
        return next
      }
    })
  }, [paginatedItems])

  const deleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected invalidated evaluation${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch("/api/admin/evaluations/disabled", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds] }),
      })
      if (res.status === 403) { setLocked("/api/admin/evaluations/disabled"); return }
      if (!res.ok) throw new Error("Failed to delete")
      setSelectedIds(new Set())
      setDeleting(false)
      fetchData(true)
    } catch {
      setDeleting(false)
      setError("Failed to delete selected evaluations")
    }
  }, [selectedIds, fetchData])

  // Add ability to move an invalidated evaluation back to active (restore)
  const restoreSelected = useCallback(async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Restore ${selectedIds.size} selected evaluation${selectedIds.size > 1 ? "s" : ""}?`)) return
    try {
      const res = await fetch("/api/admin/evaluations/disabled/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds] }),
      })
      if (res.status === 403) { setLocked("/api/admin/evaluations/disabled"); return }
      if (!res.ok) throw new Error("Failed to restore")
      setSelectedIds(new Set())
      fetchData(true)
    } catch {
      setError("Failed to restore selected evaluations")
    }
  }, [selectedIds, fetchData])

  const deleteAll = useCallback(async () => {
    if (!sorted.length) return
    if (!confirm(`Delete ALL ${sorted.length} invalidated evaluation${sorted.length > 1 ? "s" : ""}? This cannot be undone.`)) return
    if (!confirm("Are you sure? This action cannot be undone.")) return
    setDeleting(true)
    try {
      const res = await fetch("/api/admin/evaluations/disabled", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      if (res.status === 403) { setLocked("/api/admin/evaluations/disabled"); return }
      if (!res.ok) throw new Error("Failed to delete")
      setSelectedIds(new Set())
      setDeleting(false)
      fetchData(true)
    } catch {
      setDeleting(false)
      setError("Failed to delete all evaluations")
    }
  }, [sorted.length, fetchData])

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
        <div className="flex items-center gap-2 flex-wrap">
          <SearchInput value={search} onChange={(v) => { setSearch(v) }} placeholder="Search by student, faculty, subject, or section..." />
          {sorted.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              {selectedIds.size > 0 && (
                <button
                  onClick={deleteSelected}
                  disabled={deleting}
                  className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 px-3 py-1.5 rounded-full transition-colors disabled:opacity-40"
                >
                  {deleting ? "Deleting..." : `Delete Selected (${selectedIds.size})`}
                </button>
              )}
              <button
                onClick={deleteAll}
                disabled={deleting}
                className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 px-3 py-1.5 rounded-full transition-colors disabled:opacity-40"
              >
                {deleting ? "Deleting..." : "Delete All"}
              </button>
            </div>
          )}
        </div>
        {loading && !data ? (
          <SkeletonTable rows={6} cols={7} />
        ) : sorted.length === 0 ? (
          <p className="text-xs text-tertiary text-center py-8">No invalidated evaluations found.</p>
        ) : (
          <>
            <div className="desktop-only max-h-96 overflow-y-auto tbl-container tbl">
              <table>
                <thead>
                  <tr>
                    <th className="w-10">
                      <input
                        type="checkbox"
                        checked={paginatedItems.length > 0 && paginatedItems.every((ev) => selectedIds.has(ev.id))}
                        onChange={toggleSelectAll}
                        className="accent-gold-600"
                      />
                    </th>
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
                      <tr key={ev.id} className={`${selectedIds.has(ev.id) ? "bg-gold-50 dark:bg-gold-900/10" : ""}`}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(ev.id)}
                            onChange={() => toggleSelect(ev.id)}
                            className="accent-gold-600"
                          />
                        </td>
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
                const selected = selectedIds.has(ev.id)
                return (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-xl bg-surface border border-default ${selected ? "ring-2 ring-gold-500/50 bg-gold-50 dark:bg-gold-900/10" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelect(ev.id)}
                            className="accent-gold-600 shrink-0"
                          />
                          <p className="text-sm font-bold text-primary truncate">{ev.evaluator?.name ?? "Deleted student"}</p>
                        </div>
                        <p className="text-xs text-tertiary truncate mt-1 ml-6">
                          {ev.evaluatee?.name ?? "Deleted faculty"}
                          {ev.faculty_subject?.subject ? <> · {ev.faculty_subject.subject.code}</> : ""}
                        </p>
                        <p className="text-xs text-tertiary truncate mt-0.5 ml-6">
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
