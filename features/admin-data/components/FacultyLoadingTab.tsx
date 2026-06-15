"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useApiGet } from "@/lib/api/client"
import { usePagination, Paginator } from "@/components/ui/Paginator"
import { SkeletonTable } from "@/components/ui/Skeleton"
import IosButton from "@/components/ui/IosButton"
import LockedTab from "@/components/ui/LockedTab"
import { SegmentedControl, SearchInput } from "./shared"
import { EnrollmentsTab } from "./EnrollmentsTab"
import type { DepartmentData } from "@/lib/types"
import type { FacEnrollTab, Subject, Section, FacultyMapping } from "./types"

export function FacultyLoadingTab() {
  const [facEnrollTab, setFacEnrollTab] = useState<FacEnrollTab>("faculty")
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

// ═══ FACULTY LOADING TAB ══════════════════════════════════════════════════════

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

  const { data: enrollmentsData } = useApiGet<{ data: { id: string; faculty_subject_id: string | null }[] }>("/api/data/evaluation-mappings?type=student")

  const faculties = (allUsers?.users ?? []).filter((u) => u.email.endsWith("@lyceumalabang.edu.ph") && u.email !== "admin@lyceumalabang.edu.ph" && u.id !== "a0000000-0000-0000-0000-000000000001")
  const subjects = subjectsData?.data ?? []
  const sections = sectionsData?.data ?? []
  const departments = allUsers?.departments ?? []

  const enrollmentCountByFsId = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of enrollmentsData?.data ?? []) {
      if (e.faculty_subject_id) {
        map.set(e.faculty_subject_id, (map.get(e.faculty_subject_id) ?? 0) + 1)
      }
    }
    return map
  }, [enrollmentsData])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formFaculty || !formSubject || !formSection) return
    const existing = data?.find(
      (m) => m.faculty.id === formFaculty && m.subject.id === formSubject && m.section.id === formSection
    )
    if (existing) {
      setFormError(`This faculty already handles "${existing.subject.code} - ${existing.subject.name}" for section ${existing.section.program}-${existing.section.name}.`)
      setTimeout(() => {
        tableRef.current?.querySelector(`[data-id="${existing.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 100)
      return
    }
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

  const groupedFaculty = useMemo(() => {
    const map = new Map<string, { faculty: FacultyMapping["faculty"]; mappings: FacultyMapping[] }>()
    for (const m of filtered) {
      if (!map.has(m.faculty.id)) {
        map.set(m.faculty.id, { faculty: m.faculty, mappings: [] })
      }
      map.get(m.faculty.id)!.mappings.push(m)
    }
    return Array.from(map.values())
  }, [filtered])

  const { page, totalPages, pageSize, paginatedItems, setPage, setPageSize } = usePagination(groupedFaculty, 25)

  const [selectedFacultyLoad, setSelectedFacultyLoad] = useState<FacultyMapping[] | null>(null)
  const facultyLoadPagination = usePagination(selectedFacultyLoad ?? [], 25)

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
            <select value={formFaculty} onChange={(e) => { setFormFaculty(e.target.value) }} className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required>
              <option value="">Select faculty...</option>
              {faculties.map((f) => (<option key={f.id} value={f.id}>{f.name} ({f.email})</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-tertiary mb-1">Subject</label>
            <select value={formSubject} onChange={(e) => { setFormSubject(e.target.value) }} className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required>
              <option value="">Select subject...</option>
              {subjects.map((s) => (<option key={s.id} value={s.id}>{s.code} - {s.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-tertiary mb-1">Section</label>
            <select value={formSection} onChange={(e) => { setFormSection(e.target.value) }} className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required>
              <option value="">Select section...</option>
              {sections.map((s) => (<option key={s.id} value={s.id}>{s.program} - {s.name}</option>))}
            </select>
          </div>
        </div>
        <div><IosButton type="submit" loading={formSaving} variant="primary">Add Mapping</IosButton></div>
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

        <SearchInput value={search} onChange={(v) => { setSearch(v) }} placeholder="Search by faculty name, email, subject code, or section..." />
        {loading && !data ? (
          <SkeletonTable rows={4} cols={3} />
        ) : groupedFaculty.length === 0 ? (
          <p className="text-xs text-tertiary text-center py-8">No mappings found.</p>
        ) : (
          <>
            <div ref={tableRef} className="desktop-only overflow-x-auto max-h-96 overflow-y-auto border border-default rounded-lg">
              <table className="w-full text-[11px] text-align-center">
                <thead>
                  <tr className="bg-surface-dim text-left text-[10px] font-bold text-tertiary uppercase tracking-wider border-b border-default sticky top-0">
                    <th className="p-2">Faculty</th>
                    <th className="p-2">Email</th>
                 
                    <th className="p-2">Headcount</th>
                    <th className="p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((group) => {
                    const headcount = group.mappings.reduce((sum, m) => sum + (enrollmentCountByFsId.get(m.id) ?? 0), 0)
                    return (
                      <tr key={group.faculty.id} className="border-b border-default hover:bg-surface-hover">
                        <td className="p-2 font-medium text-secondary">{group.faculty.name}</td>
                        <td className="p-2 text-tertiary">{group.faculty.email}</td>
       
                        <td className="p-2">
                          <span className="font-semibold text-secondary">{headcount}</span>
                        </td>
                        <td className="p-2">
                          <IosButton variant="plain" size="xs" onClick={() => setSelectedFacultyLoad(group.mappings)}>View Class Load</IosButton>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="mobile-only space-y-2">
              {paginatedItems.map((group) => {
                const headcount = group.mappings.reduce((sum, m) => sum + (enrollmentCountByFsId.get(m.id) ?? 0), 0)
                return (
                  <div key={group.faculty.id} className="p-4 rounded-xl bg-surface border border-default space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-primary truncate">{group.faculty.name}</p>
                        <p className="text-xs text-tertiary truncate">{group.faculty.email}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-xs font-semibold text-secondary">{group.mappings.length} Subject{group.mappings.length !== 1 ? "s" : ""}</span>
                        <span className="block text-xs text-tertiary">{headcount} Student{headcount !== 1 ? "s" : ""}</span>
                        <IosButton variant="plain" size="xs" onClick={() => setSelectedFacultyLoad(group.mappings)}>View</IosButton>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <Paginator page={page} totalPages={totalPages} pageSize={pageSize} totalItems={groupedFaculty.length} setPage={setPage} setPageSize={setPageSize} />
          </>
        )}
        {data && <p className="text-xs text-tertiary">{groupedFaculty.length} facult{groupedFaculty.length !== 1 ? "ies" : "y"} ({filtered.length} mapping{filtered.length !== 1 ? "s" : ""}){deptFilter !== "all" ? ` (${byDept.length} in department)` : ""}</p>}
      </div>

      {/* ── Faculty Load Modal ─────────────────────────────── */}
      {selectedFacultyLoad && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 bg-black/60" onClick={() => setSelectedFacultyLoad(null)}>
          <div className="bg-white dark:bg-surface-dim rounded-2xl w-full max-w-2xl mx-4 shadow-2xl border border-default overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-default">
              <div className="min-w-0">
                <p className="text-sm font-bold text-secondary truncate">{selectedFacultyLoad[0].faculty.name}</p>
                <p className="text-xs text-tertiary truncate">{selectedFacultyLoad.length} subject load{selectedFacultyLoad.length !== 1 ? "s" : ""}</p>
              </div>
              <IosButton variant="gray" size="xs" onClick={() => setSelectedFacultyLoad(null)}>
                <svg className="w-4 h-4 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </IosButton>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <table className="desktop-only w-full text-[11px]">
                <thead>
                  <tr className="text-left text-[10px] font-bold text-tertiary uppercase tracking-wider border-b border-default">
                    <th className="p-2 w-8">#</th>
                    <th className="p-2">Subject</th>
                    <th className="p-2">Section</th>
                    <th className="p-2 text-center">HeadCount</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyLoadPagination.paginatedItems.map((m, i) => {
                    const hc = enrollmentCountByFsId.get(m.id) ?? 0
                    return (
                      <tr key={m.id} className="border-b border-default hover:bg-surface-hover">
                        <td className="p-2 text-tertiary">{i + 1}</td>
                        <td className="p-2">
                          <span className="font-medium text-secondary">{m.subject.code}</span>
                          <span className="text-tertiary ml-1">- {m.subject.name}</span>
                        </td>
                        <td className="p-2 text-secondary">{m.section.program}-{m.section.name}</td>
                        <td className="p-2 text-center font-semibold text-secondary">{hc}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="mobile-only space-y-1.5">
                {facultyLoadPagination.paginatedItems.map((m, i) => {
                  const hc = enrollmentCountByFsId.get(m.id) ?? 0
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-2 py-2 rounded-lg bg-surface-hover/50 text-xs">
                      <span className="text-tertiary font-mono w-5 shrink-0 text-right">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-secondary truncate">{m.subject.code} - {m.subject.name}</p>
                        <p className="text-tertiary truncate">{m.section.program}-{m.section.name}</p>
                      </div>
                      <span className="shrink-0 text-right text-xs font-semibold text-secondary">{hc} student{hc !== 1 ? "s" : ""}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-3 border-t border-default bg-surface-dim text-xs text-tertiary">
              <span>{selectedFacultyLoad.length} subject load{selectedFacultyLoad.length !== 1 ? "s" : ""}</span>
              <Paginator page={facultyLoadPagination.page} totalPages={facultyLoadPagination.totalPages} pageSize={facultyLoadPagination.pageSize} totalItems={selectedFacultyLoad.length} setPage={facultyLoadPagination.setPage} setPageSize={facultyLoadPagination.setPageSize} showSizeSelector={false} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
