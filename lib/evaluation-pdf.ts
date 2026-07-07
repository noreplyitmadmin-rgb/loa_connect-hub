import type { RubricKey } from "./evaluation-utils"
import { CATEGORY_LABELS } from "./evaluation-utils"

const CATEGORY_DISPLAY: Record<string, string> = {
  professionalManner: "Professional Manner",
  communicationWithStudent: "Communication with Students",
  studentEngagement: "Student Engagement",
  learningMaterials: "Learning Materials",
  timeManagement: "Time Management",
  experientialLearning: "Experiential Learning Provided to Students",
  respectUniqueness: "Respect the Uniqueness of the Students",
  assessmentAndFeedback: "Assessment and Feedback",
}

interface EvalRow {
  evaluationId: string
  submittedAt: string | null
  generalRating: number | null
  professionalManner: number | null
  communicationWithStudent: number | null
  studentEngagement: number | null
  learningMaterials: number | null
  timeManagement: number | null
  experientialLearning: number | null
  respectUniqueness: number | null
  assessmentAndFeedback: number | null
  comment: string | null
  sentimentLabel: string | null
  sentimentScore: number | null
}

interface PdfData {
  facultyName: string
  facultyEmail?: string
  subjectCode: string
  subjectName: string
  departmentName?: string
  departmentCode?: string
  semesterLabel?: string
  summary: {
    totalRespondents: number
    avgRating: number | null
    remarks: string | null
    sentimentScore: number | null
  } & Record<string, number | null>
  evaluations: EvalRow[]
}

function getRemark(val: number | null): string | null {
  if (val === null) return null
  if (val >= 4.5) return "Outstanding"
  if (val >= 3.5) return "Very Satisfactory"
  if (val >= 2.5) return "Satisfactory"
  if (val >= 1.5) return "Unsatisfactory"
  return "Poor"
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
}

