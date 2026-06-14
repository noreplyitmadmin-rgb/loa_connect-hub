"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import html2canvas from "html2canvas"
import type { FacultyStatsData, RawAppointmentData, ConsultationSummaryData } from "@/lib/types"

const ReportCharts = dynamic(() => import("@/features/reports/components/reports/ReportCharts").then((m) => ({ default: m.ReportCharts })), {
  loading: () => <div className="h-48 bg-surface rounded-xl animate-pulse" />,
})
const ReportsView = dynamic(() => import("@/features/reports/components/reports/ReportsView").then((m) => ({ default: m.ReportsView })), {
  loading: () => <div className="h-64 bg-surface rounded-xl animate-pulse" />,
})
const ConsultationSummaryView = dynamic(() => import("@/features/reports/components/reports/ConsultationSummaryView").then((m) => ({ default: m.ConsultationSummaryView })), {
  loading: () => <div className="h-64 bg-surface rounded-xl animate-pulse" />,
})
const ScheduleView = dynamic(() => import("@/features/reports/components/reports/ScheduleView").then((m) => ({ default: m.ScheduleView })), {
  loading: () => <div className="h-64 bg-surface rounded-xl animate-pulse" />,
})

type TabId = "performance" | "summary"

const TABS: { id: TabId; label: string }[] = [
  { id: "performance", label: "Performance" },
  { id: "summary", label: "Consultation Summary" },
]

interface DeanReportsTabsProps {
  stats: FacultyStatsData[]
  rawAppointments: RawAppointmentData[]
  summaries: ConsultationSummaryData[]
}

