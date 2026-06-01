"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import SubmitButton from "@/components/SubmitButton"

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

export default function MobileDeanDepartmentsPage() {
  const { data: session } = useSession()
  const [courses, setCourses] = useState<DepartmentCourse[]>([])
  const [department, setDepartment] = useState<Department | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [newName, setNewName] = useState("")
  const [newCode, setNewCode] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const userId = (session?.user as Record<string, unknown>)?.id as string
      const usersRes = await fetch("/api/admin/users")
      if (!usersRes.ok) throw new Error("Failed to load data")
      const data = await usersRes.json()
      const myDept = (data.departments || []).find((d: Department) => d.deanId === userId)
      if (!myDept) {
        setDepartment(null)
        setCourses([])
        return
      }
      setDepartment(myDept)

      const coursesRes = await fetch("/api/admin/department-courses")
      if (!coursesRes.ok) throw new Error("Failed to load courses")
      const allCourses: DepartmentCourse[] = await coursesRes.json()
      setCourses(allCourses.filter((c) => c.departmentId === myDept.id))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!session) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

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
      await fetchData()
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
      await fetchData()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (!session) return null

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Departments</h1>
        <Link
          href="/dean/departments?desktop=1"
          className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
        >
          Desktop view
        </Link>
      </div>

      {error && <p className="text-xs font-medium text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : !department ? (
        <div className="card p-6 bg-white text-center">
          <p className="text-sm text-slate-500">No department assigned to your account.</p>
        </div>
      ) : (
        <>
          <div className="card p-4 bg-white">
            <p className="text-sm font-semibold text-slate-800">{department.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{department.code}</p>
          </div>

          <form onSubmit={handleAdd} className="card p-4 bg-white space-y-3">
            <p className="text-sm font-bold text-slate-700">Add Course</p>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Course Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold-400 min-h-[44px]"
                placeholder="e.g. Bachelor of Science in IT"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Course Code (max 10 chars)</label>
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                maxLength={10}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold-400 min-h-[44px]"
                placeholder="e.g. BSIT"
                required
              />
            </div>
            <SubmitButton type="submit" loading={saving} variant="primary">Add Course</SubmitButton>
          </form>

          {courses.length === 0 ? (
            <p className="text-xs text-slate-400 text-center">No courses configured yet. Add one above.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-700">Courses</p>
              {courses.map((c) => (
                <div key={c.id} className="card p-4 bg-white flex items-center justify-between min-h-[44px]">
                  <div>
                    <p className="text-xs font-semibold text-slate-700 font-mono">{c.code}</p>
                    <p className="text-xs text-slate-500">{c.name}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 px-3 py-2 min-h-[44px]"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="text-center pt-2">
            <Link
              href="/dean/departments?desktop=1"
              className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
            >
              Desktop view
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
