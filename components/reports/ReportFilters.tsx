"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useCallback, useState, useMemo } from "react"
import { getRecentSemesters } from "@/lib/utils/semester"
import type { SemesterInfo } from "@/lib/utils/semester"

export function ReportFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "")
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "")

  const presetSemesters = useMemo(() => getRecentSemesters(4), [])

  const applyFilters = useCallback(
    (overrides?: { startDate?: string; endDate?: string }) => {
      const params = new URLSearchParams()
      const sd = overrides?.startDate ?? startDate
      const ed = overrides?.endDate ?? endDate
      if (sd) params.set("startDate", sd)
      if (ed) params.set("endDate", ed)
      if (status) params.set("status", status)
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [startDate, endDate, status, router, pathname]
  )

  const handlePreset = useCallback(
    (sem: SemesterInfo) => {
      setStartDate(sem.startDate)
      setEndDate(sem.endDate)
      applyFilters({ startDate: sem.startDate, endDate: sem.endDate })
    },
    [applyFilters]
  )

  const clearFilters = useCallback(() => {
    setStartDate("")
    setEndDate("")
    setStatus("")
    router.push(pathname)
  }, [router, pathname])

  const hasFilters = startDate || endDate || status

  // Determine which preset matches current selection (if any)
  const activePresetLabel = useMemo(() => {
    if (!startDate || !endDate) return null
    return presetSemesters.find(
      (s) => s.startDate === startDate && s.endDate === endDate
    )?.label ?? null
  }, [startDate, endDate, presetSemesters])

  return (
    <div className="space-y-4">
      {/* ── Semester Presets ── */}
      {/* <div className="flex flex-wrap items-center gap-2 p-4 bg-white rounded-2xl border border-slate-200/70 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1">
          Semester:
        </span>
        {presetSemesters.map((sem) => {
          const isActive = activePresetLabel === sem.label
          return (
            <button
              key={sem.label}
              onClick={() => handlePreset(sem)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${isActive
                  ? "bg-gold-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                }`}
            >
              {sem.label}
            </button>
          )
        })}
        {hasFilters && !activePresetLabel && (
          <span className="text-xs text-slate-400 italic">(custom range)</span>
        )}
      </div> */}

      {/* ── Manual Date + Status Filters ── */}
      <div className="flex flex-wrap items-end gap-4 p-5 bg-white rounded-2xl border border-slate-200/70 shadow-sm transition-all duration-200 hover:shadow-md">
        {/* Start Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500 transition-all"
          />
        </div>

        {/* End Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500 transition-all"
          />
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Status
          </label>
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

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => applyFilters()}
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
    </div>
  )
}
