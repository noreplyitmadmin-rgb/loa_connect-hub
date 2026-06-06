"use client"

import { useState, useEffect, useCallback } from "react"

interface Enrollment {
  id: string
  student: { id: string; name: string; email: string }
  section: { id: string; name: string; program: string }
}

export default function StudentEnrollmentsPage() {
  const [data, setData] = useState<Enrollment[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  const fetchData = useCallback(async (isRefresh?: boolean) => {
    if (isRefresh) {
      setLoading(true)
      setError("")
    }
    try {
      const res = await fetch("/api/data/evaluation-mappings?type=student")
      if (!res.ok) throw new Error("Failed to load student enrollments")
      const json = await res.json()
      setData(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { Promise.resolve().then(() => fetchData()) }, [fetchData])

  const filtered = data?.filter((m) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.student.name.toLowerCase().includes(q) ||
      m.student.email.toLowerCase().includes(q) ||
      `${m.section.program}-${m.section.name}`.toLowerCase().includes(q)
    )
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary">Student Enrollments</h1>
          <p className="text-sm text-tertiary mt-1">Students enrolled in sections.</p>
        </div>
        <button
          type="button"
          onClick={() => fetchData(true)}
          disabled={loading}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-default bg-surface-hover hover:bg-surface-dim transition-colors"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      <div className="card p-6 space-y-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by student name, email, or section..."
          className="w-full text-xs px-3 py-2 rounded-lg border border-default bg-surface-hover focus:border-gold-500 outline-none transition-colors"
        />

        <div className="overflow-x-auto max-h-96 overflow-y-auto border border-default rounded-lg">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-surface-dim text-left text-[10px] font-bold text-tertiary uppercase tracking-wider border-b border-default sticky top-0">
                <th className="p-2">Student</th>
                <th className="p-2">Email</th>
                <th className="p-2">Section</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr><td colSpan={3} className="p-4 text-center text-xs text-tertiary">Loading...</td></tr>
              ) : filtered?.length === 0 ? (
                <tr><td colSpan={3} className="p-4 text-center text-xs text-tertiary">No enrollments found.</td></tr>
              ) : (
                filtered?.map((m) => (
                  <tr key={m.id} className="border-b border-default hover:bg-surface-hover">
                    <td className="p-2 font-medium text-secondary">{m.student.name}</td>
                    <td className="p-2 text-tertiary">{m.student.email}</td>
                    <td className="p-2 text-secondary">{m.section.program}-{m.section.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && <p className="text-xs text-tertiary">{data.length} enrollment{data.length !== 1 ? "s" : ""}</p>}
      </div>
    </div>
  )
}
