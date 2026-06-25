"use client"

import { useState } from "react"
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

  return (
    <div className="w-full space-y-6 pb-12 px-4 sm:px-0 animate-ios-slide-in">
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
    </div>
  )
}
