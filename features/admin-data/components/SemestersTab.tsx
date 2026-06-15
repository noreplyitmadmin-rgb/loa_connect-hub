"use client"

import { useState, useEffect, useRef } from "react"
import { useApiGet, invalidate } from "@/lib/api/client"
import { SkeletonTable } from "@/components/ui/Skeleton"
import SubmitButton from "@/components/ui/SubmitButton"
import LockedTab from "@/components/ui/LockedTab"
import type { SemesterData } from "@/lib/types"

export function SemestersTab() {
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const showSuccessMessage = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(""), 4000)
  }

  const [newTitle, setNewTitle] = useState("")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [saving, setSaving] = useState(false)

  const [evalEditingId, setEvalEditingId] = useState<string | null>(null)
  const [editEvalStartDate, setEditEvalStartDate] = useState("")
  const [editEvalEndDate, setEditEvalEndDate] = useState("")

  const { data: semestersData, isLoading: semestersLoading, error: semestersErr } = useApiGet<{ data: SemesterData[] }>("/api/semesters")

  const semesters = semestersData?.data ?? []
  const loading = semestersLoading
  const fetchError = semestersErr
  const locked = (fetchError?.message?.includes("Forbidden") || fetchError?.message?.includes("API endpoint requires")) ? "/api/semesters" : ""

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle) return
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/semesters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      setNewTitle("")
      showSuccessMessage("Semester created!")
      invalidate("/api/semesters")
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleUpdate = async (id: string) => {
    if (!editTitle) return
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/semesters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      setEditingId(null)
      showSuccessMessage("Semester updated!")
      invalidate("/api/semesters")
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleStartEvaluation = async (id: string) => {
    if (!editEvalStartDate) return
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/semesters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evalStartDate: editEvalStartDate, evalEndDate: editEvalEndDate || null }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      setEvalEditingId(null)
      showSuccessMessage("Evaluation period started!")
      invalidate("/api/semesters")
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleEndEvaluation = async (id: string) => {
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/semesters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evalStartDate: null, evalEndDate: null }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      showSuccessMessage("Evaluation period ended!")
      invalidate("/api/semesters")
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const isEditing = editingId !== null
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isEditing) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setEditingId(null) }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [isEditing])

  useEffect(() => {
    if (!isEditing) return
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) setEditingId(null)
    }
    document.addEventListener("mousedown", handler, true)
    return () => document.removeEventListener("mousedown", handler, true)
  }, [isEditing])

  if (loading) return <div className="p-6"><SkeletonTable rows={4} cols={5} /></div>

  return (
    <div className="space-y-6">
      {locked && <LockedTab endpoint={locked} />}
      {!locked && (fetchError || error) && <p className="text-xs font-medium text-red-600 bg-red-50 p-3 rounded-lg">{(fetchError || error)?.message || (fetchError || error)}</p>}
      {success && <p className="text-xs font-medium text-green-600 bg-green-50 p-3 rounded-lg">{success}</p>}

      <form onSubmit={handleCreate} className="card p-6 bg-surface space-y-4">
        <h2 className="text-sm font-bold text-secondary">Add New Academic Semester</h2>
        <div>
          <label className="block text-xs font-semibold text-tertiary mb-1">Semester Name</label>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="e.g. 1st Semester A.Y. 2025-2026"
            required
          />
        </div>
        <p className="text-[11px] text-tertiary">
          Evaluation dates are managed inline — click <strong>Enable Evaluation</strong> on a semester to set start/end dates. Only semesters with evaluation dates can have active evaluations. New semesters start as inactive.
        </p>
        <div><SubmitButton type="submit" loading={saving} variant="primary">Create Semester</SubmitButton></div>
      </form>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div ref={modalRef} className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-primary">Edit Semester</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Semester Name</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-secondary hover:bg-slate-50 transition-colors">Cancel</button>
              <SubmitButton type="button" loading={saving} variant="primary" onClick={() => handleUpdate(editingId!)}>Save Changes</SubmitButton>
            </div>
          </div>
        </div>
      )}

      {evalEditingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-primary">Enable Evaluation</h2>
            </div>
            <p className="text-[11px] text-tertiary">Set the start and optional end date for this semester&apos;s evaluation period. Students can submit evaluations only within this window.</p>
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
              <button type="button" onClick={() => setEvalEditingId(null)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-secondary hover:bg-slate-50 transition-colors">Cancel</button>
              <SubmitButton type="button" loading={saving} variant="primary" onClick={() => handleStartEvaluation(evalEditingId!)}>Enable</SubmitButton>
            </div>
          </div>
        </div>
      )}

      <div className="card bg-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-default bg-surface"><h3 className="text-sm font-bold text-primary">Semesters Directory</h3></div>
        {semesters.length === 0 ? (
          <p className="text-xs text-tertiary p-6">No semesters configured yet.</p>
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
                  {semesters.map((semester) => (
                    <tr key={semester.id} className="border-b border-slate-50 hover:bg-surface-hover/70">
                      <td className="px-6 py-4 font-medium">{semester.title}</td>
                      <td className="px-6 py-4">{semester.evalStartDate}</td>
                      <td className="px-6 py-4">{semester.evalEndDate || <span className='text-tertiary'>N/A</span>}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${semester.isActive ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                          {semester.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-3 text-center">
                        <button onClick={() => { setEditTitle(semester.title); setEditingId(semester.id) }} className="text-xs font-bold text-amber-500 hover:text-amber-700">Edit</button>
                        {semester.evalStartDate ? (
                          <button onClick={() => handleEndEvaluation(semester.id)} className="text-xs font-bold text-red-500 hover:text-red-700">End Evaluation</button>
                        ) : (
                          <button onClick={() => { setEvalEditingId(semester.id); setEditEvalStartDate(semester.evalStartDate || ""); setEditEvalEndDate(semester.evalEndDate || "") }} className="text-xs font-bold text-emerald-600 hover:text-emerald-800">Enable Evaluation</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-only space-y-2 p-3">
              {semesters.map((semester) => (
                <div key={semester.id} className={`p-4 rounded-xl border ${semester.isActive ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50'}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div><p className="text-sm font-bold text-primary">{semester.title}</p><p className="text-xs font-mono font-semibold text-tertiary">{semester.id}</p></div>
                    <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${semester.isActive ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
                      {semester.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 mt-2">
                    <p className="text-tertiary">Period: {semester.evalStartDate} to {semester.evalEndDate || 'N/A'}</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => { setEditTitle(semester.title); setEditingId(semester.id) }} className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">Edit</button>
                    {semester.evalStartDate ? (
                      <button onClick={() => handleEndEvaluation(semester.id)} className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors bg-red-50 text-red-700 border-red-200 hover:bg-red-100">End Evaluation</button>
                    ) : (
                      <button onClick={() => { setEvalEditingId(semester.id); setEditEvalStartDate(semester.evalStartDate || ""); setEditEvalEndDate(semester.evalEndDate || "") }} className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">Enable Evaluation</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
