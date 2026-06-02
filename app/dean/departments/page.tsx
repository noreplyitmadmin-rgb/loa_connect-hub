"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import SubmitButton from "@/components/SubmitButton"
import { useApiGet, invalidate } from "@/lib/api/client"

interface DepartmentCourse {
  id: string
  departmentId: string
  name: string
  code: string
  createdAt: string
}

interface Department {
  id: string
  name: string
  code: string
  deanId: string | null
}

export default function DeanDepartmentsPage() {
  const { data: session } = useSession()
  const [error, setError] = useState("")
  const [newName, setNewName] = useState("")
  const [newCode, setNewCode] = useState("")
  const [saving, setSaving] = useState(false)

  const userId = (session?.user as Record<string, unknown>)?.id as string

  const { data: usersData, isLoading: usersLoading } = useApiGet<{ users: unknown[]; departments: Department[] }>(
    session ? "/api/admin/users" : null
  )

  const { data: allCourses, isLoading: coursesLoading } = useApiGet<DepartmentCourse[]>(
    session ? "/api/admin/department-courses" : null
  )

  const loading = usersLoading || coursesLoading

  const department = usersData?.departments?.find((d: Department) => d.deanId === userId) ?? null
  const courses = department && allCourses ? allCourses.filter((c) => c.departmentId === department.id) : []

  const refresh = () => {
    invalidate("/api/admin/users", "/api/admin/department-courses")
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!department || !newName || !newCode) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/admin/department-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId: department.id, name: newName, code: newCode }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add course")
      }
      setNewName("")
      setNewCode("")
      await refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this course?")) return
    try {
      const res = await fetch(`/api/admin/department-courses/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete")
      }
      await refresh()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (!session) return null

  if (loading) {
    return <div className="text-sm text-slate-500 p-8">Loading...</div>
  }

  if (!department) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 pb-12">
        <h1 className="text-2xl font-bold text-slate-900">My Department</h1>
        <div className="card p-8 bg-white text-center">
          <p className="text-sm text-slate-500">No department assigned to your account.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Department: {department.name}</h1>
        <p className="text-sm text-slate-500 mt-1">Manage courses for {department.name} ({department.code}). These courses are available when importing students.</p>
      </div>

      {error && <p className="text-xs font-medium text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      {/* Add Course Form */}
      <form onSubmit={handleAdd} className="card p-6 bg-white space-y-4">
        <h2 className="text-sm font-bold text-slate-700">Add Course</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Course Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="e.g. Bachelor of Science in Information Technology"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Course Code (max 10 chars)</label>
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              maxLength={10}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="e.g. BSIT"
              required
            />
          </div>
        </div>
        <SubmitButton type="submit" loading={saving} variant="primary">Add Course</SubmitButton>
      </form>

      {/* Department Courses List */}
      <div className="card bg-white">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Courses</h3>
        </div>
        {courses.length === 0 ? (
          <p className="text-xs text-slate-400 px-6 py-4">No courses configured yet. Add one above.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="desktop-only">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-6 py-3 font-mono text-xs font-semibold text-slate-700">{c.code}</td>
                      <td className="px-6 py-3 text-slate-600">{c.name}</td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-xs font-semibold text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="mobile-only space-y-2 p-3">
              {courses.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-xs font-semibold text-slate-700 font-mono">{c.code}</p>
                    <p className="text-xs text-slate-600">{c.name}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 px-3 py-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
