"use client"

import { useState, useEffect, useCallback } from "react"

interface Mapping {
  id: string
  faculty: { id: string; name: string; email: string }
  subject: { id: string; code: string; name: string }
  section: { id: string; name: string; program: string }
}

export default function FacultyMappingsPage() {
  const [data, setData] = useState<Mapping[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  const fetchData = useCallback(async (isRefresh?: boolean) => {
    if (isRefresh) {
      setLoading(true)
      setError("")
    }
    try {
      const res = await fetch("/api/data/evaluation-mappings?type=faculty")
      if (!res.ok) throw new Error("Failed to load faculty-subject mappings")
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
      m.faculty.name.toLowerCase().includes(q) ||
      m.faculty.email.toLowerCase().includes(q) ||
      m.subject.code.toLowerCase().includes(q) ||
      m.subject.name.toLowerCase().includes(q) ||
      `${m.section.program}-${m.section.name}`.toLowerCase().includes(q)
    )
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary">Faculty-Subject Mappings</h1>
          <p className="text-sm text-tertiary mt-1">Faculty members mapped to subjects and sections.</p>
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
          placeholder="Search by faculty name, email, subject code, or section..."
          className="w-full text-xs px-3 py-2 rounded-lg border border-default bg-surface-hover focus:border-gold-500 outline-none transition-colors"
        />

        <div className="overflow-x-auto max-h-96 overflow-y-auto border border-default rounded-lg">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-surface-dim text-left text-[10px] font-bold text-tertiary uppercase tracking-wider border-b border-default sticky top-0">
                <th className="p-2">Faculty</th>
                <th className="p-2">Email</th>
                <th className="p-2">Subject</th>
                <th className="p-2">Section</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr><td colSpan={4} className="p-4 text-center text-xs text-tertiary">Loading...</td></tr>
              ) : filtered?.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-xs text-tertiary">No mappings found.</td></tr>
              ) : (
                filtered?.map((m) => (
                  <tr key={m.id} className="border-b border-default hover:bg-surface-hover">
                    <td className="p-2 font-medium text-secondary">{m.faculty.name}</td>
                    <td className="p-2 text-tertiary">{m.faculty.email}</td>
                    <td className="p-2">
                      <span className="font-medium text-secondary">{m.subject.code}</span>
                      <span className="text-tertiary ml-1">{m.subject.name}</span>
                    </td>
                    <td className="p-2 text-secondary">{m.section.program}-{m.section.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && <p className="text-xs text-tertiary">{data.length} mapping{data.length !== 1 ? "s" : ""}</p>}
      </div>
    </div>
  )
}
