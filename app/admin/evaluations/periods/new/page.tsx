"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function NewEvaluationPeriodPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: "",
    semester: "",
    schoolYear: "",
    startDate: "",
    endDate: "",
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/admin/evaluation-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("Failed to create")
      router.push("/admin/evaluations/periods")
      router.refresh()
    } catch {
      alert("Failed to create evaluation period")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-primary">New Evaluation Period</h1>
        <p className="text-sm text-tertiary mt-1">Create a new evaluation cycle</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-secondary">Period Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            placeholder="e.g. 1st Semester A.Y. 2025-2026"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-secondary">Semester</label>
          <input
            required
            value={form.semester}
            onChange={(e) => setForm({ ...form, semester: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            placeholder="e.g. 1st Semester"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-secondary">School Year</label>
          <input
            required
            value={form.schoolYear}
            onChange={(e) => setForm({ ...form, schoolYear: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            placeholder="e.g. 2025-2026"
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
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-secondary hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Period"}
          </button>
        </div>
      </form>
    </div>
  )
}
