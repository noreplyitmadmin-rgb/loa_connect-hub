"use client"

import { useState, useEffect, useRef } from "react"
import { useApiGet, invalidate } from "@/lib/api/client"
import SubmitButton from "@/components/ui/SubmitButton"
// Removed isSemesterActive import
// Type definitions (inlined for local use)
interface SemesterData {
  id: string
  title: string
  evalStartDate: string
  evalEndDate: string | null
  isActive: boolean
  createdAt: string
}

export default function AdminSemestersPage() {
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const showSuccessMessage = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(""), 4000)
  }

  const [newTitle, setNewTitle] = useState("")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editIsActive, setEditIsActive] = useState(false)
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")
  const [saving, setSaving] = useState(false)

  // Data fetching: Fetch semesters
  const { data: semestersData, isLoading: semestersLoading, error: semestersErr } = useApiGet<{ data: SemesterData[] }>("/api/semesters")

  const semesters = semestersData?.data ?? []
  const loading = semestersLoading
  const fetchError = semestersErr

  // --- Handlers ---

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle) return
    setSaving(true)
    setError("")
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
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editTitle) return
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/semesters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, isActive: editIsActive }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      setEditingId(null)
      showSuccessMessage("Semester updated!")
      invalidate("/api/semesters")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

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
    return <div className="text-sm text-tertiary p-8">Loading semesters...</div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-12">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary">Academic Semesters</h1>
          <p className="text-xs sm:text-sm text-tertiary mt-0.5 sm:mt-1">
            Manage academic semesters used for the consulting cycles.
          </p>
        </div>
      </div>

      {(fetchError || error) && <p className="text-xs font-medium text-red-600 bg-red-50 p-3 rounded-lg">{(fetchError || error)?.message || (fetchError || error)}</p>}
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
          Dates and activation are configured on the <strong>Evaluation Periods</strong> page. New semesters start as inactive.
        </p>
        <div>

          <SubmitButton type="submit" loading={saving} variant="primary">
            Create Department
          </SubmitButton>
        </div>
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
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-primary">Active</span>
              </label>
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

      {/* Directory */}
      <div className="card bg-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-default bg-surface">
          <h3 className="text-sm font-bold text-primary">Semesters Directory</h3>
        </div>
        {semesters.length === 0 ? (
          <p className="text-xs text-tertiary p-6">No semesters configured yet.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="desktop-only">
              <table className="w-full text-sm">
                <thead className="border-b border-default text-left text-xs font-semibold text-tertiary uppercase tracking-wider bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Start Date</th>
                    <th className="px-6 py-3">End Date</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 w-40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {semesters.map((semester) => (
                    <tr key={semester.id} className="border-b border-slate-50 hover:bg-surface-hover/70">
                      <td className="px-6 py-4 font-medium">{semester.title}</td>
                      <td className="px-6 py-4">{semester.evalStartDate}</td>
                      <td className="px-6 py-4">{semester.evalEndDate || <span className='text-tertiary'>N/A</span>}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${semester.isActive ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}
                        >
                          {semester.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-6 py-4 space-x-3">

                        <SubmitButton
                          onClick={() => {
                            setEditTitle(semester.title)
                            setEditIsActive(semester.isActive)
                            setEditingId(semester.id)
                          }}
                          variant="primary"
                          className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                        >
                          Edit
                        </SubmitButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="mobile-only space-y-2 p-3">
              {semesters.map((semester) => {
                const isActive = semester.isActive
                return (
                  <div key={semester.id} className={`p-4 rounded-xl border ${isActive ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50'}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-sm font-bold text-primary">{semester.title}</p>
                        <p className="text-xs font-mono font-semibold text-tertiary">{semester.id}</p>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${isActive ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                        }`}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="text-xs space-y-1 mt-2">
                      <p className="text-tertiary">Period: {semester.evalStartDate} to {semester.evalEndDate || 'N/A'}</p>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setEditTitle(semester.title)
                          setEditIsActive(semester.isActive)
                          setEditingId(semester.id)
                        }}
                        className="w-full text-xs font-semibold px-3 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                      >
                        Edit
                      </button>
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