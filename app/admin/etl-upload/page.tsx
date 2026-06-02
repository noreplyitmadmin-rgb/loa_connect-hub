"use client"

import { useState, useRef } from "react"
import SubmitButton from "@/components/SubmitButton"
import { STUDENT_DOMAIN, FACULTY_DOMAIN } from "@/lib/constants"
import type { ValidateRow } from "@/app/api/admin/etl-upload/validate/route"

type Tab = "student" | "faculty"

const STUDENT_CSV_EXAMPLE = [
  "name,email,course",
  "Juan Dela Cruz,juan.delacruz@itmlyceumalabang.onmicrosoft.com,BSIT",
  "Maria Santos,maria.santos@itmlyceumalabang.onmicrosoft.com,BSCS",
].join("\n")

const FACULTY_CSV_EXAMPLE = [
  "name,email,department,dean",
  "Prof Juan,juan.prof@lyceumalabang.edu.ph,CCS,false",
  "Dean Maria,maria.dean@lyceumalabang.edu.ph,CCS,true",
].join("\n")

export default function EtlUploadPage() {
  const [tab, setTab] = useState<Tab>("student")
  const [csvText, setCsvText] = useState("")
  const [rows, setRows] = useState<ValidateRow[]>([])
  const [validationDone, setValidationDone] = useState(false)
  const [validating, setValidating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<{ created: number; failed: number } | null>(null)
  const [resultDetails, setResultDetails] = useState<{ name: string; email: string; role: string }[]>([])
  const [failedDetails, setFailedDetails] = useState<{ email: string; error: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (text: string) => {
    setCsvText(text)
    setValidationDone(false)
    setRows([])
    setResult(null)
    setResultDetails([])
    setFailedDetails([])
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      handleFile((ev.target?.result as string) || "")
    }
    reader.readAsText(file)
  }

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleFile(e.target.value)
  }

  const handleValidate = async () => {
    if (!csvText.trim()) return
    setValidating(true)
    setValidationDone(false)
    setRows([])
    setResult(null)
    try {
      const res = await fetch("/api/admin/etl-upload/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tab, csv: csvText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Validation failed")
      setRows(data.rows || [])
      setValidationDone(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Validation failed")
    } finally {
      setValidating(false)
    }
  }

  const handleUpdateEmail = (rowIndex: number, newEmail: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowIndex !== rowIndex) return r
        const errors: string[] = []
        if (!newEmail) errors.push("Email is required")
        if (newEmail) {
          const domain = tab === "student" ? STUDENT_DOMAIN : FACULTY_DOMAIN
          if (!newEmail.toLowerCase().trim().endsWith(domain)) {
            errors.push(`Email must end with ${domain}`)
          }
        }
        return {
          ...r,
          email: newEmail,
          errors,
          isValid: errors.length === 0,
        }
      })
    )
  }

  const handleRemoveRow = (rowIndex: number) => {
    setRows((prev) => prev.filter((r) => r.rowIndex !== rowIndex))
  }

  const handleConfirm = async () => {
    const validRows = rows.filter((r) => r.isValid)
    if (validRows.length === 0) return
    setConfirming(true)
    setResult(null)
    try {
      const res = await fetch("/api/admin/etl-upload/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tab,
          rows: validRows.map((r) => ({
            name: r.name,
            email: r.email,
            department: r.department,
            course: r.course,
            isDean: r.isDean,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      setResult({ created: data.created?.length || 0, failed: data.failed?.length || 0 })
      setResultDetails(data.created || [])
      setFailedDetails(data.failed || [])
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setConfirming(false)
    }
  }

  const handleReset = () => {
    setCsvText("")
    setRows([])
    setValidationDone(false)
    setResult(null)
    setResultDetails([])
    setFailedDetails([])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const validCount = rows.filter((r) => r.isValid).length
  const invalidCount = rows.length - validCount
  const hasAllValid = rows.length > 0 && invalidCount === 0

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">ETL User Upload</h1>
        {validationDone && (
          <button onClick={handleReset} className="text-xs text-slate-400 hover:text-slate-600 underline">
            Start Over
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => { setTab("student"); handleReset() }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            tab === "student"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Student Upload
        </button>
        <button
          onClick={() => { setTab("faculty"); handleReset() }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            tab === "faculty"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Faculty / Dean Upload
        </button>
      </div>

      {/* Upload Area */}
      {!validationDone && !result && (
        <div className="space-y-4">
          <div className="card p-6 bg-white space-y-4">
            <h2 className="text-sm font-bold text-slate-800">CSV Format</h2>
            <p className="text-xs text-slate-500">
              Upload a CSV file with the following columns. Paste your CSV or upload a file.
            </p>

            <div className="bg-slate-50 rounded-lg p-4 font-mono text-xs text-slate-600 whitespace-pre overflow-x-auto">
              {tab === "student" ? STUDENT_CSV_EXAMPLE : FACULTY_CSV_EXAMPLE}
            </div>

            <div className="flex items-center gap-4">
              <label className="btn-secondary text-sm cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload CSV File
                <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
              <span className="text-xs text-slate-400">or paste below</span>
            </div>

            <textarea
              value={csvText}
              onChange={handlePaste}
              placeholder="Paste your CSV content here..."
              rows={6}
              className="w-full border border-slate-200 rounded-lg p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />

            <SubmitButton onClick={handleValidate} loading={validating} disabled={!csvText.trim()}>
              Validate Rows
            </SubmitButton>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {validationDone && !result && rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-slate-800">
                Preview ({rows.length} rows)
              </h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                hasAllValid
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}>
                {validCount} valid{invalidCount > 0 ? `, ${invalidCount} need attention` : ""}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 bg-white rounded-xl border border-slate-200">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</th>
                  {tab === "faculty" && (
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Department</th>
                  )}
                  {tab === "student" && (
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Course</th>
                  )}
                  {tab === "faculty" && (
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dean</th>
                  )}
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.rowIndex} className={`hover:bg-slate-50 transition-colors ${!row.isValid ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{row.rowIndex}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">{row.name}</td>
                    <td className="px-4 py-3">
                      {row.isValid ? (
                        <span className="text-sm text-slate-600">{row.email}</span>
                      ) : (
                        <input
                          type="text"
                          value={row.email}
                          onChange={(e) => handleUpdateEmail(row.rowIndex, e.target.value)}
                          className="w-full border border-red-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                        />
                      )}
                    </td>
                    {tab === "faculty" && (
                      <td className="px-4 py-3 text-sm text-slate-600">{row.department || "\u2014"}</td>
                    )}
                    {tab === "student" && (
                      <td className="px-4 py-3 text-sm text-slate-600">{row.course || "\u2014"}</td>
                    )}
                    {tab === "faculty" && (
                      <td className="px-4 py-3 text-sm text-slate-600">{row.isDean ? "Yes" : "No"}</td>
                    )}
                    <td className="px-4 py-3">
                      {row.isValid ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Valid
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          {row.errors.map((err, ei) => (
                            <p key={ei} className="text-[10px] text-red-600 leading-tight">{err}</p>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemoveRow(row.rowIndex)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                        title="Remove row"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {invalidCount > 0
                ? `Fix the highlighted rows or remove them before uploading.`
                : `All ${validCount} rows are ready for upload.`}
            </p>
            <div className="flex items-center gap-3">
              <button onClick={handleReset} className="btn-secondary text-sm px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
                Cancel
              </button>
              <SubmitButton
                onClick={handleConfirm}
                loading={confirming}
                disabled={validCount === 0}
                variant="success"
              >
                Upload {validCount} {validCount === 1 ? "User" : "Users"}
              </SubmitButton>
            </div>
          </div>
        </div>
      )}

      {/* Result Summary */}
      {result && (
        <div className="card p-6 bg-white space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              result.failed === 0 ? "bg-emerald-100" : "bg-amber-100"
            }`}>
              <svg className={`w-5 h-5 ${result.failed === 0 ? "text-emerald-600" : "text-amber-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {result.failed === 0 ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                )}
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {result.created} user{result.created !== 1 ? "s" : ""} created successfully
              </p>
              {result.failed > 0 && (
                <p className="text-xs text-amber-600">{result.failed} failed</p>
              )}
              <p className="text-xs text-slate-400 mt-0.5">
                Activation emails sent (may take a few minutes to arrive).
              </p>
            </div>
          </div>

          {resultDetails.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-4 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-slate-600 mb-2">Created Users</p>
              <div className="space-y-1.5">
                {resultDetails.map((u, i) => (
                  <div key={i} className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-medium text-slate-700">{u.name}</span>
                    <span className="text-slate-400">{u.email}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">{u.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {failedDetails.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-4 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-amber-700 mb-2">Failed</p>
              <div className="space-y-1.5">
                {failedDetails.map((f, i) => (
                  <div key={i} className="text-xs text-amber-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1" />
                    <div>
                      <div className="font-medium text-amber-800">{f.email}</div>
                      <div className="text-amber-700 text-[12px]">{f.error}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <SubmitButton onClick={handleReset} variant="primary">
              Upload Another Batch
            </SubmitButton>
          </div>
        </div>
      )}

      {/* Empty state after validation with no rows */}
      {validationDone && rows.length === 0 && !result && (
        <div className="card p-8 bg-white text-center">
          <p className="text-sm text-slate-400">No rows found in the CSV.</p>
          <button onClick={handleReset} className="btn-primary text-sm mt-4 px-4 py-2 rounded-lg">
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
