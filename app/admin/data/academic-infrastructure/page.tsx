"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useApiGet, invalidate } from "@/lib/api/client"
import SubmitButton from "@/components/ui/SubmitButton"
import { usePagination, Paginator } from "@/components/ui/Paginator"
import { SkeletonTable } from "@/components/ui/Skeleton"
import LockedTab from "@/components/ui/LockedTab"
import type { DepartmentData, UserData, SemesterData } from "@/lib/types"

type MainTab = "semesters" | "departments" | "subjects" | "faculty_enroll"
type InfraTab = "departments" | "courses"
type SubjectTab = "subjects" | "sections"
type FacEnrollTab = "faculty" | "enrollments"

interface Subject {
  id: string; code: string; name: string; isDisabled: boolean
}

interface Section {
  id: string; name: string; program: string; isDisabled: boolean
}

interface FacultyMapping {
  id: string
  faculty: { id: string; name: string; email: string; departmentId: string | null }
  subject: { id: string; code: string; name: string }
  section: { id: string; name: string; program: string }
}

interface Enrollment {
  id: string
  student: { id: string; name: string; email: string }
  section: { id: string; name: string; program: string }
  faculty_subject_id: string | null
  faculty_subject: FacultyMapping | null
}

interface DepartmentCourse {
  id: string; departmentId: string; name: string; code: string; createdAt: string
  department: { name: string; code: string }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function SegmentedControl<T extends string>({ options, selected, onSelect }: { options: { key: T; label: string }[]; selected: T; onSelect: (key: T) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-surface-tertiary rounded-xl overflow-x-auto scrollbar-hide">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onSelect(opt.key)}
          className={`shrink-0 text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200 ${
            selected === opt.key
              ? "bg-surface text-amber-600 shadow-ios-sm"
              : "text-tertiary hover:text-secondary"
          } ios-tab-item`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

const mainTabs: { key: MainTab; label: string }[] = [
  { key: "semesters", label: "Semesters" },
  { key: "departments", label: "Departments & Courses" },
  { key: "subjects", label: "Subjects & Sections" },
  { key: "faculty_enroll", label: "Faculty Loading & Enrollments" },
]

// ── Components ─────────────────────────────────────────────────────────────

function SearchInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-xs px-3 py-2 rounded-lg border border-default bg-surface-hover focus:border-gold-500 outline-none transition-colors"
    />
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AcademicInfrastructurePage() {
  const [mainTab, setMainTab] = useState<MainTab>("semesters")
  const [infraTab, setInfraTab] = useState<InfraTab>("departments")
  const [subjectTab, setSubjectTab] = useState<SubjectTab>("subjects")
  const [facEnrollTab, setFacEnrollTab] = useState<FacEnrollTab>("faculty")

  // ── Access control ─────────────────────────────────────
  const [accessState, setAccessState] = useState<"loading" | "granted" | "locked">("loading")

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (!j.user) { setAccessState("locked"); return }
        const role = j.user.role ?? ""
        if (role.split("|").includes("ADMIN")) { setAccessState("granted"); return }
        const perms = Array.isArray(j.permissions) ? j.permissions : []
        const hasAccess = perms.some(
          (p: { resource_path: string; grants: string[] }) =>
            p.resource_path === "/admin/data/academic-infrastructure" && p.grants?.includes("access")
        )
        setAccessState(hasAccess ? "granted" : "locked")
      })
      .catch(() => setAccessState("locked"))
  }, [])

