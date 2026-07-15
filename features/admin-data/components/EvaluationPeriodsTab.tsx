"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useApiGet, invalidate } from "@/lib/api/client"
import { SkeletonTable } from "@/components/ui/Skeleton"
import IosButton from "@/components/ui/IosButton"
import LockedTab from "@/components/ui/LockedTab"
import Alert from "@/components/ui/Alert"
import type { EvaluationPeriodData, SemesterData, RubricGroupData, RubricGroupWithCategories } from "@/lib/types"

const INVALIDATE_KEYS = ["/api/evaluation-periods"]

export function EvaluationPeriodsTab() {
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const showSuccessMessage = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(""), 4000)
  }

  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const todayStr = new Date().toISOString().split("T")[0]
  const [formName, setFormName] = useState("")
  const [formSource, setFormSource] = useState("")
  const [formStartDate, setFormStartDate] = useState(todayStr)
  const [formEndDate, setFormEndDate] = useState("")
  const [formSemesterId, setFormSemesterId] = useState("")
  const [formRubricGroupId, setFormRubricGroupId] = useState<string | null>(null)

  const [previewGroup, setPreviewGroup] = useState<RubricGroupWithCategories | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const [confirmAlert, setConfirmAlert] = useState<{ open: boolean; title: string; message: string; destructive: boolean; onConfirm: () => void }>({
    open: false, title: "", message: "", destructive: false, onConfirm: () => {},
  })

  const { data: periodsData, isLoading: periodsLoading, error: periodsErr } = useApiGet<{ periods: EvaluationPeriodData[] }>("/api/evaluation-periods")
  const { data: semestersData } = useApiGet<{ data: SemesterData[] }>("/api/semesters")
  const { data: groupsData } = useApiGet<{ groups: RubricGroupData[] }>("/api/rubric-groups")

  const periods = periodsData?.periods ?? []
  const semesters = semestersData?.data ?? []
  const groups = groupsData?.groups ?? []

  const loading = periodsLoading
  const fetchError = periodsErr
  const locked = (fetchError?.message?.includes("Forbidden") || fetchError?.message?.includes("API endpoint requires")) ? "/api/evaluation-periods" : ""

  const loadPreview = useCallback(async (groupId: string | null) => {
    if (!groupId) { setPreviewGroup(null); return }
    setLoadingPreview(true)
    try {
      const res = await fetch(`/api/rubric-groups/${groupId}`)
      if (res.ok) {
        const data = await res.json()
        setPreviewGroup(data.group)
      }
    } catch { /* ignore */ }
    setLoadingPreview(false)
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => loadPreview(formRubricGroupId))
  }, [formRubricGroupId, loadPreview])

  const openCreateModal = () => {
    setEditingId(null)
    setFormName("")
    setFormSource("")
    setFormStartDate(todayStr)
    setFormEndDate("")
    setFormSemesterId(semesters.find((s) => s.isActive)?.id || semesters[0]?.id || "")
    setFormRubricGroupId(null)
    setPreviewGroup(null)
    setShowModal(true)
  }

  const openEditModal = (period: EvaluationPeriodData) => {
    setEditingId(period.id)
    setFormName(period.name)
    setFormSource(period.source || "")
    setFormStartDate(period.startDate || todayStr)
    setFormEndDate(period.endDate || "")
    setFormSemesterId(period.semesterId)
    setFormRubricGroupId(period.rubricGroupId || null)
    setShowModal(true)
  }

  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditingId(null)
    setFormName("")
    setFormSource("")
    setFormStartDate(todayStr)
    setFormEndDate("")
    setFormSemesterId("")
    setFormRubricGroupId(null)
    setPreviewGroup(null)
  }, [todayStr])

  const handleSubmit = async () => {
    if (!formName || !formStartDate || !formSemesterId) return

    const start = new Date(formStartDate + "T00:00:00")
    if (formEndDate) {
      const end = new Date(formEndDate + "T00:00:00")
      if (end <= start) { setError("End date must be after the start date"); return }
    }

    setSaving(true); setError("")
    try {
      const url = editingId ? `/api/evaluation-periods/${editingId}` : "/api/evaluation-periods"
      const method = editingId ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semesterId: formSemesterId,
          name: formName,
          source: formSource || null,
          startDate: formStartDate,
          endDate: formEndDate || null,
          rubricGroupId: formRubricGroupId || null,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      closeModal()
      showSuccessMessage(editingId ? "Evaluation period updated!" : "Evaluation period created!")
      invalidate(...INVALIDATE_KEYS)
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleActivate = async (id: string) => {
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/evaluation-periods/${id}/activate`, { method: "POST" })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      showSuccessMessage("Evaluation period activated!")
      invalidate(...INVALIDATE_KEYS)
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleDeactivate = async (id: string) => {
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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this evaluation period?")) return
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/evaluation-periods/${id}`, { method: "DELETE" })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      showSuccessMessage("Evaluation period deleted!")
      invalidate(...INVALIDATE_KEYS)
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const modalRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!showModal) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [showModal, closeModal])

  useEffect(() => {
    if (!showModal) return
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) closeModal()
    }
    document.addEventListener("mousedown", handler, true)
    return () => document.removeEventListener("mousedown", handler, true)
  }, [showModal, closeModal])

  if (loading) return <div className="p-6"><SkeletonTable rows={4} cols={6} /></div>

  return (
    <div className="space-y-6">
      {locked && <LockedTab endpoint={locked} />}
      {!locked && (fetchError || error) && <p className="text-xs font-medium text-red-600 bg-red-50 p-3 rounded-lg">{(fetchError || error)?.message || (fetchError || error)}</p>}
      {success && <p className="text-xs font-medium text-green-600 bg-green-50 p-3 rounded-lg">{success}</p>}

      <div className="card bg-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-default bg-surface flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary">Evaluation Periods</h3>
          <IosButton variant="tinted" size="sm" onClick={openCreateModal} disabled={semesters.length === 0}>Add Period</IosButton>
        </div>
        {periods.length === 0 ? (
          <p className="text-xs text-tertiary p-6">No evaluation periods configured yet.</p>
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
                    <th>Rubric</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => (
                    <tr key={period.id}>
                      <td className="font-medium">{period.name}</td>
                      <td className="text-xs text-tertiary">{period.semesterTitle || period.semesterId}</td>
                      <td className="text-xs text-tertiary">{period.source || "\u2014"}</td>
                      <td className="text-xs">{period.startDate}</td>
                      <td className="text-xs">{period.endDate || <span className="text-tertiary">N/A</span>}</td>
                      <td className="text-xs text-tertiary">{groups.find((g) => g.id === period.rubricGroupId)?.name || "\u2014"}</td>
                      <td>
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${period.isActive ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                          {period.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-2 text-center">
                        <IosButton variant="plain" size="xs" onClick={() => openEditModal(period)}>Edit</IosButton>
                        {period.isActive ? (
                          <IosButton variant="plain" size="xs" className="!text-red-500" onClick={() => setConfirmAlert({ open: true, title: "Deactivate Period?", message: `Students will no longer be able to evaluate during "${period.name}". Existing submissions are preserved.`, destructive: true, onConfirm: () => handleDeactivate(period.id) })}>Disable</IosButton>
                        ) : (
                          <IosButton variant="plain" size="xs" className="!text-green-600" onClick={() => setConfirmAlert({ open: true, title: "Activate Period?", message: `"${period.name}" will become the active evaluation period. The rubric assignment will be locked.`, destructive: false, onConfirm: () => handleActivate(period.id) })}>Activate</IosButton>
                        )}
                        <IosButton variant="plain" size="xs" className="!text-red-500" onClick={() => handleDelete(period.id)}>Delete</IosButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-only space-y-2 p-3">
              {periods.map((period) => (
                <div key={period.id} className={`p-4 rounded-xl border ${period.isActive ? 'border-green-300 bg-green-50/50' : 'border-default bg-surface'}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-sm font-bold text-primary">{period.name}</p>
                      <p className="text-xs text-tertiary">{period.semesterTitle || period.semesterId}</p>
                    </div>
                    <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${period.isActive ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
                      {period.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 mt-2">
                    {period.source && <p className="text-tertiary">Source: {period.source}</p>}
                    <p className="text-tertiary">Period: {period.startDate} to {period.endDate || "N/A"}</p>
                    {period.rubricGroupId && <p className="text-tertiary">Rubric: {groups.find((g) => g.id === period.rubricGroupId)?.name || "Linked"}</p>}
                  </div>
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <IosButton variant="tinted" size="sm" onClick={() => openEditModal(period)} className="flex-1">Edit</IosButton>
                    {period.isActive ? (
                      <IosButton variant="destructive" size="sm" onClick={() => setConfirmAlert({ open: true, title: "Deactivate Period?", message: `Students will no longer be able to evaluate during "${period.name}". Existing submissions are preserved.`, destructive: true, onConfirm: () => handleDeactivate(period.id) })} className="flex-1">Disable</IosButton>
                    ) : (
                      <IosButton variant="success" size="sm" onClick={() => setConfirmAlert({ open: true, title: "Activate Period?", message: `"${period.name}" will become the active evaluation period. The rubric assignment will be locked.`, destructive: false, onConfirm: () => handleActivate(period.id) })} className="flex-1">Activate</IosButton>
                    )}
                    <IosButton variant="destructive" size="sm" onClick={() => handleDelete(period.id)} className="flex-1">Delete</IosButton>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div ref={modalRef} className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-primary">{editingId ? "Edit Evaluation Period" : "Create Evaluation Period"}</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Semester</label>
                <select
                  value={formSemesterId}
                  onChange={(e) => setFormSemesterId(e.target.value)}
                  className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                >
                  <option value="">Select semester...</option>
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}{s.isActive ? " (Active)" : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Period Name</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="e.g. Pre-Semester Evaluation"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Source Tag (Optional)</label>
                <input
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="e.g. pre-sem, midterm, post-sem"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-tertiary mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    min={todayStr}
                    className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-tertiary mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    min={formStartDate || undefined}
                    className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Rubric Group</label>
                <select
                  value={formRubricGroupId || ""}
                  onChange={(e) => setFormRubricGroupId(e.target.value || null)}
                  className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">No rubric assigned</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-tertiary mt-1">Once the period is activated, the rubric assignment is locked.</p>
              </div>

              {formRubricGroupId && (
                <div className="border border-strong rounded-lg p-4 bg-slate-50">
                  <h4 className="text-xs font-bold text-primary mb-2">Rubric Preview</h4>
                  {loadingPreview ? (
                    <p className="text-xs text-tertiary">Loading preview...</p>
                  ) : previewGroup ? (
                    <div className="space-y-3">
                      <p className="text-xs text-tertiary">{previewGroup.name}{previewGroup.description ? ` — ${previewGroup.description}` : ""}</p>
                      {previewGroup.categories.length === 0 ? (
                        <p className="text-xs text-tertiary italic">No categories defined</p>
                      ) : (
                        previewGroup.categories
                          .sort((a, b) => a.displayOrder - b.displayOrder)
                          .map((cat) => (
                            <div key={cat.id}>
                              <p className="text-xs font-semibold text-secondary">{cat.name}</p>
                              <ul className="ml-3 mt-1 space-y-0.5">
                                {(cat.items ?? [])
                                  .sort((a, b) => a.displayOrder - b.displayOrder)
                                  .map((item) => (
                                    <li key={item.id} className="text-[11px] text-tertiary">
                                      {item.text} <span className="text-tertiary/60">(w: {item.weight})</span>
                                    </li>
                                  ))
                                }
                              </ul>
                            </div>
                          ))
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-tertiary">Could not load preview</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <IosButton variant="gray" onClick={closeModal}>Cancel</IosButton>
              <IosButton type="button" loading={saving} variant="primary" onClick={handleSubmit}>
                {editingId ? "Save Changes" : "Create Period"}
              </IosButton>
            </div>
          </div>
        </div>
      )}

      <Alert
        isOpen={confirmAlert.open}
        onClose={() => setConfirmAlert((p) => ({ ...p, open: false }))}
        title={confirmAlert.title}
        message={confirmAlert.message}
        confirmLabel={confirmAlert.destructive ? "Deactivate" : "Activate"}
        destructive={confirmAlert.destructive}
        onConfirm={confirmAlert.onConfirm}
      />
    </div>
  )
}
