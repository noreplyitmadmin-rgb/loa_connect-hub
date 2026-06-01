"use client"

import { useEffect, useState } from "react"
import SubmitButton from "@/components/SubmitButton"

interface DepartmentCourse {
  id: string
  departmentId: string
  name: string
  code: string
  createdAt: string
  department: { name: string; code: string }
}

interface Department {
  id: string
  name: string
  code: string
  deanId: string | null
  isDisabled: boolean
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function AdminDepartmentsPage() {
  const [activeTab, setActiveTab] = useState<"departments" | "courses">("departments")
  const [courses, setCourses] = useState<DepartmentCourse[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Department Form States
  const [newDeptName, setNewDeptName] = useState("")
  const [newDeptCode, setNewDeptCode] = useState("")
  const [newDeptDeanId, setNewDeptDeanId] = useState("")
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null)
  const [editDeptName, setEditDeptName] = useState("")
  const [editDeptCode, setEditDeptCode] = useState("")
  const [editDeptDeanId, setEditDeptDeanId] = useState("")

  // Course Form States
  const [newCourseDeptId, setNewCourseDeptId] = useState("")
  const [newCourseName, setNewCourseName] = useState("")
  const [newCourseCode, setNewCourseCode] = useState("")

  const [saving, setSaving] = useState(false)

  const doFetch = async () => {
    setError("")
    const [coursesRes, usersRes, deptsRes] = await Promise.all([
      fetch("/api/admin/department-courses"),
      fetch("/api/admin/users"),
      fetch("/api/admin/departments"),
    ])
    if (!coursesRes.ok) throw new Error("Failed to load courses")
    if (!usersRes.ok) throw new Error("Failed to load users")
    if (!deptsRes.ok) throw new Error("Failed to load departments")

    const usersData = await usersRes.json()
    const deptsData = await deptsRes.json()

    setCourses(await coursesRes.json())
    setDepartments(deptsData || [])
    setUsers(usersData.users || [])
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      await doFetch()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/department-courses"),
      fetch("/api/admin/users"),
      fetch("/api/admin/departments"),
    ])
      .then(async ([coursesRes, usersRes, deptsRes]) => {
        if (!coursesRes.ok) throw new Error("Failed to load courses")
        if (!usersRes.ok) throw new Error("Failed to load users")
        if (!deptsRes.ok) throw new Error("Failed to load departments")
        const usersData = await usersRes.json()
        const deptsData = await deptsRes.json()
        setCourses(await coursesRes.json())
        setDepartments(deptsData || [])
        setUsers(usersData.users || [])
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [])

  // Filter users with DEAN role
  const deans = users.filter((u) => u.role.split("|").includes("DEAN"))

  // Grouped courses for visual mapping
  const grouped = departments.map((dept) => ({
    ...dept,
    courses: courses.filter((c) => c.departmentId === dept.id),
  }))

  const showSuccessMessage = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(""), 4000)
  }

  // --- Department CRUD handlers ---
  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDeptName || !newDeptCode) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDeptName,
          code: newDeptCode,
          deanId: newDeptDeanId || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add department")
      }
      setNewDeptName("")
      setNewDeptCode("")
      setNewDeptDeanId("")
      showSuccessMessage("Department successfully created!")
      await fetchData()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleEditDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDeptId || !editDeptName || !editDeptCode) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/departments/${editingDeptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDeptName,
          code: editDeptCode,
          deanId: editDeptDeanId || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update department")
      }
      setEditingDeptId(null)
      showSuccessMessage("Department successfully updated!")
      await fetchData()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (dept: Department) => {
    setError("")
    try {
      const res = await fetch(`/api/admin/departments/${dept.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDisabled: !dept.isDisabled }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update status")
      }
      showSuccessMessage(`Department is now ${!dept.isDisabled ? "disabled" : "enabled"}!`)
      await fetchData()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const startEditing = (dept: Department) => {
    setEditingDeptId(dept.id)
    setEditDeptName(dept.name)
    setEditDeptCode(dept.code)
    setEditDeptDeanId(dept.deanId || "")
  }

  // --- Course CRUD handlers ---
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCourseDeptId || !newCourseName || !newCourseCode) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/admin/department-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId: newCourseDeptId,
          name: newCourseName,
          code: newCourseCode,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add course")
      }
      setNewCourseDeptId("")
      setNewCourseName("")
      setNewCourseCode("")
      showSuccessMessage("Course successfully added to department!")
      await fetchData()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Remove this course?")) return
    try {
      const res = await fetch(`/api/admin/department-courses/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete")
      }
      showSuccessMessage("Course successfully removed!")
      await fetchData()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-500 p-8">Loading departments and courses...</div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Academic Infrastructure</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
            Manage departments, academic deans, and course configurations.
          </p>
        </div>
      </div>

      {error && <p className="text-xs font-medium text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      {success && <p className="text-xs font-medium text-green-600 bg-green-50 p-3 rounded-lg">{success}</p>}

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => { setActiveTab("departments"); setError("") }}
          className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
            activeTab === "departments"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Departments Management
        </button>
        <button
          onClick={() => { setActiveTab("courses"); setError("") }}
          className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
            activeTab === "courses"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Courses Mapping
        </button>
      </div>

      {/* TAB 1: DEPARTMENTS */}
      {activeTab === "departments" && (
        <div className="space-y-8">
          {/* Add / Edit Department Form */}
          {editingDeptId ? (
            <form onSubmit={handleEditDeptSubmit} className="card p-6 bg-white space-y-4 border border-amber-300">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-amber-700">Edit Department Details</h2>
                <button
                  type="button"
                  onClick={() => setEditingDeptId(null)}
                  className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                >
                  Cancel Edit
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Department Name</label>
                  <input
                    value={editDeptName}
                    onChange={(e) => setEditDeptName(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="e.g. College of Engineering"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Code</label>
                  <input
                    value={editDeptCode}
                    onChange={(e) => setEditDeptCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="e.g. COE"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Assigned Dean</label>
                  <select
                    value={editDeptDeanId}
                    onChange={(e) => setEditDeptDeanId(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">Unassigned</option>
                    {deans.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <SubmitButton type="submit" loading={saving} variant="primary">
                  Save Changes
                </SubmitButton>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAddDept} className="card p-6 bg-white space-y-4">
              <h2 className="text-sm font-bold text-slate-700">Add New Academic Department</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Department Name</label>
                  <input
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="e.g. College of Liberal Arts"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Code</label>
                  <input
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="e.g. CLA"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Assigned Dean (Optional)</label>
                  <select
                    value={newDeptDeanId}
                    onChange={(e) => setNewDeptDeanId(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">Select Dean...</option>
                    {deans.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <SubmitButton type="submit" loading={saving} variant="primary">
                  Create Department
                </SubmitButton>
              </div>
            </form>
          )}

          {/* Department Directory */}
          <div className="card bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">Departments Directory</h3>
            </div>
            {departments.length === 0 ? (
              <p className="text-xs text-slate-400 p-6">No departments configured yet.</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="desktop-only">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                        <th className="px-6 py-3">Code</th>
                        <th className="px-6 py-3">Department Name</th>
                        <th className="px-6 py-3">Dean Assigned</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 w-40">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map((dept) => {
                        const assignedDean = users.find((u) => u.id === dept.deanId)
                        return (
                          <tr key={dept.id} className="border-b border-slate-50 hover:bg-slate-50/70">
                            <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">{dept.code}</td>
                            <td className="px-6 py-4 text-slate-800 font-medium">{dept.name}</td>
                            <td className="px-6 py-4 text-slate-600">
                              {assignedDean ? (
                                <div>
                                  <p className="font-semibold text-slate-800">{assignedDean.name}</p>
                                  <p className="text-xs text-slate-400">{assignedDean.email}</p>
                                </div>
                              ) : (
                                <span className="text-xs italic text-slate-400">No dean assigned</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${
                                  dept.isDisabled
                                    ? "bg-red-50 text-red-600 border border-red-200"
                                    : "bg-green-50 text-green-600 border border-green-200"
                                }`}
                              >
                                {dept.isDisabled ? "Disabled" : "Active"}
                              </span>
                            </td>
                            <td className="px-6 py-4 space-x-3">
                              <button
                                onClick={() => startEditing(dept)}
                                className="text-xs font-bold text-amber-500 hover:text-amber-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleToggleStatus(dept)}
                                className={`text-xs font-bold ${
                                  dept.isDisabled
                                    ? "text-green-600 hover:text-green-800"
                                    : "text-red-500 hover:text-red-700"
                                }`}
                              >
                                {dept.isDisabled ? "Enable" : "Disable"}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="mobile-only space-y-2 p-3">
                  {departments.map((dept) => {
                    const assignedDean = users.find((u) => u.id === dept.deanId)
                    return (
                      <div key={dept.id} className="p-4 rounded-xl bg-white border border-slate-100 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{dept.name}</p>
                            <p className="text-xs font-mono font-semibold text-slate-500">{dept.code}</p>
                          </div>
                          <span className={`shrink-0 inline-flex px-2 py-1 text-[10px] font-bold rounded-full ${
                            dept.isDisabled
                              ? "bg-red-50 text-red-600 border border-red-200"
                              : "bg-green-50 text-green-600 border border-green-200"
                          }`}>
                            {dept.isDisabled ? "Disabled" : "Active"}
                          </span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-400">Dean: </span>
                          {assignedDean ? (
                            <span className="text-slate-600">
                              {assignedDean.name} <span className="text-slate-400">({assignedDean.email})</span>
                            </span>
                          ) : (
                            <span className="italic text-slate-400">Not assigned</span>
                          )}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => startEditing(dept)}
                            className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleStatus(dept)}
                            className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                              dept.isDisabled
                                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                            }`}
                          >
                            {dept.isDisabled ? "Enable" : "Disable"}
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
      )}

      {/* TAB 2: COURSES */}
      {activeTab === "courses" && (
        <div className="space-y-8">
          {/* Add Course Form */}
          <form onSubmit={handleAddCourse} className="card p-6 bg-white space-y-4">
            <h2 className="text-sm font-bold text-slate-700">Add Course to Department</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Department</label>
                <select
                  value={newCourseDeptId}
                  onChange={(e) => setNewCourseDeptId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                >
                  <option value="">Select department...</option>
                  {departments
                    .filter((d) => !d.isDisabled)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Course Name</label>
                <input
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="e.g. Bachelor of Science in IT"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Course Code</label>
                <input
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="e.g. BSIT"
                  required
                />
              </div>
            </div>
            <div>
              <SubmitButton type="submit" loading={saving} variant="primary">
                Add Course
              </SubmitButton>
            </div>
          </form>

          {/* Department Courses List */}
          <div className="space-y-6">
            {grouped.map((dept) => (
              <div key={dept.id} className={`card bg-white ${dept.isDisabled ? "opacity-60" : ""}`}>
                <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-800">
                    {dept.name} ({dept.code})
                  </h3>
                  {dept.isDisabled && (
                    <span className="self-start sm:self-auto text-xs text-red-500 font-semibold bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                      Dept Disabled
                    </span>
                  )}
                </div>
                {dept.courses.length === 0 ? (
                  <p className="text-xs text-slate-400 px-6 py-4">No courses configured.</p>
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
                          {dept.courses.map((c) => (
                            <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="px-6 py-3 font-mono text-xs font-semibold text-slate-700">{c.code}</td>
                              <td className="px-6 py-3 text-slate-600">{c.name}</td>
                              <td className="px-6 py-3">
                                <button
                                  onClick={() => handleDeleteCourse(c.id)}
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
                      {dept.courses.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                          <div>
                            <p className="text-xs font-semibold text-slate-700 font-mono">{c.code}</p>
                            <p className="text-xs text-slate-600">{c.name}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteCourse(c.id)}
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
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