  if (accessState === "loading") {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-surface-dim rounded" />
          <div className="h-4 w-96 bg-surface-dim rounded" />
        </div>
      </div>
    )
  }

  if (accessState === "locked") {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        <div className="card p-12 text-center space-y-4">
          <div className="text-4xl text-tertiary">&#x1f512;</div>
          <h1 className="text-xl font-bold text-primary">Access Restricted</h1>
          <p className="text-sm text-tertiary max-w-md mx-auto">
            You do not have permission to access the Academic Infrastructure page.
            Contact your administrator to request access.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-primary">Academic Infrastructure</h1>
        <p className="text-xs sm:text-sm text-tertiary mt-0.5 sm:mt-1">
          Manage departments, courses, subjects, sections, faculty mappings, student enrollments, and semesters.
        </p>
      </div>

      {/* Main Tabs */}
      <SegmentedControl
        options={mainTabs}
        selected={mainTab}
        onSelect={(key) => { setMainTab(key); setInfraTab("departments"); setSubjectTab("subjects"); setFacEnrollTab("faculty") }}
      />

      {/* ── TAB: Semesters ────────────────────────────────────────────── */}
      {mainTab === "semesters" && <SemestersTab />}

      {/* ── TAB: Departments & Courses ─────────────────────────────────── */}
      {mainTab === "departments" && <DepartmentsCoursesTab infraTab={infraTab} setInfraTab={setInfraTab} />}

      {/* ── TAB: Subjects & Sections ──────────────────────────────────── */}
      {mainTab === "subjects" && <SubjectsSectionsTab subjectTab={subjectTab} setSubjectTab={setSubjectTab} />}

      {/* ── TAB: Faculty Loading & Enrollments ────────────────────────── */}
      {mainTab === "faculty_enroll" && <FacultyEnrollTab facEnrollTab={facEnrollTab} setFacEnrollTab={setFacEnrollTab} />}

      {/* Disclaimer */}
      <div className="text-xs text-tertiary bg-amber-50/50 border border-amber-200 rounded-lg px-4 py-3 leading-relaxed">
        <strong className="text-amber-700">Disclaimer:</strong> This system is by no means a replacement for any internal bespoke application that the institution is currently using.
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  DEPARTMENTS & COURSES TAB
// ══════════════════════════════════════════════════════════════════════════════

function DepartmentsCoursesTab({ infraTab, setInfraTab }: {
  infraTab: InfraTab; setInfraTab: (t: InfraTab) => void
}) {
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const showSuccessMessage = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(""), 4000)
  }

  const [newDeptName, setNewDeptName] = useState("")
  const [newDeptCode, setNewDeptCode] = useState("")
  const [newDeptDeanId, setNewDeptDeanId] = useState("")
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null)
  const [editDeptName, setEditDeptName] = useState("")
  const [editDeptCode, setEditDeptCode] = useState("")
  const [editDeptDeanId, setEditDeptDeanId] = useState("")
  const [newCourseDeptId, setNewCourseDeptId] = useState("")
  const [newCourseName, setNewCourseName] = useState("")
  const [newCourseCode, setNewCourseCode] = useState("")
  const [saving, setSaving] = useState(false)

  const { data: coursesData, isLoading: coursesLoading, error: coursesErr } = useApiGet<DepartmentCourse[]>("/api/admin/department-courses")
  const { data: usersData, isLoading: usersLoading, error: usersErr } = useApiGet<{ users: UserData[] }>("/api/admin/users")
  const { data: deptsData, isLoading: deptsLoading, error: deptsErr } = useApiGet<DepartmentData[]>("/api/admin/departments")

  const courses = coursesData ?? []
  const departments = deptsData ?? []
  const users = usersData?.users ?? []
  const loading = coursesLoading || usersLoading || deptsLoading
  const fetchError = coursesErr || usersErr || deptsErr
  const locked = fetchError?.message?.includes("Forbidden") || fetchError?.message?.includes("API endpoint requires")
    ? "/api/admin/department-courses"
    : ""

  const refresh = () => {
    invalidate("/api/admin/department-courses", "/api/admin/users", "/api/admin/departments")
  }

  const deans = users.filter((u) => u.role.split("|").includes("DEAN"))

  const grouped = departments.map((dept) => ({
    ...dept,
    courses: courses.filter((c) => c.departmentId === dept.id),
  }))

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDeptName || !newDeptCode) return
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDeptName, code: newDeptCode, deanId: newDeptDeanId || null }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to add department") }
      setNewDeptName(""); setNewDeptCode(""); setNewDeptDeanId("")
      showSuccessMessage("Department successfully created!")
      await refresh()
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleEditDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDeptId || !editDeptName || !editDeptCode) return
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/admin/departments/${editingDeptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editDeptName, code: editDeptCode, deanId: editDeptDeanId || null }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to update department") }
      setEditingDeptId(null)
      showSuccessMessage("Department successfully updated!")
      await refresh()
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleToggleStatus = async (dept: DepartmentData) => {
    setError("")
    try {
      const res = await fetch(`/api/admin/departments/${dept.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDisabled: !dept.isDisabled }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to update status") }
      showSuccessMessage(`Department is now ${!dept.isDisabled ? "disabled" : "enabled"}!`)
      await refresh()
    } catch (err) { setError((err as Error).message) }
  }

  const startEditing = (dept: DepartmentData) => {
    setEditingDeptId(dept.id)
    setEditDeptName(dept.name)
    setEditDeptCode(dept.code)
    setEditDeptDeanId(dept.deanId || "")
  }

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCourseDeptId || !newCourseName || !newCourseCode) return
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/admin/department-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId: newCourseDeptId, name: newCourseName, code: newCourseCode }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to add course") }
      setNewCourseDeptId(""); setNewCourseName(""); setNewCourseCode("")
      showSuccessMessage("Course successfully added to department!")
      await refresh()
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Remove this course?")) return
    try {
      const res = await fetch(`/api/admin/department-courses/${id}`, { method: "DELETE" })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to delete") }
      showSuccessMessage("Course successfully removed!")
      await refresh()
    } catch (err) { setError((err as Error).message) }
  }

  if (loading) {
    return <div className="text-sm text-tertiary p-8">Loading departments and courses...</div>
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {locked && <LockedTab endpoint={locked} />}
      {!locked && (fetchError?.message || error) && (
        <p className="text-xs font-medium text-red-600 bg-red-50 p-3 rounded-lg">{fetchError?.message || error}</p>
      )}
      {success && <p className="text-xs font-medium text-green-600 bg-green-50 p-3 rounded-lg">{success}</p>}

      {/* Sub-tabs */}
      <SegmentedControl
        options={[{ key: "departments" as const, label: "Departments Management" }, { key: "courses" as const, label: "Courses Mapping" }]}
        selected={infraTab}
        onSelect={(key) => { setInfraTab(key); setError("") }}
      />

      {/* ── Departments Sub-tab ──────────────────────────────────────────── */}
      {infraTab === "departments" && (
        <div className="space-y-8">
          {editingDeptId ? (
            <form onSubmit={handleEditDeptSubmit} className="card p-6 bg-surface space-y-4 border border-amber-300">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-amber-700">Edit Department Details</h2>
                <button type="button" onClick={() => setEditingDeptId(null)} className="text-xs text-tertiary hover:text-secondary font-semibold">Cancel Edit</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-tertiary mb-1">Department Name</label>
                  <input value={editDeptName} onChange={(e) => setEditDeptName(e.target.value)} className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="e.g. College of Engineering" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-tertiary mb-1">Code</label>
                  <input value={editDeptCode} onChange={(e) => setEditDeptCode(e.target.value.toUpperCase())} maxLength={10} className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="e.g. COE" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-tertiary mb-1">Assigned Dean</label>
                  <select value={editDeptDeanId} onChange={(e) => setEditDeptDeanId(e.target.value)} className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400">
                    <option value="">Unassigned</option>
                    {deans.map((d) => (<option key={d.id} value={d.id}>{d.name} ({d.email})</option>))}
                  </select>
                </div>
              </div>
              <div><SubmitButton type="submit" loading={saving} variant="primary">Save Changes</SubmitButton></div>
            </form>
          ) : (
            <form onSubmit={handleAddDept} className="card p-6 bg-surface space-y-4">
              <h2 className="text-sm font-bold text-secondary">Add New Academic Department</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-tertiary mb-1">Department Name</label>
                  <input value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="e.g. College of Liberal Arts" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-tertiary mb-1">Code</label>
                  <input value={newDeptCode} onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())} maxLength={10} className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="e.g. CLA" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-tertiary mb-1">Assigned Dean (Optional)</label>
                  <select value={newDeptDeanId} onChange={(e) => setNewDeptDeanId(e.target.value)} className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400">
                    <option value="">Select Dean...</option>
                    {deans.map((d) => (<option key={d.id} value={d.id}>{d.name} ({d.email})</option>))}
                  </select>
                </div>
              </div>
              <div><SubmitButton type="submit" loading={saving} variant="primary">Create Department</SubmitButton></div>
            </form>
          )}

          <div className="card bg-surface overflow-hidden">
            <div className="px-6 py-4 border-b border-default bg-surface"><h3 className="text-sm font-bold text-primary">Departments Directory</h3></div>
            {departments.length === 0 ? (
              <p className="text-xs text-tertiary p-6">No departments configured yet.</p>
            ) : (
              <>
                <div className="desktop-only">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-default text-left text-xs font-semibold text-tertiary uppercase tracking-wider bg-slate-50/50">
                        <th className="px-6 py-3">Code</th>
                        <th className="px-6 py-3">Department Name</th>
                        <th className="px-6 py-3">Dean Assigned</th>
                        <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map((dept) => {
                        const assignedDean = users.find((u) => u.id === dept.deanId)
                        return (
                          <tr key={dept.id} className="border-b border-slate-50 hover:bg-surface-hover/70">
                            <td className="px-6 py-4 font-mono text-xs font-bold text-secondary">{dept.code}</td>
                            <td className="px-6 py-4 text-primary font-medium">{dept.name}</td>
                            <td className="px-6 py-4 text-secondary">
                              {assignedDean ? (
                                <div><p className="font-semibold text-primary">{assignedDean.name}</p><p className="text-xs text-tertiary">{assignedDean.email}</p></div>
                              ) : (<span className="text-xs italic text-tertiary">No dean assigned</span>)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${dept.isDisabled ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"}`}>
                                {dept.isDisabled ? "Disabled" : "Active"}
                              </span>
                            </td>
                      <td className="px-6 py-4 space-x-3 text-center">
                              <button onClick={() => startEditing(dept)} className="text-xs font-bold text-amber-500 hover:text-amber-700">Edit</button>
                              <button onClick={() => handleToggleStatus(dept)} className={`text-xs font-bold ${dept.isDisabled ? "text-green-600 hover:text-green-800" : "text-red-500 hover:text-red-700"}`}>
                                {dept.isDisabled ? "Enable" : "Disable"}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mobile-only space-y-2 p-3">
                  {departments.map((dept) => {
                    const assignedDean = users.find((u) => u.id === dept.deanId)
                    return (
                      <div key={dept.id} className="p-4 rounded-xl bg-surface border border-default space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div><p className="text-sm font-bold text-primary">{dept.name}</p><p className="text-xs font-mono font-semibold text-tertiary">{dept.code}</p></div>
                          <span className={`shrink-0 inline-flex px-2 py-1 text-[10px] font-bold rounded-full ${dept.isDisabled ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"}`}>
                            {dept.isDisabled ? "Disabled" : "Active"}
                          </span>
                        </div>
                        <div className="text-xs">
                          <span className="text-tertiary">Dean: </span>
                          {assignedDean ? (<span className="text-secondary">{assignedDean.name} <span className="text-tertiary">({assignedDean.email})</span></span>) : (<span className="italic text-tertiary">Not assigned</span>)}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => startEditing(dept)} className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">Edit</button>
                          <button onClick={() => handleToggleStatus(dept)} className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${dept.isDisabled ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"}`}>
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

      {/* ── Courses Sub-tab ──────────────────────────────────────────────── */}
      {infraTab === "courses" && (
        <div className="space-y-8">
          <form onSubmit={handleAddCourse} className="card p-6 bg-surface space-y-4">
            <h2 className="text-sm font-bold text-secondary">Add Course to Department</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Department</label>
                <select value={newCourseDeptId} onChange={(e) => setNewCourseDeptId(e.target.value)} className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required>
                  <option value="">Select department...</option>
                  {departments.filter((d) => !d.isDisabled).map((d) => (<option key={d.id} value={d.id}>{d.name} ({d.code})</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Course Name</label>
                <input value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="e.g. Bachelor of Science in IT" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Course Code</label>
                <input value={newCourseCode} onChange={(e) => setNewCourseCode(e.target.value.toUpperCase())} maxLength={10} className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="e.g. BSIT" required />
              </div>
            </div>
            <div><SubmitButton type="submit" loading={saving} variant="primary">Add Course</SubmitButton></div>
          </form>

          <div className="space-y-6">
            {grouped.map((dept) => (
              <div key={dept.id} className={`card bg-surface ${dept.isDisabled ? "opacity-60" : ""}`}>
                <div className="px-4 sm:px-6 py-4 border-b border-default flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-primary">{dept.name} ({dept.code})</h3>
                  {dept.isDisabled && (<span className="self-start sm:self-auto text-xs text-red-500 font-semibold bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Dept Disabled</span>)}
                </div>
                {dept.courses.length === 0 ? (
                  <p className="text-xs text-tertiary px-6 py-4">No courses configured.</p>
                ) : (
                  <>
                    <div className="desktop-only">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-default text-left text-xs font-semibold text-tertiary uppercase tracking-wider">
                            <th className="px-6 py-3">Code</th>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3 w-24">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dept.courses.map((c) => (
                            <tr key={c.id} className="border-b border-slate-50 hover:bg-surface-hover">
                              <td className="px-6 py-3 font-mono text-xs font-semibold text-secondary">{c.code}</td>
                              <td className="px-6 py-3 text-secondary">{c.name}</td>
                              <td className="px-6 py-3">
                                <button onClick={() => handleDeleteCourse(c.id)} className="text-xs font-semibold text-red-500 hover:text-red-700">Remove</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mobile-only space-y-2 p-3">
                      {dept.courses.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-surface border border-default">
                          <div><p className="text-xs font-semibold text-secondary font-mono">{c.code}</p><p className="text-xs text-secondary">{c.name}</p></div>
                          <button onClick={() => handleDeleteCourse(c.id)} className="text-xs font-semibold text-red-500 hover:text-red-700 px-3 py-2">Remove</button>
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

// ══════════════════════════════════════════════════════════════════════════════
//  SUBJECTS & SECTIONS TAB
// ══════════════════════════════════════════════════════════════════════════════

function SubjectsSectionsTab({ subjectTab, setSubjectTab }: {
  subjectTab: SubjectTab; setSubjectTab: (t: SubjectTab) => void
}) {
  return (
    <div className="space-y-6">
      <SegmentedControl
        options={[{ key: "subjects" as const, label: "Subjects Management" }, { key: "sections" as const, label: "Sections Management" }]}
        selected={subjectTab}
        onSelect={(key) => setSubjectTab(key)}
      />
      {subjectTab === "subjects" && <SubjectsTab />}
      {subjectTab === "sections" && <SectionsTab />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  SUBJECTS TAB (internal)
// ══════════════════════════════════════════════════════════════════════════════

function SubjectsTab() {
  const [data, setData] = useState<Subject[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [locked, setLocked] = useState("")
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCode, setEditCode] = useState("")
  const [editName, setEditName] = useState("")

  const [newCode, setNewCode] = useState("")
  const [newName, setNewName] = useState("")

  const modalRef = useRef<HTMLDivElement>(null)

  const isEditing = editingId !== null

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

  const fetchData = useCallback(async (isRefresh?: boolean) => {
    if (isRefresh) { setLoading(true); setError("") }
    try {
      const res = await fetch("/api/data/evaluation-mappings?type=subjects")
      if (res.status === 403) { setLocked("/api/data/evaluation-mappings?type=subjects"); return }
      if (!res.ok) throw new Error("Failed to load subjects")
      const json = await res.json()
      setData(json.data)
    } catch (err) { setError(err instanceof Error ? err.message : "Unknown error") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { Promise.resolve().then(() => fetchData()) }, [fetchData])

  const filtered = data?.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  })

  const { page, totalPages, pageSize, paginatedItems, setPage, setPageSize } = usePagination(filtered ?? [], 25)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCode || !newName) return
    setSaving(true); setError(""); setSuccess("")
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newCode, name: newName }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to add subject") }
      setNewCode(""); setNewName("")
      setSuccess("Subject added!")
      setTimeout(() => setSuccess(""), 3000)
      fetchData(true)
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleEdit = async () => {
    if (!editingId || !editCode || !editName) return
    setSaving(true); setError(""); setSuccess("")
    try {
      const res = await fetch(`/api/admin/subjects/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: editCode, name: editName }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to update subject") }
      setEditingId(null)
      setSuccess("Subject updated!")
      setTimeout(() => setSuccess(""), 3000)
      fetchData(true)
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleToggleStatus = async (subject: Subject) => {
    setError(""); setSuccess("")
    try {
      const res = await fetch(`/api/admin/subjects/${subject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDisabled: !subject.isDisabled }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to update status") }
      setSuccess(`Subject is now ${!subject.isDisabled ? "disabled" : "enabled"}!`)
      setTimeout(() => setSuccess(""), 3000)
      fetchData(true)
    } catch (err) { setError((err as Error).message) }
  }

  const startEditing = (subject: Subject) => {
    setEditingId(subject.id)
    setEditCode(subject.code)
    setEditName(subject.name)
  }

  return (
    <div className="space-y-6">
      {locked && <LockedTab endpoint={locked} />}
      {!locked && error && <p className="text-xs font-medium text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      {success && <p className="text-xs font-medium text-green-600 bg-green-50 p-3 rounded-lg">{success}</p>}

      <form onSubmit={handleAdd} className="card p-4 sm:p-6 bg-surface space-y-4">
        <h2 className="text-sm font-bold text-secondary">Add New Subject</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-tertiary mb-1">Code</label>
            <input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} maxLength={20} className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="e.g. CS101" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-tertiary mb-1">Name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="e.g. Introduction to Programming" required />
          </div>
        </div>
        <div><SubmitButton type="submit" loading={saving} variant="primary">Add Subject</SubmitButton></div>
      </form>

      <div className="card p-4 sm:p-6 bg-surface space-y-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by code or name..." />
        {loading && !data ? (
          <SkeletonTable rows={4} cols={3} />
        ) : filtered?.length === 0 ? (
          <p className="text-xs text-tertiary text-center py-8">No subjects found.</p>
        ) : (
          <>
            <div className="desktop-only">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-default text-left text-xs font-semibold text-tertiary uppercase tracking-wider bg-slate-50/50">
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-surface-hover/70">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-secondary">{s.code}</td>
                      <td className="px-6 py-4 text-primary font-medium">{s.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${s.isDisabled ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"}`}>
                          {s.isDisabled ? "Disabled" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-3 text-center">
                        <button onClick={() => startEditing(s)} className="text-xs font-bold text-amber-500 hover:text-amber-700">Edit</button>
                        <button onClick={() => handleToggleStatus(s)} className={`text-xs font-bold ${s.isDisabled ? "text-green-600 hover:text-green-800" : "text-red-500 hover:text-red-700"}`}>
                          {s.isDisabled ? "Enable" : "Disable"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-only space-y-2">
              {paginatedItems.map((s) => (
                <div key={s.id} className="p-4 rounded-xl bg-surface border border-default space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-primary">{s.name}</p>
                      <p className="text-xs font-mono font-semibold text-tertiary">{s.code}</p>
                    </div>
                    <span className={`shrink-0 inline-flex px-2 py-1 text-[10px] font-bold rounded-full ${s.isDisabled ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"}`}>
                      {s.isDisabled ? "Disabled" : "Active"}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => startEditing(s)} className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">Edit</button>
                    <button onClick={() => handleToggleStatus(s)} className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${s.isDisabled ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"}`}>
                      {s.isDisabled ? "Enable" : "Disable"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          <Paginator page={page} totalPages={totalPages} pageSize={pageSize} totalItems={filtered?.length ?? 0} setPage={setPage} setPageSize={setPageSize} />
          </>
        )}
        {data && <p className="text-xs text-tertiary">{data.length} subject{data.length !== 1 ? "s" : ""}</p>}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div ref={modalRef} className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-primary">Edit Subject</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Code</label>
                <input value={editCode} onChange={(e) => setEditCode(e.target.value.toUpperCase())} maxLength={20} className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-secondary hover:bg-slate-50 transition-colors">Cancel</button>
              <SubmitButton type="button" loading={saving} variant="primary" onClick={handleEdit}>Save Changes</SubmitButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  SECTIONS TAB (internal)
// ══════════════════════════════════════════════════════════════════════════════

function SectionsTab() {
  const [data, setData] = useState<Section[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [locked, setLocked] = useState("")
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editProgram, setEditProgram] = useState("")

  const [newName, setNewName] = useState("")
  const [newProgram, setNewProgram] = useState("")

  const modalRef = useRef<HTMLDivElement>(null)

  const isEditing = editingId !== null

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

  const fetchData = useCallback(async (isRefresh?: boolean) => {
    if (isRefresh) { setLoading(true); setError("") }
    try {
      const res = await fetch("/api/data/evaluation-mappings?type=sections")
      if (res.status === 403) { setLocked("/api/data/evaluation-mappings?type=sections"); return }
      if (!res.ok) throw new Error("Failed to load sections")
      const json = await res.json()
      setData(json.data)
    } catch (err) { setError(err instanceof Error ? err.message : "Unknown error") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { Promise.resolve().then(() => fetchData()) }, [fetchData])

  const filtered = data?.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.name.toLowerCase().includes(q) || s.program.toLowerCase().includes(q)
  })

  const { page, totalPages, pageSize, paginatedItems, setPage, setPageSize } = usePagination(filtered ?? [], 25)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newProgram) return
    setSaving(true); setError(""); setSuccess("")
    try {
      const res = await fetch("/api/admin/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, program: newProgram }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to add section") }
      setNewName(""); setNewProgram("")
      setSuccess("Section added!")
      setTimeout(() => setSuccess(""), 3000)
      fetchData(true)
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleEdit = async () => {
    if (!editingId || !editName || !editProgram) return
    setSaving(true); setError(""); setSuccess("")
    try {
      const res = await fetch(`/api/admin/sections/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, program: editProgram }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to update section") }
      setEditingId(null)
      setSuccess("Section updated!")
      setTimeout(() => setSuccess(""), 3000)
      fetchData(true)
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleToggleStatus = async (section: Section) => {
    setError(""); setSuccess("")
    try {
      const res = await fetch(`/api/admin/sections/${section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDisabled: !section.isDisabled }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to update status") }
      setSuccess(`Section is now ${!section.isDisabled ? "disabled" : "enabled"}!`)
      setTimeout(() => setSuccess(""), 3000)
      fetchData(true)
    } catch (err) { setError((err as Error).message) }
  }

  const startEditing = (section: Section) => {
    setEditingId(section.id)
    setEditName(section.name)
    setEditProgram(section.program)
  }

  return (
    <div className="space-y-6">
      {locked && <LockedTab endpoint={locked} />}
      {!locked && error && <p className="text-xs font-medium text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      {success && <p className="text-xs font-medium text-green-600 bg-green-50 p-3 rounded-lg">{success}</p>}

      <form onSubmit={handleAdd} className="card p-4 sm:p-6 bg-surface space-y-4">
        <h2 className="text-sm font-bold text-secondary">Add New Section</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-tertiary mb-1">Program</label>
            <input value={newProgram} onChange={(e) => setNewProgram(e.target.value)} className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="e.g. BSIT" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-tertiary mb-1">Name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="e.g. Section A" required />
          </div>
        </div>
        <div><SubmitButton type="submit" loading={saving} variant="primary">Add Section</SubmitButton></div>
      </form>

      <div className="card p-4 sm:p-6 bg-surface space-y-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by program or name..." />
        {loading && !data ? (
          <SkeletonTable rows={4} cols={3} />
        ) : filtered?.length === 0 ? (
          <p className="text-xs text-tertiary text-center py-8">No sections found.</p>
        ) : (
          <>
            <div className="desktop-only">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-default text-left text-xs font-semibold text-tertiary uppercase tracking-wider bg-slate-50/50">
                    <th className="px-6 py-3">Program</th>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-surface-hover/70">
                      <td className="px-6 py-4 font-medium text-secondary">{s.program}</td>
                      <td className="px-6 py-4 text-primary font-medium">{s.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${s.isDisabled ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"}`}>
                          {s.isDisabled ? "Disabled" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-3 text-center">
                        <button onClick={() => startEditing(s)} className="text-xs font-bold text-amber-500 hover:text-amber-700">Edit</button>
                        <button onClick={() => handleToggleStatus(s)} className={`text-xs font-bold ${s.isDisabled ? "text-green-600 hover:text-green-800" : "text-red-500 hover:text-red-700"}`}>
                          {s.isDisabled ? "Enable" : "Disable"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-only space-y-2">
              {paginatedItems.map((s) => (
                <div key={s.id} className="p-4 rounded-xl bg-surface border border-default space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-primary">{s.name}</p>
                      <p className="text-xs font-semibold text-tertiary">{s.program}</p>
                    </div>
                    <span className={`shrink-0 inline-flex px-2 py-1 text-[10px] font-bold rounded-full ${s.isDisabled ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"}`}>
                      {s.isDisabled ? "Disabled" : "Active"}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => startEditing(s)} className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">Edit</button>
                    <button onClick={() => handleToggleStatus(s)} className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${s.isDisabled ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"}`}>
                      {s.isDisabled ? "Enable" : "Disable"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          <Paginator page={page} totalPages={totalPages} pageSize={pageSize} totalItems={filtered?.length ?? 0} setPage={setPage} setPageSize={setPageSize} />
          </>
        )}
        {data && <p className="text-xs text-tertiary">{data.length} section{data.length !== 1 ? "s" : ""}</p>}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div ref={modalRef} className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-primary">Edit Section</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Program</label>
                <input value={editProgram} onChange={(e) => setEditProgram(e.target.value)} className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-secondary hover:bg-slate-50 transition-colors">Cancel</button>
              <SubmitButton type="button" loading={saving} variant="primary" onClick={handleEdit}>Save Changes</SubmitButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  FACULTY LOADING & ENROLLMENTS TAB
// ══════════════════════════════════════════════════════════════════════════════

function FacultyEnrollTab({ facEnrollTab, setFacEnrollTab }: {
  facEnrollTab: FacEnrollTab; setFacEnrollTab: (t: FacEnrollTab) => void
}) {
  return (
    <div className="space-y-6">
      <SegmentedControl
        options={[{ key: "faculty" as const, label: "Faculty Loading" }, { key: "enrollments" as const, label: "Student Enrollments" }]}
        selected={facEnrollTab}
        onSelect={(key) => setFacEnrollTab(key)}
      />
      {facEnrollTab === "faculty" && <FacultyTab />}
      {facEnrollTab === "enrollments" && <EnrollmentsTab />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  FACULTY LOADING TAB (internal)
// ══════════════════════════════════════════════════════════════════════════════

function FacultyTab() {
  const [data, setData] = useState<FacultyMapping[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [locked, setLocked] = useState("")
  const [search, setSearch] = useState("")

  const [formFaculty, setFormFaculty] = useState("")
  const [formSubject, setFormSubject] = useState("")
  const [formSection, setFormSection] = useState("")
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")

  const [deleting, setDeleting] = useState<string | null>(null)
  const [conflictId, setConflictId] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  // ── Department filter ────────────────────────────────────
  const [deptFilter, setDeptFilter] = useState("all")
  const [currentUserDept, setCurrentUserDept] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const fetchData = useCallback(async (isRefresh?: boolean) => {
    if (isRefresh) { setLoading(true); setError("") }
    try {
      const res = await fetch("/api/data/evaluation-mappings?type=faculty")
      if (res.status === 403) { setLocked("/api/data/evaluation-mappings?type=faculty"); return }
      if (!res.ok) throw new Error("Failed to load faculty-subject mappings")
      const json = await res.json()
      setData(json.data)
    } catch (err) { setError(err instanceof Error ? err.message : "Unknown error") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { Promise.resolve().then(() => fetchData()) }, [fetchData])

  // Get current user info for department restriction
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.user) {
          const isAdm = j.user.role?.split("|").includes("ADMIN")
          setIsAdmin(isAdm)
          if (!isAdm && j.user.departmentId) {
            setCurrentUserDept(j.user.departmentId)
            setDeptFilter(j.user.departmentId)
          }
        }
      })
      .catch(() => { })
  }, [])

  const { data: allUsers } = useApiGet<{ users: { id: string; name: string; email: string; role: string; departmentId: string | null }[]; departments: DepartmentData[] }>("/api/admin/users")
  const { data: subjectsData } = useApiGet<{ data: Subject[] }>("/api/data/evaluation-mappings?type=subjects")
  const { data: sectionsData } = useApiGet<{ data: Section[] }>("/api/data/evaluation-mappings?type=sections")

  const faculties = (allUsers?.users ?? []).filter((u) => u.email.endsWith("@lyceumalabang.edu.ph") && u.email !== "admin@lyceumalabang.edu.ph" && u.id !== "a0000000-0000-0000-0000-000000000001")
  const subjects = subjectsData?.data ?? []
  const sections = sectionsData?.data ?? []
  const departments = allUsers?.departments ?? []

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formFaculty || !formSubject || !formSection) return
    const existing = data?.find(
      (m) => m.faculty.id === formFaculty && m.subject.id === formSubject && m.section.id === formSection
    )
    if (existing) {
      setConflictId(existing.id)
      setFormError(`This faculty already handles "${existing.subject.code} - ${existing.subject.name}" for section ${existing.section.program}-${existing.section.name}.`)
      setTimeout(() => {
        tableRef.current?.querySelector(`[data-id="${existing.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 100)
      return
    }
    setConflictId(null)
    setFormSaving(true); setFormError(""); setFormSuccess("")
    try {
      const res = await fetch("/api/admin/faculty-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faculty_id: formFaculty, subject_id: formSubject, section_id: formSection }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to add mapping") }
      setFormFaculty(""); setFormSubject(""); setFormSection("")
      setFormSuccess("Mapping added!")
      setTimeout(() => setFormSuccess(""), 3000)
      fetchData(true)
    } catch (err) { setFormError((err as Error).message) }
    finally { setFormSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this faculty-subject mapping?")) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/faculty-subjects/${id}`, { method: "DELETE" })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to delete") }
      fetchData(true)
    } catch (err) { setError((err as Error).message) }
    finally { setDeleting(null) }
  }

  const byDept = data?.filter((m) => {
    if (deptFilter === "all") return true
    return m.faculty.departmentId === deptFilter
  }) ?? []

  const filtered = byDept.filter((m) => {
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

  const { page, totalPages, pageSize, paginatedItems, setPage, setPageSize } = usePagination(filtered, 25)

  const deptPills = [
    { id: "all", label: "All" },
    ...departments.map((d) => ({ id: d.id, label: d.name })),
  ]

  return (
    <div className="space-y-6">
      {locked && <LockedTab endpoint={locked} />}
      {!locked && error && <p className="text-xs font-medium text-red-600">{error}</p>}

      {/* Add Form */}
      <form onSubmit={handleAdd} className="card p-4 sm:p-6 bg-surface space-y-4">
        <h2 className="text-sm font-bold text-secondary">Add Faculty-Subject Mapping</h2>
        {formError && <p className="text-xs font-medium text-red-600 bg-red-50 p-2 rounded">{formError}</p>}
        {formSuccess && <p className="text-xs font-medium text-green-600 bg-green-50 p-2 rounded">{formSuccess}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-tertiary mb-1">Faculty</label>
            <select value={formFaculty} onChange={(e) => { setFormFaculty(e.target.value); setConflictId(null) }} className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required>
              <option value="">Select faculty...</option>
              {faculties.map((f) => (<option key={f.id} value={f.id}>{f.name} ({f.email})</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-tertiary mb-1">Subject</label>
            <select value={formSubject} onChange={(e) => { setFormSubject(e.target.value); setConflictId(null) }} className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required>
              <option value="">Select subject...</option>
              {subjects.map((s) => (<option key={s.id} value={s.id}>{s.code} - {s.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-tertiary mb-1">Section</label>
            <select value={formSection} onChange={(e) => { setFormSection(e.target.value); setConflictId(null) }} className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required>
              <option value="">Select section...</option>
              {sections.map((s) => (<option key={s.id} value={s.id}>{s.program} - {s.name}</option>))}
            </select>
          </div>
        </div>
        <div><SubmitButton type="submit" loading={formSaving} variant="primary">Add Mapping</SubmitButton></div>
      </form>

      {/* Department Filter */}
      <div className="card p-4 sm:p-6 bg-surface space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {deptPills.map((pill) => {
            const active = deptFilter === pill.id
            return (
              <button
                key={pill.id}
                onClick={() => {
                  if (!isAdmin && pill.id !== currentUserDept) return
                  setDeptFilter(pill.id)
                }}
                disabled={!isAdmin && pill.id !== currentUserDept}
                className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${active
                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                    : "bg-surface text-tertiary border-default hover:border-amber-300 hover:text-secondary"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {pill.label}
              </button>
            )
          })}
        </div>

        <SearchInput value={search} onChange={(v) => { setSearch(v); setConflictId(null) }} placeholder="Search by faculty name, email, subject code, or section..." />
        {loading && !data ? (
          <SkeletonTable rows={4} cols={4} />
        ) : filtered.length === 0 ? (
          <p className="text-xs text-tertiary text-center py-8">No mappings found.</p>
        ) : (
          <>
            <div ref={tableRef} className="desktop-only overflow-x-auto max-h-96 overflow-y-auto border border-default rounded-lg">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-surface-dim text-left text-[10px] font-bold text-tertiary uppercase tracking-wider border-b border-default sticky top-0">
                    <th className="p-2">Faculty</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Subject</th>
                    <th className="p-2">Section</th>
                    <th className="p-2 w-16">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((m) => (
                    <tr key={m.id} data-id={m.id} className={`border-b border-default hover:bg-surface-hover ${conflictId === m.id ? "bg-amber-50 border-amber-300" : ""}`}>
                      <td className="p-2 font-medium text-secondary">{m.faculty.name}</td>
                      <td className="p-2 text-tertiary">{m.faculty.email}</td>
                      <td className="p-2">
                        <span className="font-medium text-secondary">{m.subject.code}</span>
                        <span className="text-tertiary ml-1">{m.subject.name}</span>
                      </td>
                      <td className="p-2 text-secondary">{m.section.program}-{m.section.name}</td>
                      <td className="p-2">
                        <button onClick={() => handleDelete(m.id)} disabled={deleting === m.id} className="text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-40">{deleting === m.id ? "..." : "Delete"}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-only space-y-2">
              {paginatedItems.map((m) => (
                <div key={m.id} data-id={m.id} className={`p-4 rounded-xl bg-surface border space-y-2 ${conflictId === m.id ? "border-amber-300 bg-amber-50" : "border-default"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-primary truncate">{m.faculty.name}</p>
                      <p className="text-xs text-tertiary truncate">{m.faculty.email}</p>
                    </div>
                    <button onClick={() => handleDelete(m.id)} disabled={deleting === m.id} className="shrink-0 text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-40 px-3 py-2">{deleting === m.id ? "..." : "Delete"}</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-tertiary">Subject: </span>
                      <span className="font-medium text-secondary">{m.subject.code} - {m.subject.name}</span>
                    </div>
                    <div>
                      <span className="text-tertiary">Section: </span>
                      <span className="text-secondary">{m.section.program}-{m.section.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Paginator page={page} totalPages={totalPages} pageSize={pageSize} totalItems={filtered.length} setPage={setPage} setPageSize={setPageSize} />
          </>
        )}
        {data && <p className="text-xs text-tertiary">{filtered.length} mapping{filtered.length !== 1 ? "s" : ""}{deptFilter !== "all" ? ` (${byDept.length} in department)` : ""}</p>}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  STUDENT ENROLLMENTS TAB (internal)
// ══════════════════════════════════════════════════════════════════════════════

function EnrollmentsTab() {
  const [data, setData] = useState<Enrollment[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [locked, setLocked] = useState("")
  const [search, setSearch] = useState("")

  const [deleting, setDeleting] = useState<string | null>(null)

  // ── CSV Import state ─────────────────────────────────────
  const csvFileRef = useRef<HTMLInputElement>(null)
  const [csvFsId, setCsvFsId] = useState("")
  const [csvRows, setCsvRows] = useState<{ name: string; email: string }[] | null>(null)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvImportResult, setCsvImportResult] = useState<{ matched: number; created: number; errors: { row: number; email: string; message: string }[] } | null>(null)
  const [csvError, setCsvError] = useState("")
  const [csvPreviewPage, setCsvPreviewPage] = useState(0)
  const PREVIEW_PAGE_SIZE = 50

  // ── Quick Add state ──────────────────────────────────────
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")

  const fetchData = useCallback(async (isRefresh?: boolean) => {
    if (isRefresh) { setLoading(true); setError("") }
    try {
      const res = await fetch("/api/data/evaluation-mappings?type=student")
      if (res.status === 403) { setLocked("/api/data/evaluation-mappings?type=student"); return }
      if (!res.ok) throw new Error("Failed to load student enrollments")
      const json = await res.json()
      setData(json.data)
    } catch (err) { setError(err instanceof Error ? err.message : "Unknown error") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { Promise.resolve().then(() => fetchData()) }, [fetchData])

  const { data: fsData } = useApiGet<{ data: FacultyMapping[] }>("/api/data/evaluation-mappings?type=faculty")
  const facultySubjects = fsData?.data ?? []

  // ── CSV handlers ─────────────────────────────────────────

  const handleCsvFile = (file: File) => {
    setCsvImportResult(null)
    setCsvError("")
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0)
      if (lines.length < 2) {
        setCsvError("CSV must have a header row and at least one data row")
        return
      }
      const header = lines[0].toLowerCase().replace(/"/g, "")
      if (!header.includes("student name") || !header.includes("email")) {
        setCsvError('CSV must have columns: "student name", "email"')
        return
      }
      const nameIdx = header.split(",").findIndex((c) => c.trim() === "student name")
      const emailIdx = header.split(",").findIndex((c) => c.trim() === "email")
      if (nameIdx === -1 || emailIdx === -1) {
        setCsvError('CSV must have columns: "student name", "email"')
        return
      }
      const parsed: { name: string; email: string }[] = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",")
        const name = (cols[nameIdx] ?? "").trim()
        const email = (cols[emailIdx] ?? "").trim().toLowerCase()
        parsed.push({ name, email })
      }
      setCsvRows(parsed)
    }
    reader.readAsText(file)
  }

  const handleCsvImport = async () => {
    if (!csvFsId || !csvRows || csvRows.length === 0) return
    setCsvImporting(true); setCsvImportResult(null); setCsvError("")
    try {
      const res = await fetch("/api/admin/student-enrollments/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faculty_subject_id: csvFsId, rows: csvRows }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Import failed") }
      const result = await res.json()
      setCsvImportResult(result)
      if (result.matched > 0 || result.created > 0) {
        setCsvRows(null)
        fetchData(true)
      }
    } catch (err) { setCsvError((err as Error).message) }
    finally { setCsvImporting(false) }
  }

  const handleCsvRowUpdate = (index: number, value: string) => {
    if (!csvRows) return
    const next = [...csvRows]
    next[index] = { ...next[index], name: value }
    setCsvRows(next)
  }

  const handleCsvRowRemove = (index: number) => {
    if (!csvRows) return
    const next = csvRows.filter((_, i) => i !== index)
    setCsvRows(next)
    if (next.length > 0 && Math.ceil(next.length / PREVIEW_PAGE_SIZE) <= csvPreviewPage) {
      setCsvPreviewPage(Math.max(0, csvPreviewPage - 1))
    }
  }

  const handleCsvReset = () => {
    setCsvRows(null)
    setCsvImportResult(null)
    setCsvPreviewPage(0)
    setCsvError("")
    if (csvFileRef.current) csvFileRef.current.value = ""
  }

  // ── Quick Add handlers ───────────────────────────────────

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName || !formEmail || !csvFsId) return
    setFormSaving(true); setFormError(""); setFormSuccess("")
    try {
      const res = await fetch("/api/admin/student-enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, email: formEmail, faculty_subject_id: csvFsId }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to add enrollment") }
      setFormName(""); setFormEmail(""); setShowQuickAdd(false)
      setFormSuccess("Enrollment added!")
      setTimeout(() => setFormSuccess(""), 3000)
      fetchData(true)
    } catch (err) { setFormError((err as Error).message) }
    finally { setFormSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this enrollment?")) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/student-enrollments/${id}`, { method: "DELETE" })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to delete") }
      fetchData(true)
    } catch (err) { setError((err as Error).message) }
    finally { setDeleting(null) }
  }

  const filtered = data?.filter((m) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.student.name.toLowerCase().includes(q) ||
      m.student.email.toLowerCase().includes(q) ||
      `${m.section.program}-${m.section.name}`.toLowerCase().includes(q) ||
      (m.faculty_subject?.subject.code ?? "").toLowerCase().includes(q) ||
      (m.faculty_subject?.subject.name ?? "").toLowerCase().includes(q) ||
      (m.faculty_subject?.faculty.name ?? "").toLowerCase().includes(q)
    )
  })

  const { page, totalPages, pageSize, paginatedItems, setPage, setPageSize } = usePagination(filtered ?? [], 25)

  const domainOk = (email: string) => email.endsWith("@itmlyceumalabang.onmicrosoft.com")

  const paginatedCsvRows = csvRows
    ? csvRows.slice(csvPreviewPage * PREVIEW_PAGE_SIZE, (csvPreviewPage + 1) * PREVIEW_PAGE_SIZE)
    : []
  const totalPreviewPages = csvRows ? Math.ceil(csvRows.length / PREVIEW_PAGE_SIZE) : 0

  return (
    <div className="space-y-6">
      {locked && <LockedTab endpoint={locked} />}
      {!locked && error && <p className="text-xs font-medium text-red-600">{error}</p>}

      {/* ═══════════════════════════════════════════════════
          IMPORT STUDENTS (Bulk CSV + Quick Add)
         ═══════════════════════════════════════════════════ */}
      <div className="card p-4 sm:p-6 bg-surface space-y-6">
        <h2 className="text-sm font-bold text-secondary">Import Students</h2>

        <div>
          <label className="block text-xs font-semibold text-tertiary mb-1">Subject</label>
          <select
            value={csvFsId}
            onChange={(e) => { setCsvFsId(e.target.value); setCsvRows(null); setCsvImportResult(null); setCsvPreviewPage(0); setCsvError(""); if (csvFileRef.current) csvFileRef.current.value = "" }}
            className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
            required
          >
            <option value="">Select subject...</option>
            {facultySubjects.map((fs) => (
              <option key={fs.id} value={fs.id}>
                {fs.section.program} {fs.section.name} - {fs.subject.code} : {fs.subject.name} ({fs.faculty.name})
              </option>
            ))}
          </select>
        </div>

        {!csvFsId && (
          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
            Select a subject above to begin.
          </p>
        )}

        {csvFsId && (
          <>
            {/* ── Bulk Import ───────────────────────────── */}
            <div className="space-y-4 pt-2 border-t border-default/60">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-secondary">Bulk Import via CSV</h3>
                {!csvRows && !csvImportResult && (
                  <a
                    href="/api/admin/student-enrollments/csv"
                    download="enrollment_template.csv"
                    className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl border border-default bg-surface-hover hover:bg-surface-dim transition-colors"
                  >
                    <svg className="w-4 h-4 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Template
                  </a>
                )}
              </div>

              {!csvRows && !csvImportResult && (
                <div className="space-y-4">
                  <div
                    onClick={() => csvFileRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl bg-surface-dim/30 hover:bg-surface-dim/60 cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-gold-100 dark:bg-gold-900/40 flex items-center justify-center">
                      <svg className="w-6 h-6 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-secondary">Tap to choose a CSV file</p>
                    <p className="text-xs text-tertiary">Headers: <code className="bg-surface-dim px-1.5 py-0.5 rounded text-[10px]">student name, email</code></p>
                    <input
                      ref={csvFileRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f) }}
                    />
                  </div>
                  {csvError && <p className="text-xs font-medium text-red-600 text-center">{csvError}</p>}
                </div>
              )}

              {/* Preview table */}
              {csvRows && csvRows.length > 0 && (
                <div className="flex flex-col h-full min-h-[24rem]">
                  <div className="flex-1 space-y-3 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-secondary">
                        {csvRows.length} row{csvRows.length !== 1 ? "s" : ""}
                      </h4>
                      <span className="text-[11px] text-tertiary">student name, email</span>
                    </div>

                    {csvError && <p className="text-xs font-medium text-red-600">{csvError}</p>}

                    <div className="overflow-x-auto max-h-72 overflow-y-auto border border-default rounded-xl">
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr className="bg-surface-dim text-left text-[11px] font-semibold text-tertiary border-b border-default sticky top-0">
                            <th className="p-3 w-8">#</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Name</th>
                            <th className="p-3 w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedCsvRows.map((row, i) => {
                            const absIdx = csvPreviewPage * PREVIEW_PAGE_SIZE + i
                            return (
                              <tr key={`${csvPreviewPage}-${i}`} className="border-b border-default/50 hover:bg-surface-hover">
                                <td className="p-3 text-tertiary">{absIdx + 1}</td>
                                <td className={`p-3 ${domainOk(row.email) ? "text-secondary" : "text-red-500"}`}>
                                  <div className="flex items-center gap-2">
                                    <span>{row.email || <span className="italic text-red-400">missing</span>}</span>
                                    {!domainOk(row.email) && (
                                      <span className="text-[10px] font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full shrink-0">invalid domain</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <input
                                    value={row.name}
                                    onChange={(e) => handleCsvRowUpdate(absIdx, e.target.value)}
                                    className="w-full bg-surface-dim/50 border border-transparent focus:border-gold-400 rounded-lg px-2 py-1.5 outline-none text-[13px]"
                                  />
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleCsvRowRemove(absIdx)}
                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                                    title="Remove row"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {totalPreviewPages > 1 && (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-tertiary">
                          Page {csvPreviewPage + 1} of {totalPreviewPages}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={csvPreviewPage === 0}
                            onClick={() => setCsvPreviewPage((p) => p - 1)}
                            className="px-4 py-1.5 bg-surface-dim text-secondary rounded-full text-xs font-semibold hover:bg-surface-dim/70 disabled:opacity-40 transition-colors"
                          >
                            Prev
                          </button>
                          <button
                            type="button"
                            disabled={csvPreviewPage >= totalPreviewPages - 1}
                            onClick={() => setCsvPreviewPage((p) => p + 1)}
                            className="px-4 py-1.5 bg-surface-dim text-secondary rounded-full text-xs font-semibold hover:bg-surface-dim/70 disabled:opacity-40 transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="sticky bottom-0 pt-4 pb-1 bg-white dark:bg-surface-dim flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCsvReset}
                      className="flex-1 text-sm font-semibold px-4 py-3 rounded-xl border border-default bg-surface-hover hover:bg-surface-dim transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={csvImporting || csvRows.length === 0 || !csvFsId}
                      onClick={handleCsvImport}
                      className="flex-1 text-sm font-semibold px-4 py-3 rounded-xl bg-gold-600 text-white hover:bg-gold-700 disabled:opacity-40 transition-colors"
                    >
                      {csvImporting ? "Importing..." : `Import ${csvRows.length} Row${csvRows.length !== 1 ? "s" : ""}`}
                    </button>
                  </div>
                </div>
              )}

              {csvImportResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-5 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{csvImportResult.matched}</p>
                      <p className="text-[11px] font-semibold text-emerald-700/70 dark:text-emerald-300/70">Enrolled</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 text-center">
                      <p className="text-2xl font-bold text-blue-600">{csvImportResult.created}</p>
                      <p className="text-[11px] font-semibold text-blue-700/70 dark:text-blue-300/70">Users Created</p>
                    </div>
                  </div>

                  {csvImportResult.errors.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl overflow-hidden">
                      <div className="px-5 py-3 border-b border-amber-100 dark:border-amber-800/30">
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{csvImportResult.errors.length} Error{csvImportResult.errors.length !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="px-5 py-3 space-y-2 max-h-40 overflow-y-auto">
                        {csvImportResult.errors.slice(0, 5).map((e, i) => (
                          <p key={i} className="text-xs text-amber-700 dark:text-amber-400">Row {e.row}: {e.email} — {e.message}</p>
                        ))}
                        {csvImportResult.errors.length > 5 && <p className="text-xs text-tertiary">...and {csvImportResult.errors.length - 5} more</p>}
                      </div>
                    </div>
                  )}

                  {csvImportResult.errors.length === 0 && csvImportResult.matched > 0 && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl px-5 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-200 dark:bg-emerald-700 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-emerald-700 dark:text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">All rows processed successfully.</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleCsvReset}
                    className="w-full text-sm font-semibold px-4 py-3 rounded-xl border border-default bg-surface-hover hover:bg-surface-dim transition-colors"
                  >
                    Import Another File
                  </button>
                </div>
              )}
            </div>

            {/* ── Quick Add ──────────────────────────────── */}
            <div className="space-y-3 pt-2 border-t border-default/60">
              <button
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-sm font-semibold text-secondary">Quick Add Single Student</h3>
                <span className="text-xs text-tertiary">{showQuickAdd ? "▲" : "▼"}</span>
              </button>
              {showQuickAdd && (
                <form onSubmit={handleQuickAdd} className="space-y-4">
                  {formError && <p className="text-xs font-medium text-red-600 bg-red-50 p-2 rounded">{formError}</p>}
                  {formSuccess && <p className="text-xs font-medium text-green-600 bg-green-50 p-2 rounded">{formSuccess}</p>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-tertiary mb-1">Student Name</label>
                      <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Juan Dela Cruz" className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-tertiary mb-1">Student Email</label>
                      <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="e.g. juan@example.com" className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                    </div>
                  </div>
                  <SubmitButton type="submit" loading={formSaving} variant="primary">Add Enrollment</SubmitButton>
                </form>
              )}
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          ENROLLMENT TABLE
         ═══════════════════════════════════════════════════ */}
      <div className="card p-4 sm:p-6 space-y-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by student name, email, section, subject, or faculty..." />
        {loading && !data ? (
          <SkeletonTable rows={4} cols={5} />
        ) : filtered?.length === 0 ? (
          <p className="text-xs text-tertiary text-center py-8">No enrollments found.</p>
        ) : (
          <>
            <div className="desktop-only overflow-x-auto max-h-96 overflow-y-auto border border-default rounded-lg">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-surface-dim text-left text-[10px] font-bold text-tertiary uppercase tracking-wider border-b border-default sticky top-0">
                    <th className="p-2">Student</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Section</th>
                    <th className="p-2">Subject</th>
                    <th className="p-2">Faculty</th>
                    <th className="p-2 w-16">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((m) => (
                    <tr key={m.id} className="border-b border-default hover:bg-surface-hover">
                      <td className="p-2 font-medium text-secondary">{m.student.name}</td>
                      <td className="p-2 text-tertiary">{m.student.email}</td>
                      <td className="p-2 text-secondary">{m.section.program}-{m.section.name}</td>
                      <td className="p-2">
                        {m.faculty_subject ? (
                          <><span className="font-medium text-secondary">{m.faculty_subject.subject.code}</span><span className="text-tertiary ml-1">{m.faculty_subject.subject.name}</span></>
                        ) : (
                          <span className="text-tertiary italic">—</span>
                        )}
                      </td>
                      <td className="p-2 text-secondary">{m.faculty_subject?.faculty.name ?? <span className="text-tertiary italic">—</span>}</td>
                      <td className="p-2">
                        <button onClick={() => handleDelete(m.id)} disabled={deleting === m.id} className="text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-40">{deleting === m.id ? "..." : "Delete"}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-only space-y-2">
              {paginatedItems.map((m) => (
                <div key={m.id} className="p-4 rounded-xl bg-surface border border-default space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-primary truncate">{m.student.name}</p>
                      <p className="text-xs text-tertiary truncate">{m.student.email}</p>
                    </div>
                    <button onClick={() => handleDelete(m.id)} disabled={deleting === m.id} className="shrink-0 text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-40 px-3 py-2">{deleting === m.id ? "..." : "Delete"}</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-tertiary">Section: </span>
                      <span className="text-secondary">{m.section.program}-{m.section.name}</span>
                    </div>
                    <div>
                      <span className="text-tertiary">Subject: </span>
                      {m.faculty_subject ? (
                        <span className="text-secondary">{m.faculty_subject.subject.code} - {m.faculty_subject.subject.name}</span>
                      ) : (
                        <span className="text-tertiary italic">—</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs">
                    <span className="text-tertiary">Faculty: </span>
                    <span className="text-secondary">{m.faculty_subject?.faculty.name ?? <span className="text-tertiary italic">—</span>}</span>
                  </div>
                </div>
              ))}
            </div>
            <Paginator page={page} totalPages={totalPages} pageSize={pageSize} totalItems={filtered?.length ?? 0} setPage={setPage} setPageSize={setPageSize} />
          </>
        )}
        {data && <p className="text-xs text-tertiary">{data.length} enrollment{data.length !== 1 ? "s" : ""}</p>}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  SEMESTERS TAB
// ══════════════════════════════════════════════════════════════════════════════

function SemestersTab() {
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

  const [evalEditingId, setEvalEditingId] = useState<string | null>(null)
  const [editEvalStartDate, setEditEvalStartDate] = useState("")
  const [editEvalEndDate, setEditEvalEndDate] = useState("")

  const { data: semestersData, isLoading: semestersLoading, error: semestersErr } = useApiGet<{ data: SemesterData[] }>("/api/semesters")

  const semesters = semestersData?.data ?? []
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
      invalidate("/api/semesters")
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
      invalidate("/api/semesters")
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleStartEvaluation = async (id: string) => {
    if (!editEvalStartDate) return
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/semesters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evalStartDate: editEvalStartDate, evalEndDate: editEvalEndDate || null }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      setEvalEditingId(null)
      showSuccessMessage("Evaluation period started!")
      invalidate("/api/semesters")
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleEndEvaluation = async (id: string) => {
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/semesters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evalStartDate: null, evalEndDate: null }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed") }
      showSuccessMessage("Evaluation period ended!")
      invalidate("/api/semesters")
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
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

  if (loading) return <div className="text-sm text-tertiary p-8">Loading semesters...</div>

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
          Evaluation dates are managed inline — click <strong>Enable Evaluation</strong> on a semester to set start/end dates. Only semesters with evaluation dates can have active evaluations. New semesters start as inactive.
        </p>
        <div><SubmitButton type="submit" loading={saving} variant="primary">Create Semester</SubmitButton></div>
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
              <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-secondary hover:bg-slate-50 transition-colors">Cancel</button>
              <SubmitButton type="button" loading={saving} variant="primary" onClick={() => handleUpdate(editingId!)}>Save Changes</SubmitButton>
            </div>
          </div>
        </div>
      )}

      {evalEditingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-primary">Enable Evaluation</h2>
            </div>
            <p className="text-[11px] text-tertiary">Set the start and optional end date for this semester&apos;s evaluation period. Students can submit evaluations only within this window.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Start Date</label>
                <input
                  type="date"
                  value={editEvalStartDate}
                  onChange={(e) => setEditEvalStartDate(e.target.value)}
                  className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">End Date (Optional)</label>
                <input
                  type="date"
                  value={editEvalEndDate}
                  onChange={(e) => setEditEvalEndDate(e.target.value)}
                  className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEvalEditingId(null)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-secondary hover:bg-slate-50 transition-colors">Cancel</button>
              <SubmitButton type="button" loading={saving} variant="primary" onClick={() => handleStartEvaluation(evalEditingId!)}>Enable</SubmitButton>
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
            <div className="desktop-only">
              <table className="w-full text-sm">
                <thead className="border-b border-default text-left text-xs font-semibold text-tertiary uppercase tracking-wider bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Start Date</th>
                    <th className="px-6 py-3">End Date</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {semesters.map((semester) => (
                    <tr key={semester.id} className="border-b border-slate-50 hover:bg-surface-hover/70">
                      <td className="px-6 py-4 font-medium">{semester.title}</td>
                      <td className="px-6 py-4">{semester.evalStartDate}</td>
                      <td className="px-6 py-4">{semester.evalEndDate || <span className='text-tertiary'>N/A</span>}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${semester.isActive ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                          {semester.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-3 text-center">
                        <button onClick={() => { setEditTitle(semester.title); setEditingId(semester.id) }} className="text-xs font-bold text-amber-500 hover:text-amber-700">Edit</button>
                        {semester.evalStartDate ? (
                          <button onClick={() => handleEndEvaluation(semester.id)} className="text-xs font-bold text-red-500 hover:text-red-700">End Evaluation</button>
                        ) : (
                          <button onClick={() => { setEvalEditingId(semester.id); setEditEvalStartDate(semester.evalStartDate || ""); setEditEvalEndDate(semester.evalEndDate || "") }} className="text-xs font-bold text-emerald-600 hover:text-emerald-800">Enable Evaluation</button>
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
                  <div className="text-xs space-y-1 mt-2">
                    <p className="text-tertiary">Period: {semester.evalStartDate} to {semester.evalEndDate || 'N/A'}</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => { setEditTitle(semester.title); setEditingId(semester.id) }} className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">Edit</button>
                    {semester.evalStartDate ? (
                      <button onClick={() => handleEndEvaluation(semester.id)} className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors bg-red-50 text-red-700 border-red-200 hover:bg-red-100">End Evaluation</button>
                    ) : (
                      <button onClick={() => { setEvalEditingId(semester.id); setEditEvalStartDate(semester.evalStartDate || ""); setEditEvalEndDate(semester.evalEndDate || "") }} className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">Enable Evaluation</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
