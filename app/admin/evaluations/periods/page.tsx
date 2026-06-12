"use client"

import { useState, useEffect, useRef } from "react"
import SubmitButton from "@/components/SubmitButton"
import { useApiGet, invalidate } from "@/lib/api/client"

interface PeriodData {
  id: string
  title: string
  evalStartDate: string
  evalEndDate: string | null
  isActive: boolean
  createdAt: string
}

export default function AdminEvaluationPeriodsPage() {
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const showSuccessMessage = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(""), 4000)
  }

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editEvalStartDate, setEditEvalStartDate] = useState("")
  const [editEvalEndDate, setEditEvalEndDate] = useState("")

  const [saving, setSaving] = useState(false)

  const { data: periodsData, isLoading: periodsLoading, error: periodsErr } = useApiGet<{ periods: PeriodData[] }>("/api/admin/evaluation-periods")

  const periods = periodsData?.periods ?? []
  const loading = periodsLoading
  const fetchError = periodsErr

  const handleUpdate = async (id: string) => {
    if (!editEvalStartDate) return
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/admin/evaluation-periods/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evalStartDate: editEvalStartDate, evalEndDate: editEvalEndDate || null }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      setEditingId(null)
      showSuccessMessage("Period updated!")
      invalidate("/api/admin/evaluation-periods")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleEndPeriod = async (id: string) => {
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/admin/evaluation-periods/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evalStartDate: null, evalEndDate: null }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      showSuccessMessage("Period ended!")
      invalidate("/api/admin/evaluation-periods")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const isPeriodActive = (period: PeriodData) => period.isActive

  const isEditing = editingId !== null
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isEditing) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditingId(null)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [isEditing])

  useEffect(() => {
    if (!isEditing) return
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setEditingId(null)
      }
    }
    document.addEventListener("mousedown", handler, true)
    return () => document.removeEventListener("mousedown", handler, true)
  }, [isEditing])

  if (loading) {
    return <div className="text-sm text-tertiary p-8">Loading evaluation periods...</div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-12">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary">Evaluation Periods</h1>
          <p className="text-xs sm:text-sm text-tertiary mt-0.5 sm:mt-1">
            Evaluation periods are created via <strong>Semesters</strong>. This page lets you set start and end dates for each period and activate one period to mark it as current. Only one period can be active at a time. Use the actions below to edit dates or activate a period.
          </p>
        </div>
      </div>

      {(fetchError || error) && <p className="text-xs font-medium text-red-600 bg-red-50 p-3 rounded-lg">{fetchError || error}</p>}
      {success && <p className="text-xs font-medium text-green-600 bg-green-50 p-3 rounded-lg">{success}</p>}

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div ref={modalRef} className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-primary">Edit Period Dates</h2>

            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Start Date</label>
                <input
                  type="date"
                  value={editEvalStartDate}
                  onChange={(e) => setEditEvalStartDate(e.target.value)}
                  className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">End Date (Optional)</label>
                <input
                  type="date"
                  value={editEvalEndDate}
                  onChange={(e) => setEditEvalEndDate(e.target.value)}
                  className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-secondary hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <SubmitButton type="button" loading={saving} variant="primary" onClick={() => handleUpdate(editingId!)}>
                Save Changes
              </SubmitButton>
            </div>
          </div>
        </div>
      )}

      <div className="card bg-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-default bg-surface">
          <h3 className="text-sm font-bold text-primary">Periods Directory</h3>
        </div>
        {periods.length === 0 ? (
          <p className="text-xs text-tertiary p-6">No evaluation periods configured yet.</p>
        ) : (
          <>
            <div className="desktop-only">
              <table className="w-full text-sm">
                <thead className="border-b border-default text-left text-xs font-semibold text-tertiary uppercase tracking-wider bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Start Date</th>
                    <th className="px-6 py-3">End Date</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => (
                    <tr key={period.id} className="border-b border-slate-50 hover:bg-surface-hover/70">
                      <td className="px-6 py-4 font-medium">{period.title}</td>
                      <td className="px-6 py-4">{period.evalStartDate}</td>
                      <td className="px-6 py-4">{period.evalEndDate || <span className='text-tertiary'>N/A</span>}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${isPeriodActive(period)
                            ? "bg-green-50 text-green-600 border border-green-200"
                            : "bg-red-50 text-red-600 border border-red-200"
                            }`}
                        >
                          {period.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-3 text-center">

                        <SubmitButton
                          onClick={() => setEditingId(period.id)}
                          variant="primary"
                          className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                        >
                          Edit
                        </SubmitButton>

                        {period.isActive && (
                          <SubmitButton
                            onClick={() => handleEndPeriod(period.id)}
                            variant="danger"
                            className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                          >
                            End Evaluation Period
                          </SubmitButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-only space-y-2 p-3">
              {periods.map((period) => {
                const isActive = period.isActive
                return (
                  <div key={period.id} className={`p-4 rounded-xl border ${isActive ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50'}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-sm font-bold text-primary">{period.title}</p>
                        <p className="text-xs font-mono font-semibold text-tertiary">{period.id}</p>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${isActive ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                        }`}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="text-xs space-y-1 mt-2">
                      <p className="text-tertiary">Period: {period.evalStartDate} to {period.evalEndDate || 'N/A'}</p>
                    </div>
                    <div className="flex gap-2 pt-2">

                      <SubmitButton
                        onClick={() => setEditingId(period.id)}
                        variant="primary"
                        className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                      >
                        Edit
                      </SubmitButton>

                      {isActive && (
                        <SubmitButton
                          onClick={() => handleEndPeriod(period.id)}
                          variant="danger"
                          className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                        >
                          End Evaluation Period
                        </SubmitButton>
                      )}

                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
