"use client"

import { useState, useEffect } from "react"
import { SegmentedControl } from "@/features/admin-data/components/shared"
import { SemestersTab } from "@/features/admin-data/components/SemestersTab"
import { DepartmentsCoursesTab } from "@/features/admin-data/components/DepartmentsCoursesTab"
import { SubjectsSectionsTab } from "@/features/admin-data/components/SubjectsSectionsTab"
import { FacultyLoadingTab } from "@/features/admin-data/components/FacultyLoadingTab"
import type { MainTab } from "@/features/admin-data/components/types"

const mainTabs: { key: MainTab; label: string }[] = [
  { key: "semesters", label: "Semesters" },
  { key: "departments", label: "Departments & Courses" },
  { key: "subjects", label: "Subjects & Sections" },
  { key: "faculty_enroll", label: "Faculty Loading & Enrollments" },
]

export default function AcademicInfrastructurePage() {
  const [mainTab, setMainTab] = useState<MainTab>("semesters")

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
      <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4 sm:px-0">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-surface-dim rounded" />
          <div className="h-4 w-96 bg-surface-dim rounded" />
        </div>
      </div>
    )
  }

  if (accessState === "locked") {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4 sm:px-0">
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
    <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4 sm:px-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-primary">Academic Infrastructure</h1>
        <p className="text-xs sm:text-sm text-tertiary mt-0.5 sm:mt-1">
          Manage departments, courses, subjects, sections, faculty mappings, student enrollments, and semesters.
        </p>
      </div>

      <SegmentedControl
        options={mainTabs}
        selected={mainTab}
        onSelect={(key) => setMainTab(key)}
      />

      {mainTab === "semesters" && <SemestersTab />}
      {mainTab === "departments" && <DepartmentsCoursesTab />}
      {mainTab === "subjects" && <SubjectsSectionsTab />}
      {mainTab === "faculty_enroll" && <FacultyLoadingTab />}

      <div className="text-xs text-tertiary bg-amber-50/50 border border-amber-200 rounded-lg px-4 py-3 leading-relaxed">
        <strong className="text-amber-700">Disclaimer:</strong> This system is by no means a replacement for any internal bespoke application that the institution is currently using.
      </div>
    </div>
  )
}
