"use client"

import { useState } from "react"

type ModalType = "consultations" | "students" | null

export default function DataManagementPage() {
  const [modalType, setModalType] = useState<ModalType>(null)
  const [confirmInput, setConfirmInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const closeModal = () => {
    if (loading) return
    setModalType(null)
    setConfirmInput("")
  }

  const handleExportAndDelete = async () => {
    if (!modalType) return
    setLoading(true)
    setResult(null)

    const isStudents = modalType === "students"
    const endpoint = isStudents
      ? "/api/admin/data/delete-students"
      : "/api/admin/data/export-consultations"
    const label = isStudents ? "student" : "consultation"

    try {
      const res = await fetch(endpoint, { method: "POST" })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Failed to export and delete ${label} records`)
      }

      const text = await res.text()
      const data = JSON.parse(text)
      const count = isStudents
        ? (data.students || []).length
        : (data.appointments || []).length

      const disposition = res.headers.get("Content-Disposition")
      const dateStr = new Date().toISOString().slice(0, 10)
      let filename = isStudents
        ? `students-export-${dateStr}.json`
        : `consultations-export-${dateStr}.json`
      if (disposition) {
        const match = disposition.match(/filename="?(.+?)"?$/)
        if (match) filename = match[1]
      }

      const blob = new Blob([text], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setResult({
        type: "success",
        message: `Successfully exported and deleted ${count} ${label} record${count !== 1 ? "s" : ""}.`,
      })
      closeModal()
    } catch (err) {
      setResult({
        type: "error",
        message: err instanceof Error ? err.message : "An unknown error occurred",
      })
    } finally {
      setLoading(false)
    }
  }

  const isStudents = modalType === "students"

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <h1 className="text-2xl font-bold text-slate-900">Data Management</h1>

      {result && (
        <div className={`rounded-xl border p-4 text-sm font-medium ${
          result.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          <div className="flex items-center justify-between">
            <span>{result.message}</span>
            <button onClick={() => setResult(null)} className="ml-3 text-current opacity-60 hover:opacity-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-red-200 bg-white shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Consultation Records</h2>
        <p className="text-sm text-slate-500 mb-5">
          This will permanently delete all consultation records including appointments, attendee data, time slots, and
          uploaded files. A JSON export will be downloaded before deletion.
        </p>
        <button
          onClick={() => setModalType("consultations")}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
        >
          Export & Clear All Consultations
        </button>
      </div>

      <div className="rounded-2xl border border-red-200 bg-white shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Student Records</h2>
        <p className="text-sm text-slate-500 mb-5">
          This will permanently delete all student accounts. Their appointments will be orphaned (student references
          set to null) and attendee data will be removed. A JSON export will be downloaded before deletion.
        </p>
        <button
          onClick={() => setModalType("students")}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
        >
          Export & Delete All Students
        </button>
      </div>

      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900">
              {isStudents ? "Confirm Export & Delete Students" : "Confirm Export & Clear"}
            </h2>
            <p className="text-sm text-red-600 font-semibold">
              {isStudents
                ? "This will permanently delete ALL student records. Their appointments will be preserved but orphaned. This action CANNOT be undone."
                : "This will permanently delete ALL consultation records. This action CANNOT be undone."}
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Type <span className="font-bold">CONFIRM</span> to proceed
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="CONFIRM"
                className="input text-sm w-full"
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                onClick={closeModal}
                disabled={loading}
                className="text-xs font-semibold px-4 py-3 sm:py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 cursor-pointer w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleExportAndDelete}
                disabled={confirmInput !== "CONFIRM" || loading}
                className="text-xs font-semibold px-4 py-3 sm:py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-full sm:w-auto"
              >
                {loading ? "Exporting & Deleting..." : "Export & Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