export async function downloadEvalDetailPdf(data: PdfData) {
  const [jsPDF, autoTable] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ])
  const { default: JsPDF } = jsPDF
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  const pageW = doc.internal.pageSize.getWidth()
  let y = 12

  // ── Logo ──
  try {
    const logoResp = await fetch("/logo-blk.png")
    const logoBlob = await logoResp.blob()
    const logoBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(logoBlob)
    })
    const logoWidth = 28
    doc.addImage(logoBase64, "PNG", (pageW - logoWidth) / 2, y, logoWidth, 0)
    y += 10
  } catch {
    y += 4
  }

  // ── Address ──
  doc.setFontSize(7)
  doc.setTextColor(80, 80, 80)
  doc.text("Main Bldg. Km. 30 National Road, Tunasan, Muntinlupa City", pageW / 2, y, { align: "center" })
  y += 5

  // ── Divider ──
  doc.setDrawColor(180, 180, 180)
  doc.line(14, y, pageW - 14, y)
  y += 6

  // ── Title ──
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  doc.text("INDIVIDUAL FACULTY EVALUATION REPORT", pageW / 2, y, { align: "center" })
  y += 8

  // ── Info ──
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  const deptLine = data.departmentName
    ? `${data.departmentName}${data.departmentCode ? ` (${data.departmentCode})` : ""}`
    : null
  const semLabel = data.semesterLabel ?? `Semester`
  const infoLines = [
    `Faculty: ${data.facultyName}`,
    data.facultyEmail ? `Email: ${data.facultyEmail}` : null,
    `Subject: ${data.subjectCode} \u2013 ${data.subjectName}`,
    deptLine ? `Department: ${deptLine}` : null,
    `Semester: ${semLabel}`,
    `Date Generated: ${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`,
  ].filter(Boolean) as string[]
  for (const line of infoLines) {
    doc.text(line, 14, y)
    y += 4.5
  }
  y += 3

  // ── Rating Table ──
  const body: [string, string, string][] = []
  body.push(["", "Overall Rating", `${data.summary.avgRating?.toFixed(2) ?? "\u2014"} / 5.00`])
  for (const key of Object.keys(CATEGORY_LABELS) as RubricKey[]) {
    const label = CATEGORY_DISPLAY[key] ?? CATEGORY_LABELS[key]
    const val = data.summary[key]
    body.push([label, "", val !== null ? val.toFixed(2) : "\u2014"])
  }

  autoTable.default(doc, {
    theme: "grid",
    head: [["Category", "", "Rating"]],
    body,
    startY: y,
    styles: { fontSize: 9, cellPadding: 2.5, halign: "center" },
    headStyles: { fillColor: [59, 130, 246], fontStyle: "bold" },
    columnStyles: { 0: { halign: "left", fontStyle: "bold", cellWidth: 80 }, 1: { cellWidth: 40 } },
    margin: { left: 20, right: 20 },
  })
  y = (doc as any).lastAutoTable.finalY + 8

  // ── Overall Rating ──
  const remark = data.summary.remarks ?? getRemark(data.summary.avgRating) ?? "\u2014"
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.text("Overall Rating", pageW / 2, y, { align: "center" })
  y += 6
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.text(
    `${data.summary.avgRating?.toFixed(2) ?? "\u2014"} / 5.00 \u2013 ${remark}`,
    pageW / 2,
    y,
    { align: "center" },
  )
  y += 8

  // ── Student Comments ──
  const comments = data.evaluations.filter((e) => e.comment).map((e) => e.comment as string)
  if (comments.length > 0) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("Student Comments", 14, y)
    y += 6

    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    const maxComments = 30
    const showComments = comments.slice(0, maxComments)
    for (const c of showComments) {
      const lines = doc.splitTextToSize(`\u2022 ${c}`, pageW - 28)
      if (y + lines.length * 4 > 270) {
        doc.addPage()
        y = 14
      }
      for (const l of lines) {
        doc.text(l, 14, y)
        y += 4
      }
      y += 1
    }
    if (comments.length > maxComments) {
      doc.text(`... and ${comments.length - maxComments} more comments`, 14, y)
      y += 5
    }
  } else {
    doc.setFontSize(10)
    doc.setFont("helvetica", "italic")
    doc.text("No student comments submitted.", 14, y)
    y += 6
  }
  y += 3

  // ── Sentiment Interpretation ──
  const sentimentScore = data.summary.sentimentScore
  if (sentimentScore !== null) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("Sentiment Analysis", 14, y)
    y += 6

    const pct = ((sentimentScore + 1) / 2 * 100).toFixed(1)
    const positiveCount = data.evaluations.filter(
      (e) => e.sentimentLabel === "positive" || (e.sentimentScore ?? 0) > 0.05,
    ).length
    const negativeCount = data.evaluations.filter(
      (e) => e.sentimentLabel === "negative" || (e.sentimentScore ?? 0) < -0.05,
    ).length
    const neutralCount = data.evaluations.length - positiveCount - negativeCount
    const total = data.evaluations.length

    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    const interpLines = doc.splitTextToSize(
      `Sentiment score: ${sentimentScore.toFixed(4)} (${pct}% positivity). ` +
      `Positive: ${positiveCount}/${total} (${total > 0 ? (positiveCount / total * 100).toFixed(1) : 0}%), ` +
      `Neutral: ${neutralCount}/${total} (${total > 0 ? (neutralCount / total * 100).toFixed(1) : 0}%), ` +
      `Negative: ${negativeCount}/${total} (${total > 0 ? (negativeCount / total * 100).toFixed(1) : 0}%).`,
      pageW - 28,
    )
    if (y + interpLines.length * 4 > 270) {
      doc.addPage()
      y = 14
    }
    for (const l of interpLines) {
      doc.text(l, 14, y)
      y += 4
    }
  }

  // ── Save ──
  const filename = `${slug(data.facultyName)}_${data.subjectCode}_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}
