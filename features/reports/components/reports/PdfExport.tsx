"use client"

import { useCallback } from "react"
import type {
  FacultyStatsData,
  RawAppointmentData,
  ConsultationSummaryData,
  DepartmentFrequencyEntry,
  FacultyFrequencyData,
  DepartmentYearlyEntry,
  FacultyYearlyData,
} from "@/lib/types"

interface PdfExportProps {
  departmentName: string
  stats: FacultyStatsData[]
  rawAppointments: RawAppointmentData[]
  summaries?: ConsultationSummaryData[]
  departmentFrequency?: DepartmentFrequencyEntry[]
  facultyFrequency?: FacultyFrequencyData[]
  departmentYearlyFrequency?: DepartmentYearlyEntry[]
  facultyYearlyFrequency?: FacultyYearlyData[]
}

export function PdfExport({
  departmentName,
  stats,
  rawAppointments,
  summaries,
  departmentFrequency,
  facultyFrequency,
  departmentYearlyFrequency,
  facultyYearlyFrequency,
}: PdfExportProps) {
  const exportFullReport = useCallback(async () => {
    const { jsPDF } = await import("jspdf")
    await import("jspdf-autotable")
    const pdf = new jsPDF("p", "mm", "a4")
    const pageWidth = pdf.internal.pageSize.getWidth()
    const margin = 14
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const addSection = (title: string, y: number): number => {
      if (y > 250) {
        pdf.addPage()
        y = 20
      }
      pdf.setFontSize(14)
      pdf.text(title, margin, y)
      return y + 7
    }

    const subtitle = (text: string, y: number): number => {
      if (y > 260) { pdf.addPage(); y = 20 }
      pdf.setFontSize(12)
      pdf.text(text, margin, y)
      return y + 6
    }

    let y: number

    // ── Title Page ──
    pdf.setFontSize(22)
    pdf.text("Department Performance Report", pageWidth / 2, 50, { align: "center" })
    pdf.setFontSize(13)
    pdf.text(departmentName, pageWidth / 2, 60, { align: "center" })
    pdf.setFontSize(10)
    pdf.text(`Generated: ${dateStr}`, pageWidth / 2, 68, { align: "center" })

    pdf.addPage()
    y = 20

    // ── 1. Faculty Summary ──
    y = addSection("Faculty Consultation Summary", y)
    pdf.autoTable({
      head: [["Faculty", "Total", "Completed", "Pending", "Cancelled", "Rate"]],
      body: stats.map((s) => [
        s.facultyName,
        String(s.total),
        String(s.completed),
        String(s.pending),
        String(s.cancelled),
        `${s.completionRate}%`,
      ]),
      startY: y,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [212, 160, 71] },
    })
    y = pdf.lastAutoTable.finalY + 10

    // ── 2. Schedule ──
    if (rawAppointments.length > 0) {
      y = addSection("Individual Appointments (Schedule)", y)
      pdf.autoTable({
        head: [["Faculty", "Student", "Date", "Start", "End", "Status"]],
        body: rawAppointments.map((a) => [
          a.facultyName, a.studentName, a.date, a.startTime, a.endTime, a.status,
        ]),
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7 },
        headStyles: { fillColor: [212, 160, 71] },
      })
      y = pdf.lastAutoTable.finalY + 10
    }

    // ── 3. Consultation Summary ──
    if (summaries && summaries.length > 0) {
      y = addSection("Consultation Summary", y)
      pdf.autoTable({
        head: [["Faculty", "Date", "Student", "Concern", "Action Taken", "Status"]],
        body: summaries.map((s) => [
          s.facultyName,
          s.date,
          s.studentName,
          s.description || s.title || "",
          s.actionTaken || (s.status !== "COMPLETED" ? "Not yet completed" : ""),
          s.status,
        ]),
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7 },
        headStyles: { fillColor: [212, 160, 71] },
        columnStyles: {
          3: { cellWidth: 40 },
          4: { cellWidth: 40 },
        },
      })
      y = pdf.lastAutoTable.finalY + 10
    }

    // ── 4. Department Monthly Frequency ──
    if (departmentFrequency && departmentFrequency.length > 0) {
      y = addSection("Department Monthly Consultation Frequency", y)
      pdf.autoTable({
        head: [["Month", "Year", "Count"]],
        body: departmentFrequency.map((f) => [f.monthName, String(f.year), String(f.count)]),
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [212, 160, 71] },
      })
      y = pdf.lastAutoTable.finalY + 10
    }

    // ── 5. Department Yearly Frequency ──
    if (departmentYearlyFrequency && departmentYearlyFrequency.length > 0) {
      y = addSection("Department Yearly Consultation Frequency", y)
      pdf.autoTable({
        head: [["Year", "Count"]],
        body: departmentYearlyFrequency.map((f) => [String(f.year), String(f.count)]),
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [212, 160, 71] },
      })
      y = pdf.lastAutoTable.finalY + 10
    }

    // ── 6. Per-Faculty Monthly ──
    if (facultyFrequency && facultyFrequency.length > 0) {
      y = addSection("Per-Faculty Monthly Frequency Breakdown", y)

      pdf.autoTable({
        head: [["Faculty", "Total", "Avg/Month"]],
        body: facultyFrequency.map((f) => [
          f.facultyName,
          String(f.total),
          f.averagePerMonth.toFixed(1),
        ]),
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [212, 160, 71] },
      })
      y = pdf.lastAutoTable.finalY + 8

      y = subtitle("Per-Faculty Monthly Details", y)
      pdf.autoTable({
        head: [["Faculty", "Month", "Count"]],
        body: facultyFrequency.flatMap((f) =>
          f.monthlyCounts.map((mc) => [f.facultyName, mc.monthName, String(mc.count)])
        ),
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7 },
        headStyles: { fillColor: [212, 160, 71] },
      })
      y = pdf.lastAutoTable.finalY + 10
    }

    // ── 7. Per-Faculty Yearly ──
    if (facultyYearlyFrequency && facultyYearlyFrequency.length > 0) {
      y = addSection("Per-Faculty Yearly Frequency Breakdown", y)

      pdf.autoTable({
        head: [["Faculty", "Total", "Avg/Year"]],
        body: facultyYearlyFrequency.map((f) => [
          f.facultyName,
          String(f.total),
          f.averagePerYear.toFixed(1),
        ]),
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [212, 160, 71] },
      })
      y = pdf.lastAutoTable.finalY + 8

      y = subtitle("Per-Faculty Yearly Details", y)
      pdf.autoTable({
        head: [["Faculty", "Year", "Count"]],
        body: facultyYearlyFrequency.flatMap((f) =>
          f.yearlyCounts.map((yc) => [f.facultyName, String(yc.year), String(yc.count)])
        ),
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7 },
        headStyles: { fillColor: [212, 160, 71] },
      })
    }

    const filename = `${departmentName.replace(/\s+/g, "_")}_Full_Report_${new Date().toISOString().slice(0, 10)}.pdf`
    pdf.save(filename)
  }, [
    departmentName,
    stats,
    rawAppointments,
    summaries,
    departmentFrequency,
    facultyFrequency,
    departmentYearlyFrequency,
    facultyYearlyFrequency,
  ])

  return (
    <button
      onClick={exportFullReport}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gold-600 text-white text-sm font-semibold hover:bg-gold-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-sm hover:shadow-md"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      Export Full Report (PDF)
    </button>
  )
}
