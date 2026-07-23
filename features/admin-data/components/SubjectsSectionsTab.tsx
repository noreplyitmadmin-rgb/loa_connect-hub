"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useApiGet } from "@/lib/api/client"
import { usePagination, Paginator } from "@/components/ui/Paginator"
import { SkeletonTable } from "@/components/ui/Skeleton"
import IosButton from "@/components/ui/IosButton"
import LockedTab from "@/components/ui/LockedTab"
import { SegmentedControl, SearchInput } from "./shared"
import BulkSectionImport from "@/features/users/components/bulk-import/BulkSectionImport"
import BulkSubjectImport from "@/features/users/components/bulk-import/BulkSubjectImport"
import type { DepartmentData } from "@/lib/types"
import type { SubjectTab, Subject, Section, DepartmentCourse } from "./types"

export function SubjectsSectionsTab() {
  const [subjectTab, setSubjectTab] = useState<SubjectTab>("subjects")
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

// ═══ SUBJECTS TAB ═══════════════════════════════════════════════════════════

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
  const [showImport, setShowImport] = useState(false)
  const [showAddSubject, setShowAddSubject] = useState(false)

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

      <div className="border border-default rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowImport((s) => !s)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-dim/40 transition-colors"
        >
          <span>Importer: Subjects</span>
          <span className="text-tertiary">{showImport ? "▲" : "▼"}</span>
        </button>
        {showImport && (
          <div className="border-t border-default px-3 pb-3">
            <BulkSubjectImport onImportComplete={() => { setShowImport(false); fetchData(true) }} />
          </div>
        )}
      </div>

      <div className="border border-default rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAddSubject((s) => !s)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-dim/40 transition-colors"
        >
          <span>Add Subject</span>
          <span className="text-tertiary">{showAddSubject ? "▲" : "▼"}</span>
        </button>
        {showAddSubject && (
          <div className="border-t border-default px-3 pb-3">
            <form onSubmit={handleAdd} className="space-y-4 pt-3">
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
              <div><IosButton type="submit" loading={saving} variant="primary">Add Subject</IosButton></div>
            </form>
          </div>
        )}
      </div>

      <div className="card p-4 sm:p-6 bg-surface space-y-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by code or name..." />
        {loading && !data ? (
          <SkeletonTable rows={4} cols={3} />
        ) : filtered?.length === 0 ? (
          <p className="text-xs text-tertiary text-center py-8">No subjects found.</p>
        ) : (
          <>
            <div className="desktop-only tbl">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((s) => (
                    <tr key={s.id}>
                      <td className="font-mono text-xs font-bold text-secondary">{s.code}</td>
                      <td className="text-primary font-medium">{s.name}</td>
                      <td>
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${s.isDisabled ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"}`}>
                          {s.isDisabled ? "Disabled" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-3 text-center">
                        <IosButton variant="plain" size="xs" onClick={() => startEditing(s)}>Edit</IosButton>
                        <IosButton variant="plain" size="xs" onClick={() => handleToggleStatus(s)} className={s.isDisabled ? "!text-green-600" : "!text-red-500"}>
                          {s.isDisabled ? "Enable" : "Disable"}
                        </IosButton>
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
                    <IosButton variant="tinted" size="sm" onClick={() => startEditing(s)} className="flex-1">Edit</IosButton>
                    <IosButton variant={s.isDisabled ? "success" : "destructive"} size="sm" onClick={() => handleToggleStatus(s)} className="flex-1">
                      {s.isDisabled ? "Enable" : "Disable"}
                    </IosButton>
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
              <IosButton variant="gray" onClick={() => setEditingId(null)}>Cancel</IosButton>
              <IosButton type="button" loading={saving} variant="primary" onClick={handleEdit}>Save Changes</IosButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══ SECTIONS TAB ═══════════════════════════════════════════════════════════

function SectionsTab() {
  const [showImport, setShowImport] = useState(false)
  const [showAddSection, setShowAddSection] = useState(false)
  const [data, setData] = useState<Section[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [locked, setLocked] = useState("")
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDeptId, setEditDeptId] = useState("")
  const [editCourseId, setEditCourseId] = useState("")

  const [newName, setNewName] = useState("")
  const [newDeptId, setNewDeptId] = useState("")
  const [newCourseId, setNewCourseId] = useState("")

  const [currentUserDept, setCurrentUserDept] = useState("")
  const [fixingNames, setFixingNames] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)

  const isEditing = editingId !== null

  // ── Fetch departments & courses ──────────────────────────
  const { data: deptsData } = useApiGet<DepartmentData[]>("/api/admin/departments")
  const { data: coursesData } = useApiGet<DepartmentCourse[]>("/api/admin/department-courses")

  const departments = (deptsData ?? []).filter((d) => !d.isDisabled)
  const allCourses = coursesData ?? []

  const newCourses = allCourses.filter((c) => c.departmentId === newDeptId)
  const editCourses = allCourses.filter((c) => c.departmentId === editDeptId)

  const selectedNewCourse = allCourses.find((c) => c.id === newCourseId)
  const selectedEditCourse = allCourses.find((c) => c.id === editCourseId)

  const clusteredPreview = (courseCode: string | undefined, sectionName: string) =>
    courseCode && sectionName.trim() ? `${courseCode}-${sectionName.trim().toUpperCase()}` : ""

  // ── Get current user's department ────────────────────────
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.user?.departmentId) setCurrentUserDept(j.user.departmentId)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => {
      if (currentUserDept && !newDeptId) setNewDeptId(currentUserDept)
    })
  }, [currentUserDept, newDeptId])

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
    const cluster = `${s.program}-${s.name}`.toLowerCase()
    const deptName = departments.find((d) => d.id === allCourses.find((c) => c.id === s.departmentCourseId)?.departmentId)?.name ?? ""
    return cluster.includes(q) || deptName.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.program.toLowerCase().includes(q)
  })

  const { page, totalPages, pageSize, paginatedItems, setPage, setPageSize } = usePagination(filtered ?? [], 25)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newCourseId) return
    setSaving(true); setError(""); setSuccess("")
    try {
      const res = await fetch("/api/admin/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, departmentCourseId: newCourseId }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to add section") }
      setNewName(""); setNewCourseId("")
      setSuccess("Section added!")
      setTimeout(() => setSuccess(""), 3000)
      fetchData(true)
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  const handleEdit = async () => {
    if (!editingId || !editName || !editCourseId) return
    setSaving(true); setError(""); setSuccess("")
    try {
      const res = await fetch(`/api/admin/sections/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, departmentCourseId: editCourseId }),
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
    const course = allCourses.find((c) => c.id === section.departmentCourseId)
    setEditCourseId(section.departmentCourseId)
    setEditDeptId(course?.departmentId ?? "")
  }

  const sectionDeptName = (s: Section) => {
    const course = allCourses.find((c) => c.id === s.departmentCourseId)
    if (!course) return ""
    const dept = departments.find((d) => d.id === course.departmentId)
    return dept?.name ?? ""
  }

  const handleFixNames = async () => {
    setFixingNames(true); setError(""); setSuccess("")
    try {
      const res = await fetch("/api/admin/sections/fix-names", { method: "POST" })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "Failed to fix section names")
      setSuccess(body.fixed > 0 ? `Fixed ${body.fixed} section name(s).` : "No sections needed fixing.")
      setTimeout(() => setSuccess(""), 3000)
      fetchData(true)
    } catch (err) { setError((err as Error).message) }
    finally { setFixingNames(false) }
  }

  return (
    <div className="space-y-6">
      {locked && <LockedTab endpoint={locked} />}
      {!locked && error && <p className="text-xs font-medium text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      {success && <p className="text-xs font-medium text-green-600 bg-green-50 p-3 rounded-lg">{success}</p>}

      {/* Collapsible Import */}
      <div className="border border-default rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowImport((s) => !s)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-dim/40 transition-colors"
        >
          <span>Importer: Sections</span>
          <span className="text-tertiary">{showImport ? "▲" : "▼"}</span>
        </button>
        {showImport && (
          <div className="border-t border-default px-3 pb-3">
            <BulkSectionImport onImportComplete={() => setShowImport(false)} />
          </div>
        )}
      </div>

      {data && data.some((s) => s.name.startsWith(s.program + " ") || s.name.startsWith(s.program + "-")) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
            Some sections have the program prefix in their name (e.g. BSIT-BSIT 11M1). Fix?
          </p>
          <button
            type="button"
            disabled={fixingNames}
            onClick={handleFixNames}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 transition-colors"
          >
            {fixingNames ? "Fixing..." : "Fix Names"}
          </button>
        </div>
      )}

      <div className="border border-default rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAddSection((s) => !s)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-dim/40 transition-colors"
        >
          <span>Add Section</span>
          <span className="text-tertiary">{showAddSection ? "▲" : "▼"}</span>
        </button>
        {showAddSection && (
          <div className="border-t border-default px-3 pb-3">
            <form onSubmit={handleAdd} className="space-y-4 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-tertiary mb-1">Department</label>
                  <select value={newDeptId} onChange={(e) => { setNewDeptId(e.target.value); setNewCourseId("") }} className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required>
                    <option value="">Select department...</option>
                    {departments.map((d) => (<option key={d.id} value={d.id}>{d.name} ({d.code})</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-tertiary mb-1">Course / Program</label>
                  <select value={newCourseId} onChange={(e) => { setNewCourseId(e.target.value) }} className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required disabled={!newDeptId}>
                    <option value="">{newDeptId ? "Select course..." : "Select department first"}</option>
                    {newCourses.map((c) => (<option key={c.id} value={c.id}>{c.code} — {c.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-tertiary mb-1">Section Name</label>
                  <input value={newName} onChange={(e) => setNewName(e.target.value.toUpperCase())} className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="e.g. 31E1" required />
                </div>
              </div>
              {selectedNewCourse && newName.trim() && (
                <p className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Preview: <span className="font-mono text-amber-800">{clusteredPreview(selectedNewCourse.code, newName)}</span>
                </p>
              )}
              <div><IosButton type="submit" loading={saving} variant="primary">Add Section</IosButton></div>
            </form>
          </div>
        )}
      </div>

      <div className="card p-4 sm:p-6 bg-surface space-y-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by section name, program, or department..." />
        {loading && !data ? (
          <SkeletonTable rows={4} cols={3} />
        ) : filtered?.length === 0 ? (
          <p className="text-xs text-tertiary text-center py-8">No sections found.</p>
        ) : (
          <>
            <div className="desktop-only tbl">
              <table>
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((s) => (
                    <tr key={s.id}>
                      <td className="font-mono text-xs font-bold text-secondary">{s.program}-{s.name}</td>
                      <td className="text-primary font-medium">{sectionDeptName(s)}</td>
                      <td>
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${s.isDisabled ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"}`}>
                          {s.isDisabled ? "Disabled" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-3 text-center">
                        <IosButton variant="plain" size="xs" onClick={() => startEditing(s)}>Edit</IosButton>
                        <IosButton variant="plain" size="xs" onClick={() => handleToggleStatus(s)} className={s.isDisabled ? "!text-green-600" : "!text-red-500"}>
                          {s.isDisabled ? "Enable" : "Disable"}
                        </IosButton>
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
                      <p className="text-sm font-bold text-primary font-mono">{s.program}-{s.name}</p>
                      <p className="text-xs text-tertiary">{sectionDeptName(s)}</p>
                    </div>
                    <span className={`shrink-0 inline-flex px-2 py-1 text-[10px] font-bold rounded-full ${s.isDisabled ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"}`}>
                      {s.isDisabled ? "Disabled" : "Active"}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <IosButton variant="tinted" size="sm" onClick={() => startEditing(s)} className="flex-1">Edit</IosButton>
                    <IosButton variant={s.isDisabled ? "success" : "destructive"} size="sm" onClick={() => handleToggleStatus(s)} className="flex-1">
                      {s.isDisabled ? "Enable" : "Disable"}
                    </IosButton>
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
                <label className="block text-xs font-semibold text-tertiary mb-1">Department</label>
                <select value={editDeptId} onChange={(e) => { setEditDeptId(e.target.value); setEditCourseId("") }} className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required>
                  <option value="">Select department...</option>
                  {departments.map((d) => (<option key={d.id} value={d.id}>{d.name} ({d.code})</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Course / Program</label>
                <select value={editCourseId} onChange={(e) => setEditCourseId(e.target.value)} className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required disabled={!editDeptId}>
                  <option value="">{editDeptId ? "Select course..." : "Select department first"}</option>
                  {editCourses.map((c) => (<option key={c.id} value={c.id}>{c.code} — {c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-tertiary mb-1">Section Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value.toUpperCase())} className="w-full text-sm border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required />
              </div>
              {selectedEditCourse && editName.trim() && (
                <p className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Preview: <span className="font-mono text-amber-800">{clusteredPreview(selectedEditCourse.code, editName)}</span>
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <IosButton variant="gray" onClick={() => setEditingId(null)}>Cancel</IosButton>
              <IosButton type="button" loading={saving} variant="primary" onClick={handleEdit}>Save Changes</IosButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
