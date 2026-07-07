"use client"

import { useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getRemarkColor } from "@/lib/evaluation-utils"
import { downloadEvalDetailPdf } from "@/lib/evaluation-pdf"

interface SubjectRow {
  facultySubjectId: string
  facultyId: string
  facultyName: string
  facultyEmail: string
  subjectId: string
  subjectCode: string
  subjectName: string
  totalRespondents: number
  avgRating: number | null
  remarks: string | null
  professionalManner: number | null
  communicationWithStudent: number | null
  studentEngagement: number | null
  learningMaterials: number | null
  timeManagement: number | null
  experientialLearning: number | null
  respectUniqueness: number | null
  assessmentAndFeedback: number | null
  highestRubrics: { key: string; label: string; score: number }[]
  lowestRubrics: { key: string; label: string; score: number }[]
  sentimentScore: number | null
}

interface Props {
  subjects: SubjectRow[]
  departmentId: string
  semesterId: string
  search: string
  onSearchChange: (v: string) => void
  basePath?: string
}

type ViewTab = "by_subject" | "by_faculty"

type SortKey = "facultyName" | "subjectName" | "avgRating" | "sentimentScore" | "totalRespondents"

export default function DepartmentSubjectView({ subjects, departmentId, semesterId, search, onSearchChange, basePath = "/admin/evaluations/results" }: Props) {
  const router = useRouter()
  const [viewTab, setViewTab] = useState<ViewTab>("by_subject")
  const [sortKey, setSortKey] = useState<SortKey>("avgRating")
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc")
  const [expandedFaculty, setExpandedFaculty] = useState<string | null>(null)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    } else {
      setSortKey(key)
      setSortDir(key === "facultyName" || key === "subjectName" ? "asc" : "desc")
    }
  }

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return ""
    return sortDir === "desc" ? " \u25BC" : " \u25B2"
  }

  const formatScore = (v: number | null) => (v !== null ? v.toFixed(2) : "\u2014")

  const filteredSubjects = useMemo(() => {
    if (!search.trim()) return subjects
    const q = search.toLowerCase()
    return subjects.filter(
      (s) =>
        s.facultyName.toLowerCase().includes(q) ||
        s.facultyEmail.toLowerCase().includes(q) ||
        s.subjectCode.toLowerCase().includes(q) ||
        s.subjectName.toLowerCase().includes(q),
    )
  }, [subjects, search])

  const sortedSubjects = useMemo(() => {
    const sorted = [...filteredSubjects]
    sorted.sort((a, b) => {
      let aVal: number | string = a[sortKey] ?? ""
      let bVal: number | string = b[sortKey] ?? ""
      if (sortKey === "avgRating" || sortKey === "sentimentScore") {
        aVal = (a[sortKey] as number | null) ?? -1
        bVal = (b[sortKey] as number | null) ?? -1
        return sortDir === "desc" ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number)
      }
      if (typeof aVal === "number") {
        return sortDir === "desc" ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number)
      }
      return sortDir === "desc"
        ? String(bVal).localeCompare(String(aVal))
        : String(aVal).localeCompare(String(bVal))
    })
    return sorted
  }, [filteredSubjects, sortKey, sortDir])

  const facultyGroups = useMemo(() => {
    const map = new Map<string, { facultyId: string; facultyName: string; facultyEmail: string; subjects: SubjectRow[] }>()
    for (const s of filteredSubjects) {
      if (!map.has(s.facultyId)) {
        map.set(s.facultyId, { facultyId: s.facultyId, facultyName: s.facultyName, facultyEmail: s.facultyEmail, subjects: [] })
      }
      map.get(s.facultyId)!.subjects.push(s)
    }
    return Array.from(map.values())
  }, [filteredSubjects])

  const computeFacultyAvg = (subjects: SubjectRow[]) => {
    const ratings = subjects.filter((s) => s.avgRating !== null).map((s) => s.avgRating as number)
    if (ratings.length === 0) return null
    return Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length * 100) / 100
  }

  const getRemarkForAvg = (avg: number | null) => {
    if (avg === null) return null
    if (avg >= 4.5) return "Outstanding"
    if (avg >= 3.5) return "Very Satisfactory"
    if (avg >= 2.5) return "Satisfactory"
    if (avg >= 1.5) return "Unsatisfactory"
    return "Poor"
  }

  const apiPrefix = basePath.startsWith("/dean") ? "/api/dean" : "/api/admin"

  const handleConsolidatedPdf = useCallback(async (facultyId: string, facultyName: string, facultyEmail: string) => {
    try {
      const res = await fetch(
        `${apiPrefix}/evaluation-results/departments/${encodeURIComponent(departmentId)}/faculty/${encodeURIComponent(facultyId)}?semesterId=${encodeURIComponent(semesterId)}`,
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }))
        console.error(err.error)
        return
      }
      const data = await res.json()
      await downloadEvalDetailPdf({
        facultyName: data.faculty.name,
        facultyEmail: data.faculty.email,
        subjectCode: data.subject.code,
        subjectName: "Consolidated",
        departmentName: data.department.name,
        departmentCode: data.department.code,
        summary: data.summary,
        evaluations: data.evaluations,
      })
    } catch (e) {
      console.error("Consolidated PDF error:", e)
    }
  }, [apiPrefix, departmentId, semesterId])

  const tabs: { key: ViewTab; label: string }[] = [
    { key: "by_subject", label: "By Subject & Section" },
    { key: "by_faculty", label: "By Faculty" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {tabs.map((t) => {
          const active = viewTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setViewTab(t.key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                active
                  ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                  : "bg-surface text-tertiary border-default hover:border-amber-300 hover:text-secondary"
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search faculty, subject..."
          className="input text-xs flex-1 max-w-xs px-3 py-2 rounded-lg border border-strong bg-surface"
        />
        <span className="text-[10px] text-tertiary">
          {viewTab === "by_subject"
            ? `${sortedSubjects.length} subject${sortedSubjects.length !== 1 ? "s" : ""}`
            : `${facultyGroups.length} facult${facultyGroups.length !== 1 ? "ies" : "y"}`
          }
        </span>
      </div>

      {viewTab === "by_subject" ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wider text-tertiary border-b border-default">
                <th className="pb-3 pr-4 cursor-pointer hover:text-secondary" onClick={() => toggleSort("facultyName")}>
                  Faculty{sortArrow("facultyName")}
                </th>
                <th className="pb-3 pr-4 cursor-pointer hover:text-secondary" onClick={() => toggleSort("subjectName")}>
                  Subject{sortArrow("subjectName")}
                </th>
                <th className="pb-3 pr-4 cursor-pointer hover:text-secondary text-right" onClick={() => toggleSort("avgRating")}>
                  Avg Rating{sortArrow("avgRating")}
                </th>
                <th className="pb-3 pr-4 text-right">Highest Rubric</th>
                <th className="pb-3 pr-4 text-right">Lowest Rubric</th>
                <th className="pb-3 pr-4 cursor-pointer hover:text-secondary text-right" onClick={() => toggleSort("sentimentScore")}>
                  Sentiment{sortArrow("sentimentScore")}
                </th>
                <th className="pb-3 pr-4 cursor-pointer hover:text-secondary text-right" onClick={() => toggleSort("totalRespondents")}>
                  Responses{sortArrow("totalRespondents")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSubjects.map((row) => (
                <tr
                  key={row.facultySubjectId}
                  onClick={() =>
                    router.push(
                      `${basePath}/${departmentId}/${row.facultySubjectId}?semesterId=${encodeURIComponent(semesterId)}`,
                    )
                  }
                  className="border-b border-default hover:bg-surface-hover cursor-pointer transition-colors"
                >
                  <td className="py-3 pr-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-primary">{row.facultyName}</span>
                      <span className="text-[10px] text-tertiary">{row.facultyEmail}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-sm text-secondary">{row.subjectCode} {row.subjectName}</span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="text-sm font-bold">{formatScore(row.avgRating)}</span>
                    {row.remarks && (
                      <span className={`ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${getRemarkColor(row.remarks)}`}>
                        {row.remarks}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {row.highestRubrics.length > 0 && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        {row.highestRubrics[0].label} ({formatScore(row.highestRubrics[0].score)})
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {row.lowestRubrics.length > 0 && (
                      <span className="text-[11px] text-red-600 dark:text-red-400">
                        {row.lowestRubrics[0].label} ({formatScore(row.lowestRubrics[0].score)})
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {row.sentimentScore !== null ? (
                      <span className={`text-[11px] font-semibold ${
                        row.sentimentScore >= 0.05 ? "text-emerald-600 dark:text-emerald-400" :
                        row.sentimentScore <= -0.05 ? "text-red-600 dark:text-red-400" :
                        "text-amber-600 dark:text-amber-400"
                      }`}>
                        {row.sentimentScore.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-tertiary">&mdash;</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right text-sm text-secondary">{row.totalRespondents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {facultyGroups.map((group) => {
            const facultyAvg = computeFacultyAvg(group.subjects)
            const facultyRemark = getRemarkForAvg(facultyAvg)
            const totalResp = group.subjects.reduce((sum, s) => sum + s.totalRespondents, 0)
            const isExpanded = expandedFaculty === group.facultyId

            return (
              <div key={group.facultyId} className="card p-4 space-y-2">
                <div
                  onClick={() => setExpandedFaculty(isExpanded ? null : group.facultyId)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedFaculty(isExpanded ? null : group.facultyId) } }}
                  role="button"
                  tabIndex={0}
                  className="w-full flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-primary">{group.facultyName}</span>
                    <span className="text-[10px] text-tertiary">{group.facultyEmail}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-lg font-bold">{formatScore(facultyAvg)}</span>
                      {facultyRemark && (
                        <span className={`ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${getRemarkColor(facultyRemark)}`}>
                          {facultyRemark}
                        </span>
                      )}
                    </div>
                    <div className="text-right text-xs text-tertiary">
                      <div>{group.subjects.length} subject{group.subjects.length !== 1 ? "s" : ""}</div>
                      <div>{totalResp} response{totalResp !== 1 ? "s" : ""}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleConsolidatedPdf(group.facultyId, group.facultyName, group.facultyEmail)
                      }}
                      className="p-1.5 rounded-md text-tertiary hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Download consolidated PDF"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    <span className="text-tertiary text-xs">{isExpanded ? "\u25B2" : "\u25BC"}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-default pt-3">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-semibold uppercase tracking-wider text-tertiary border-b border-default">
                          <th className="pb-2 pr-3">Subject</th>
                          <th className="pb-2 pr-3 text-right">Avg Rating</th>
                          <th className="pb-2 pr-3 text-right">Highest</th>
                          <th className="pb-2 pr-3 text-right">Lowest</th>
                          <th className="pb-2 pr-3 text-right">Sentiment</th>
                          <th className="pb-2 text-right">Resp.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.subjects.map((s) => (
                          <tr
                            key={s.facultySubjectId}
                            onClick={() =>
                              router.push(
                                `${basePath}/${departmentId}/${s.facultySubjectId}?semesterId=${encodeURIComponent(semesterId)}`,
                              )
                            }
                            className="border-b border-default hover:bg-surface-hover cursor-pointer transition-colors"
                          >
                            <td className="py-2 pr-3 text-xs text-secondary">{s.subjectCode} {s.subjectName}</td>
                            <td className="py-2 pr-3 text-right text-xs font-semibold">{formatScore(s.avgRating)}</td>
                            <td className="py-2 pr-3 text-right text-[10px] text-emerald-600 dark:text-emerald-400">
                              {s.highestRubrics.length > 0 ? `${s.highestRubrics[0].label} (${formatScore(s.highestRubrics[0].score)})` : "\u2014"}
                            </td>
                            <td className="py-2 pr-3 text-right text-[10px] text-red-600 dark:text-red-400">
                              {s.lowestRubrics.length > 0 ? `${s.lowestRubrics[0].label} (${formatScore(s.lowestRubrics[0].score)})` : "\u2014"}
                            </td>
                            <td className="py-2 pr-3 text-right text-[10px]">
                              {s.sentimentScore !== null ? (
                                <span className={`font-semibold ${
                                  s.sentimentScore >= 0.05 ? "text-emerald-600 dark:text-emerald-400" :
                                  s.sentimentScore <= -0.05 ? "text-red-600 dark:text-red-400" :
                                  "text-amber-600 dark:text-amber-400"
                                }`}>
                                  {s.sentimentScore.toFixed(4)}
                                </span>
                              ) : "\u2014"}
                            </td>
                            <td className="py-2 text-right text-xs text-secondary">{s.totalRespondents}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
