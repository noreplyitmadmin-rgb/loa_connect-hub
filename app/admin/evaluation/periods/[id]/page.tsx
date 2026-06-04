"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"

interface Period {
  id: string
  name: string
  semester: string
  schoolYear: string
  startDate: string
  endDate: string
  isActive: boolean
}

export default function EditEvaluationPeriodPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [form, setForm] = useState({
    name: "",
    semester: "",
    schoolYear: "",
    startDate: "",
    endDate: "",
  })
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/evaluation-periods/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        const p = data.period as Period
        setForm({
          name: p.name,
          semester: p.semester,
          schoolYear: p.schoolYear,
          startDate: p.startDate,
          endDate: p.endDate,
        })
        setIsActive(p.isActive)
      })
      .catch(() => alert("Failed to load period"))
      .finally(() => setLoading(false))
  }, [params.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/evaluation-periods/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("Failed to update")
      router.refresh()
    } catch {
      alert("Failed to update evaluation period")
    } finally {
      setSaving(false)
    }
  }

  async function handleActivate() {
    try {
      const res = await fetch(`/api/evaluation-periods/${params.id}/activate`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to activate")
      setIsActive(true)
      router.refresh()
    } catch {
      alert("Failed to activate evaluation period")
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this evaluation period? This cannot be undone.")) return
    try {
      const res = await fetch(`/api/admin/evaluation-periods/${params.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      router.push("/admin/evaluation/periods")
      router.refresh()
    } catch {
      alert("Failed to delete evaluation period")
    }
  }

  if (loading) return <p className="text-sm text-tertiary text-center py-12">Loading...</p>

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">Edit Evaluation Period</h1>
          <p className="text-sm text-tertiary mt-1">Update evaluation cycle details</p>
        </div>
        <div className="flex items-center gap-2">
          {!isActive && (
            <button
              onClick={handleActivate}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              Set Active
            </button>
          )}
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-secondary">Period Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-secondary">Semester</label>
          <input
            required
            value={form.semester}
            onChange={(e) => setForm({ ...form, semester: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-secondary">School Year</label>
          <input
            required
            value={form.schoolYear}
            onChange={(e) => setForm({ ...form, schoolYear: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-secondary">Start Date</label>
            <input
              required
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-secondary">End Date</label>
            <input
              required
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        </div>
        {isActive && (
          <p className="text-xs text-emerald-600 font-medium">This period is currently active.</p>
        )}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/admin/evaluation/periods")}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-secondary hover:bg-slate-50 transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  )
}
