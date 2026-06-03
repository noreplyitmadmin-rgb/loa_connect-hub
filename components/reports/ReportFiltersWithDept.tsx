"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useCallback, useState } from "react"

interface DepartmentOption {
  id: string
  name: string
}

interface ReportFiltersWithDeptProps {
  departments: DepartmentOption[]
  selectedDepartmentId: string | null
  isDean?: boolean
}

export function ReportFiltersWithDept({
  departments,
  selectedDepartmentId,
  isDean = false,
}: ReportFiltersWithDeptProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "")
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "")
  const [deptId, setDeptId] = useState(selectedDepartmentId || "")

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams()
    if (startDate) params.set("startDate", startDate)
    if (endDate) params.set("endDate", endDate)
    if (status) params.set("status", status)
    if (deptId) params.set("departmentId", deptId)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }, [startDate, endDate, status, deptId, router, pathname])

  const clearFilters = useCallback(() => {
    setStartDate("")
    setEndDate("")
    setStatus("")
    setDeptId("")
    router.push(pathname)
  }, [router, pathname])

  const hasFilters = startDate || endDate || status || deptId

  return (
    <div className="flex flex-wrap items-end gap-4 p-5 bg-white rounded-2xl border border-slate-200/70 shadow-sm transition-all duration-200 hover:shadow-md">
      {/* Start Date */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500 transition-all"
        />
      </div>

      {/* End Date */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">End Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500 transition-all"
        />
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500 transition-all"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending / Approved</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Department */}
      {!isDean && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Department</label>
          <select
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500 transition-all min-w-[180px]"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Dean locked department indicator */}
      {isDean && departments.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Department</label>
          <div className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-500 bg-slate-50 min-w-[180px] flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {departments.find((d) => d.id === selectedDepartmentId)?.name || "My Department"}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={applyFilters}
          className="px-4 py-2 rounded-lg bg-gold-600 text-white text-sm font-semibold hover:bg-gold-700 transition-colors shadow-sm"
        >
          Apply Filters
        </button>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
