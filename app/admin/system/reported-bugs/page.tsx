"use client"

import { useState, useEffect, useCallback } from "react"
import LockedTab from "@/components/ui/LockedTab"
import ErrorState from "@/components/ui/ErrorState"
import ErrorBoundary from "@/components/ui/ErrorBoundary"

interface BugReport {
  id: string
  userId: string
  userEmail: string
  url: string
  description: string
  status: "open" | "resolved"
  createdAt: string
}

interface ListResponse {
  reports: BugReport[]
  total: number
  page: number
  pageSize: number
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    open: "bg-amber-50 text-amber-700 border-amber-200/50",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorMap[status] || "bg-surface text-secondary border-slate-200/50"}`}>
      {status}
    </span>
  )
}

export default function ReportedBugsPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [lockedEndpoint, setLockedEndpoint] = useState("")

  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 25

  const fetchReports = useCallback(async () => {
    setLoading(true)
    setErrorMessage("")
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      if (statusFilter) params.set("status", statusFilter)

      const res = await fetch(`/api/bug-reports?${params}`)
      if (res.status === 403) { setLockedEndpoint(`/api/bug-reports?${params}`); return }
      if (!res.ok) throw new Error("Failed to fetch bug reports")
      const json: ListResponse = await res.json()
      setData(json)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => { Promise.resolve().then(() => fetchReports()) }, [fetchReports])

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "open" ? "resolved" : "open"
    try {
      const res = await fetch(`/api/bug-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.status === 403) { setLockedEndpoint(`/api/bug-reports/${id}`); return }
      if (!res.ok) throw new Error("Failed to update status")
      fetchReports()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update status")
    }
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  if (lockedEndpoint) {
    return (
      <div className="w-full space-y-6 pb-12">
        <LockedTab endpoint={lockedEndpoint} />
      </div>
    )
  }

  return (
    <ErrorBoundary>
    {errorMessage ? (
      <ErrorState message={errorMessage} onRetry={() => { setErrorMessage(""); fetchReports() }} />
    ) : (
    <div className="w-full space-y-6 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-primary">Reported Bugs</h1>
        {data && (
          <p className="text-xs text-tertiary">
            <span className="font-semibold">{data.total}</span> total reports
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="input text-xs h-9 min-w-[130px]"
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        {statusFilter && (
          <button
            onClick={() => { setStatusFilter(""); setPage(1) }}
            className="px-3 py-2 text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto bg-surface tbl">
        {loading ? (
          <div className="p-8 text-center text-sm text-tertiary">Loading...</div>
        ) : !data || data.reports.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-tertiary">No bug reports found.</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Reported</th>
                  <th>User</th>
                  <th>Page URL</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th className="w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.reports.map((report) => (
                  <tr key={report.id}>
                    <td className="whitespace-nowrap text-xs text-tertiary font-medium tabular-nums">
                      {new Date(report.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="whitespace-nowrap text-xs text-secondary font-medium">
                      {report.userEmail}
                    </td>
                    <td className="text-xs text-blue-600 max-w-[200px] truncate">
                      <a href={report.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {report.url}
                      </a>
                    </td>
                    <td className="text-xs text-tertiary max-w-xs truncate">
                      {report.description}
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      <button
                        onClick={() => handleToggleStatus(report.id, report.status)}
                        className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                          report.status === "open"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/50 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-700 border-amber-200/50 hover:bg-amber-100"
                        }`}
                      >
                        {report.status === "open" ? "Resolve" : "Reopen"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-default bg-surface">
              <p className="text-xs text-tertiary">
                Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span> &middot; {data.total} total reports
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-hover rounded border border-default transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  &larr; Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-hover rounded border border-default transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    )}
    </ErrorBoundary>
  )
}
