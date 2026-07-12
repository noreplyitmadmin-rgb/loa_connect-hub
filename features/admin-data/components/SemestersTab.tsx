"use client"

import { useState, useEffect, useRef } from "react"
import { useApiGet, invalidate } from "@/lib/api/client"

const INVALIDATE_KEYS = ["/api/semesters", "/api/semesters/count-active", "/api/evaluation-periods"]
import { SkeletonTable } from "@/components/ui/Skeleton"
import IosButton from "@/components/ui/IosButton"
import LockedTab from "@/components/ui/LockedTab"
import type { SemesterData } from "@/lib/types"

interface Impacts {
  facultySubjects: number
  enrollments: number
  evaluations: number
  results: number
  sections: number
}

interface EvaluationPeriod {
  id: string
  semesterId: string
  name: string
  source: string | null
  startDate: string
  endDate: string | null
  isActive: boolean
  createdAt: string
  semesterTitle?: string
}

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

  const [periodModalSemesterId, setPeriodModalSemesterId] = useState<string | null>(null)
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null)
  const todayStr = new Date().toISOString().split("T")[0]
  const [periodName, setPeriodName] = useState("")
  const [periodSource, setPeriodSource] = useState("")
  const [periodStartDate, setPeriodStartDate] = useState(todayStr)
  const [periodEndDate, setPeriodEndDate] = useState("")

  const [activateTarget, setActivateTarget] = useState<string | null>(null)
  const [impacts, setImpacts] = useState<Impacts | null>(null)
  const [loadingImpacts, setLoadingImpacts] = useState(false)

  const { data: semestersData, isLoading: semestersLoading, error: semestersErr } = useApiGet<{ data: SemesterData[] }>("/api/semesters")
  const { data: periodsData } = useApiGet<{ periods: EvaluationPeriod[] }>("/api/evaluation-periods")

  const semesters = semestersData?.data ?? []
  const periods = periodsData?.periods ?? []
  const activeCount = semesters.filter((s) => s.isActive).length
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
      invalidate(...INVALIDATE_KEYS)
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
      invalidate(...INVALIDATE_KEYS)
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleCreatePeriod = async (semesterId: string) => {
    if (!periodName || !periodStartDate) return

    const start = new Date(periodStartDate + "T00:00:00")
    if (periodEndDate) {
      const end = new Date(periodEndDate + "T00:00:00")
      if (end <= start) {
        setError("End date must be after the start date")
        return
      }
    }

    setSaving(true); setError("")
    try {
      const res = await fetch("/api/evaluation-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semesterId,
          name: periodName,
          source: periodSource || null,
          startDate: periodStartDate,
          endDate: periodEndDate || null,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      setPeriodModalSemesterId(null)
      setPeriodName("")
      setPeriodSource("")
      setPeriodStartDate(todayStr)
      setPeriodEndDate("")
      showSuccessMessage("Evaluation period created!")
      invalidate(...INVALIDATE_KEYS)
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleUpdatePeriod = async (periodId: string) => {
    if (!periodName || !periodStartDate) return

    const start = new Date(periodStartDate + "T00:00:00")
    if (periodEndDate) {
      const end = new Date(periodEndDate + "T00:00:00")
      if (end <= start) {
        setError("End date must be after the start date")
        return
      }
    }

    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/evaluation-periods/${periodId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: periodName,
          source: periodSource || null,
          startDate: periodStartDate,
          endDate: periodEndDate || null,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      setPeriodModalSemesterId(null)
      setEditingPeriodId(null)
      setPeriodName("")
      setPeriodSource("")
      setPeriodStartDate(todayStr)
      setPeriodEndDate("")
      showSuccessMessage("Evaluation period updated!")
      invalidate(...INVALIDATE_KEYS)
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleActivatePeriod = async (id: string) => {
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/evaluation-periods/${id}/activate`, { method: "POST" })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      showSuccessMessage("Evaluation period activated!")
      invalidate(...INVALIDATE_KEYS)
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleDeactivatePeriod = async (id: string) => {
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/evaluation-periods/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      showSuccessMessage("Evaluation period deactivated!")
      invalidate(...INVALIDATE_KEYS)
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleDeletePeriod = async (id: string) => {
    if (!confirm("Delete this evaluation period? This will also remove associated rubrics.")) return
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/evaluation-periods/${id}`, { method: "DELETE" })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      showSuccessMessage("Evaluation period deleted!")
      invalidate(...INVALIDATE_KEYS)
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleActivate = async (id: string) => {
    setSaving(true); setError(""); setActivateTarget(null); setImpacts(null)
    try {
      const res = await fetch(`/api/semesters/${id}`, { method: "POST" })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      showSuccessMessage("Semester activated!")
      invalidate(...INVALIDATE_KEYS)
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleDeactivate = async (id: string) => {
    if (activeCount <= 1) return
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/semesters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      showSuccessMessage("Semester deactivated!")
      invalidate(...INVALIDATE_KEYS)
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const promptActivate = async (id: string) => {
    if (activeCount === 0) {
      await handleActivate(id)
      return
    }
    setActivateTarget(id)
    setImpacts(null)
    setLoadingImpacts(true)
    try {
      const res = await fetch(`/api/semesters/${id}/impacts`)
      if (res.ok) {
        const data = await res.json()
        setImpacts(data)
      }
    } catch { /* ignore */ }
    setLoadingImpacts(false)
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
          Evaluation periods are managed separately below. Create an evaluation period under a semester to set start/end dates and source tags. New semesters start as inactive.
        </p>
        <div><IosButton type="submit" loading={saving} variant="primary">Create Semester</IosButton></div>
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
              <IosButton variant="gray" onClick={() => setEditingId(null)}>Cancel</IosButton>
              <IosButton type="button" loading={saving} variant="primary" onClick={() => handleUpdate(editingId!)}>Save Changes</IosButton>
            </div>
          </div>
        </div>
      )}

      {activateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-primary">Activate Semester</h2>
            </div>
            <div className="space-y-3 text-xs text-tertiary">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                <p className="font-semibold text-amber-800">This will:</p>
                <ul className="list-disc list-inside space-y-1 text-amber-700">
                  <li>Set all other active semesters as inactive</li>
                  <li>Set this semester as the active semester</li>
                </ul>
              </div>
              <p className="font-medium text-primary">Proceed with caution.</p>
              <p>This change affects everything that depends on the active semester — consultations, reports, and dashboards will switch to reference this semester. No data will be deleted.</p>
              {loadingImpacts ? (
                <p className="text-tertiary">Loading related data counts...</p>
              ) : impacts ? (
                <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                  <p className="font-semibold text-primary">Affected data in this semester:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="text-tertiary">Faculty-Subject mappings:</span><span className="font-semibold text-right">{impacts.facultySubjects}</span>
                    <span className="text-tertiary">Student Enrollments:</span><span className="font-semibold text-right">{impacts.enrollments}</span>
                    <span className="text-tertiary">Sections:</span><span className="font-semibold text-right">{impacts.sections}</span>
                    <span className="text-tertiary">Evaluations:</span><span className="font-semibold text-right">{impacts.evaluations}</span>
                    <span className="text-tertiary">Evaluation Results:</span><span className="font-semibold text-right">{impacts.results}</span>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <IosButton variant="gray" onClick={() => { setActivateTarget(null); setImpacts(null) }}>Cancel</IosButton>
              <IosButton type="button" loading={saving} variant="primary" onClick={() => handleActivate(activateTarget)}>Confirm Activation</IosButton>
            </div>
          </div>
        </div>
      )}

      {periodModalSemesterId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-primary">{editingPeriodId ? "Edit Evaluation Period" : "Create Evaluation Period"}</h2>
            </div>
            <p className="text-[11px] text-tertiary">Define an evaluation phase (e.g., Pre-Semester, Midterm, Post-Semester) under this semester. Students can submit evaluations within the date window.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Period Name</label>
                <input
                  value={periodName}
                  onChange={(e) => setPeriodName(e.target.value)}
                  className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="e.g. Pre-Semester Evaluation"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Source Tag (Optional)</label>
                <input
                  value={periodSource}
                  onChange={(e) => setPeriodSource(e.target.value)}
                  className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="e.g. pre-sem, midterm, post-sem"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Start Date</label>
                <input
                  type="date"
                  value={periodStartDate}
                  onChange={(e) => setPeriodStartDate(e.target.value)}
                  min={todayStr}
                  className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">End Date (Optional)</label>
                <input
                  type="date"
                  value={periodEndDate}
                  onChange={(e) => setPeriodEndDate(e.target.value)}
                  min={periodStartDate || undefined}
                  className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <IosButton variant="gray" onClick={() => { setPeriodModalSemesterId(null); setEditingPeriodId(null); setPeriodName(""); setPeriodSource(""); setPeriodStartDate(todayStr); setPeriodEndDate("") }}>Cancel</IosButton>
              {editingPeriodId ? (
                <IosButton type="button" loading={saving} variant="primary" onClick={() => handleUpdatePeriod(editingPeriodId)}>Save Changes</IosButton>
              ) : (
                <IosButton type="button" loading={saving} variant="primary" onClick={() => handleCreatePeriod(periodModalSemesterId)}>Create Period</IosButton>
              )}
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
            <div className="desktop-only tbl">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {semesters.map((semester) => (
                    <tr key={semester.id}>
                      <td className="font-medium">{semester.title}</td>
                      <td>
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${semester.isActive ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                          {semester.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-3 text-center">
                        <IosButton variant="plain" size="xs" onClick={() => { setEditTitle(semester.title); setEditingId(semester.id) }}>Edit</IosButton>
                        {semester.isActive ? (
                          <IosButton
                            variant="plain" size="xs"
                            disabled={activeCount <= 1}
                            onClick={() => handleDeactivate(semester.id)}
                            className={activeCount <= 1 ? "!text-tertiary/40" : "!text-red-500"}
                          >
                            Disable
                          </IosButton>
                        ) : (
                          <IosButton variant="plain" size="xs" onClick={() => promptActivate(semester.id)} className="!text-green-600">
                            Enable
                          </IosButton>
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
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <IosButton variant="tinted" size="sm" onClick={() => { setEditTitle(semester.title); setEditingId(semester.id) }} className="flex-1">Edit</IosButton>
                    {semester.isActive ? (
                      <IosButton
                        variant="destructive" size="sm"
                        disabled={activeCount <= 1}
                        onClick={() => handleDeactivate(semester.id)}
                        className="flex-1"
                      >
                        Disable
                      </IosButton>
                    ) : (
                      <IosButton variant="success" size="sm" onClick={() => promptActivate(semester.id)} className="flex-1">
                        Enable
                      </IosButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card bg-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-default bg-surface flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary">Evaluation Periods</h3>
          <IosButton variant="tinted" size="sm" onClick={() => {
            if (semesters.length > 0) {
              const activeSemester = semesters.find((s) => s.isActive) || semesters[0]
              setEditingPeriodId(null)
              setPeriodModalSemesterId(activeSemester.id)
              setPeriodName("")
              setPeriodSource("")
              setPeriodStartDate(todayStr)
              setPeriodEndDate("")
            }
          }} disabled={semesters.length === 0}>Add Period</IosButton>
        </div>
        {periods.length === 0 ? (
          <p className="text-xs text-tertiary p-6">No evaluation periods configured yet. Create one above to start collecting evaluations.</p>
        ) : (
          <>
            <div className="desktop-only tbl">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Semester</th>
                    <th>Source</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => {
                    const sem = semesters.find((s) => s.id === period.semesterId)
                    return (
                      <tr key={period.id}>
                        <td className="font-medium">{period.name}</td>
                        <td className="text-xs text-tertiary">{period.semesterTitle || sem?.title || period.semesterId}</td>
                        <td className="text-xs text-tertiary">{period.source || "—"}</td>
                        <td className="text-xs">{period.startDate}</td>
                        <td className="text-xs">{period.endDate || <span className="text-tertiary">N/A</span>}</td>
                        <td>
                          <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${period.isActive ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                            {period.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 space-x-2 text-center">
                          <IosButton variant="plain" size="xs" onClick={() => { setEditingPeriodId(period.id); setPeriodModalSemesterId(period.semesterId); setPeriodName(period.name); setPeriodSource(period.source || ""); setPeriodStartDate(period.startDate); setPeriodEndDate(period.endDate || ""); }}>
                            Edit
                          </IosButton>
                          {period.isActive ? (
                            <IosButton variant="plain" size="xs" className="!text-red-500" onClick={() => handleDeactivatePeriod(period.id)}>
                              Disable
                            </IosButton>
                          ) : (
                            <IosButton variant="plain" size="xs" className="!text-green-600" onClick={() => handleActivatePeriod(period.id)}>
                              Activate
                            </IosButton>
                          )}
                          <IosButton variant="plain" size="xs" className="!text-red-500" onClick={() => handleDeletePeriod(period.id)}>
                            Delete
                          </IosButton>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="mobile-only space-y-2 p-3">
              {periods.map((period) => {
                const sem = semesters.find((s) => s.id === period.semesterId)
                return (
                  <div key={period.id} className={`p-4 rounded-xl border ${period.isActive ? 'border-green-300 bg-green-50/50' : 'border-default bg-surface'}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-sm font-bold text-primary">{period.name}</p>
                        <p className="text-xs text-tertiary">{sem?.title || period.semesterId}</p>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${period.isActive ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
                        {period.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="text-xs space-y-1 mt-2">
                      {period.source && <p className="text-tertiary">Source: {period.source}</p>}
                      <p className="text-tertiary">Period: {period.startDate} to {period.endDate || 'N/A'}</p>
                    </div>
                    <div className="flex gap-2 pt-2 flex-wrap">
                      {period.isActive ? (
                        <IosButton variant="destructive" size="sm" onClick={() => handleDeactivatePeriod(period.id)} className="flex-1">Disable</IosButton>
                      ) : (
                        <IosButton variant="success" size="sm" onClick={() => handleActivatePeriod(period.id)} className="flex-1">Activate</IosButton>
                      )}
                      <IosButton variant="destructive" size="sm" onClick={() => handleDeletePeriod(period.id)} className="flex-1">Delete</IosButton>
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