export function DeanReportsTabs({
  stats,
  rawAppointments,
  summaries,
}: DeanReportsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("performance")
  const [summaryView, setSummaryView] = useState<"timeline" | "details">("timeline")

  const totalConsultations = stats.reduce((sum, s) => sum + s.total, 0)
  const totalCompleted = stats.reduce((sum, s) => sum + s.completed, 0)
  const totalPending = stats.reduce((sum, s) => sum + s.pending, 0)
  const overallCompletionRate = totalConsultations > 0
    ? Math.round((totalCompleted / totalConsultations) * 100)
    : 0

  // ── CSV helpers ──────────────────────────────────
  const esc = useCallback((val: unknown): string => {
    const str = String(val ?? "")
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }, [])

  const downloadCSV = useCallback((rows: string[][], filename: string) => {
    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const exportPerformanceCSV = useCallback(() => {
    const dateStr = new Date().toISOString().slice(0, 10)
    const rows: string[][] = []
    rows.push(["Faculty", "Total", "Completed", "Pending", "Cancelled", "Completion Rate"])
    for (const s of stats) {
      rows.push([esc(s.facultyName), String(s.total), String(s.completed), String(s.pending), String(s.cancelled), `${s.completionRate}%`])
    }
    rows.push([])
    if (rawAppointments.length > 0) {
      rows.push(["Faculty", "Student", "Date", "Start", "End", "Status", "Title"])
      for (const a of rawAppointments) {
        rows.push([esc(a.facultyName), esc(a.studentName), a.date, a.startTime, a.endTime, a.status, esc(a.title)])
      }
    }
    downloadCSV(rows, `Performance_${dateStr}.csv`)
  }, [stats, rawAppointments, esc, downloadCSV])

  const exportSummaryCSV = useCallback(() => {
    const dateStr = new Date().toISOString().slice(0, 10)
    const rows: string[][] = [["Faculty", "Date", "Start", "End", "Student", "Concern", "Action Taken", "Remarks", "Has Files", "Status"]]
    for (const s of summaries) {
      rows.push([
        esc(s.facultyName), s.date, s.startTime, s.endTime, esc(s.studentName),
        esc(s.description || s.title || ""),
        esc(s.actionTaken || (s.status !== "COMPLETED" ? "Not yet completed" : "")),
        esc(s.additionalRemarks || ""),
        s.hasFiles ? "Yes" : "No", s.status,
      ])
    }
    downloadCSV(rows, `Consultation_Summary_${dateStr}.csv`)
  }, [summaries, esc, downloadCSV])

  // ── Per-tab PDF export ───────────────────────────
  const exportTabPdf = useCallback(async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId)
    if (!element) return

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    })

    const imgData = canvas.toDataURL("image/png")
    const { jsPDF } = await import("jspdf")
    const pdf = new jsPDF("p", "mm", "a4")
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 10
    const imgWidth = pageWidth - margin * 2
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    if (imgHeight <= pageHeight - margin * 2) {
      pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight)
    } else {
      // Multi-page: render image across multiple pages
      let remaining = imgHeight
      let yOffset = 0
      while (remaining > 0) {
        if (yOffset > 0) pdf.addPage()
        const pageImgHeight = Math.min(remaining, pageHeight - margin * 2)
        // Use clipping to only show the relevant portion
        pdf.addImage(
          imgData, "PNG",
          margin, margin - yOffset,
          imgWidth, imgHeight,
          undefined,
          "FAST"
        )
        remaining -= pageImgHeight
        yOffset += pageImgHeight
      }
    }

    pdf.save(`${filename}.pdf`)
  }, [])

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-surface rounded-xl w-fit transition-all duration-200">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-surface text-primary shadow-sm"
                  : "text-tertiary hover:text-secondary"
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Performance Tab ─────────────────────────── */}
      {activeTab === "performance" && (
        <>
          <div className="flex items-center justify-between">
            <div />
            <div className="flex items-center gap-2">
              <PdfExportButton onClick={() => exportTabPdf("pdf-performance", `Performance_${new Date().toISOString().slice(0, 10)}`)} />
              <ExportCsvButton onClick={exportPerformanceCSV} />
            </div>
          </div>
          <div id="pdf-performance" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <SummaryCard label="Total Consultations" value={totalConsultations} color="blue" />
              <SummaryCard label="Overall Completion Rate" value={`${overallCompletionRate}%`} color="green" />
              <SummaryCard label="Pending Requests" value={totalPending} color="amber" />
            </div>
            <ReportCharts stats={stats} />
            <ReportsView stats={stats} rawAppointments={rawAppointments} />
          </div>
        </>
      )}

      {/* ── Consultation Summary Tab ────────────────── */}
      {activeTab === "summary" && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 p-1 bg-surface rounded-xl w-fit transition-all duration-200">
              <button
                onClick={() => setSummaryView("timeline")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  summaryView === "timeline"
                    ? "bg-surface text-primary shadow-sm"
                    : "text-tertiary hover:text-secondary"
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setSummaryView("details")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  summaryView === "details"
                    ? "bg-surface text-primary shadow-sm"
                    : "text-tertiary hover:text-secondary"
                }`}
              >
                Table
              </button>
            </div>
            <div className="flex items-center gap-2">
              <PdfExportButton onClick={() => exportTabPdf("pdf-summary", `Summary_${new Date().toISOString().slice(0, 10)}`)} />
              <ExportCsvButton onClick={exportSummaryCSV} />
            </div>
          </div>
          <div id="pdf-summary">
            {summaryView === "timeline" ? (
              <ScheduleView rawAppointments={rawAppointments} />
            ) : (
              <ConsultationSummaryView summaries={summaries} />
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ExportCsvButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-default text-xs font-semibold text-secondary hover:bg-surface-hover hover:border-strong transition-all duration-200"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Export CSV
    </button>
  )
}

function PdfExportButton({ onClick, label = "PDF" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-default text-xs font-semibold text-secondary hover:bg-surface-hover hover:border-strong transition-all duration-200"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      {label}
    </button>
  )
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color: "blue" | "green" | "amber"
}) {
  const colorClasses = {
    blue: "from-blue-50 to-blue-100/50 border-blue-200/60 text-blue-700",
    green: "from-emerald-50 to-emerald-100/50 border-emerald-200/60 text-emerald-700",
    amber: "from-amber-50 to-amber-100/50 border-amber-200/60 text-amber-700",
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${colorClasses[color]} p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
    >
      <p className="text-4xl font-bold tracking-tight">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wider mt-1.5 opacity-75">
        {label}
      </p>
    </div>
  )
}
