"use client"

import { useCallback } from "react"
import { downloadEvalDetailPdf } from "@/lib/evaluation-pdf"
import type { RubricKey } from "@/lib/evaluation-utils"
import { CATEGORY_KEYS } from "@/lib/evaluation-utils"

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

interface Props {
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
  className?: string
}

export function DownloadEvalPdfButton({
  facultyName,
  facultyEmail,
  subjectCode,
  subjectName,
  departmentName,
  departmentCode,
  semesterLabel,
  summary,
  evaluations,
  className = "",
}: Props) {
  const handleDownload = useCallback(async () => {
    await downloadEvalDetailPdf({
      facultyName,
      facultyEmail,
      subjectCode,
      subjectName,
      departmentName,
      departmentCode,
      semesterLabel,
      summary,
      evaluations,
    })
  }, [facultyName, facultyEmail, subjectCode, subjectName, departmentName, departmentCode, semesterLabel, summary, evaluations])

  return (
    <button
      onClick={handleDownload}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors ${className}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Download PDF
    </button>
  )
}
