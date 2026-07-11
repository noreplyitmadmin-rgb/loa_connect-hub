"use client"

import { useState } from "react"
import LockedTab from "@/components/ui/LockedTab"
import ErrorState from "@/components/ui/ErrorState"
import ErrorBoundary from "@/components/ui/ErrorBoundary"

type ModalType = "consultations" | "students" | "reset-db" | null

export default function DataManagementPage() {
  const [modalType, setModalType] = useState<ModalType>(null)
  const [confirmInput, setConfirmInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [lockedEndpoint, setLockedEndpoint] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const closeModal = () => {
    if (loading) return
    setModalType(null)
    setConfirmInput("")
  }

  const handleExportAndDelete = async () => {
    if (!modalType || modalType === "reset-db") return
    setLoading(true)
    setResult(null)

    const isStudents = modalType === "students"
    const endpoint = isStudents
      ? "/api/admin/data/delete-students"
      : "/api/admin/data/export-consultations"
    const label = isStudents ? "student" : "consultation"

    try {
      const res = await fetch(endpoint, { method: "POST" })
      if (res.status === 403) { setLockedEndpoint(endpoint); return }
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
      setErrorMessage(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleResetDb = async () => {
    if (modalType !== "reset-db") return
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch("/api/admin/data/reset-db", { method: "POST" })
      if (res.status === 403) { setLockedEndpoint("/api/admin/data/reset-db"); return }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to reset database")
      }

      const data = await res.json()
      setResult({
        type: "success",
        message: `Database reset completed. ${data.statementsExecuted} statements executed successfully.`,
      })
      closeModal()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (modalType === "reset-db") {
      handleResetDb()
    } else {
      handleExportAndDelete()
    }
  }

  const isStudents = modalType === "students"
  const isResetDb = modalType === "reset-db"

  if (lockedEndpoint) {
    return (
      <div className="w-full space-y-8 pb-12">
        <LockedTab endpoint={lockedEndpoint} />
      </div>
    )
  }

  return (
    <ErrorBoundary>
    {errorMessage ? (
      <ErrorState message={errorMessage} onRetry={() => { setErrorMessage(""); window.location.reload() }} />
    ) : (
    <div className="w-full space-y-8 pb-12">
      <h1 className="text-2xl font-bold text-primary">Data Management</h1>

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

      <div className="rounded-2xl border border-red-200 bg-surface shadow-sm p-6">
        <h2 className="text-lg font-bold text-primary mb-2">Consultation Records</h2>
        <p className="text-sm text-tertiary mb-5">
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

      <div className="rounded-2xl border border-red-200 bg-surface shadow-sm p-6">
        <h2 className="text-lg font-bold text-primary mb-2">Student Records</h2>
        <p className="text-sm text-tertiary mb-5">
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

      <div className="rounded-2xl border border-red-200 bg-surface shadow-sm p-6">
        <h2 className="text-lg font-bold text-primary mb-2">Reset Database</h2>
        <p className="text-sm text-tertiary mb-5">
          This will drop and recreate all tables, indexes, and seed data from the schema file.
          All existing data (users, appointments, evaluations, etc.) will be permanently lost.
          This action CANNOT be undone.
        </p>
        <button
          onClick={() => setModalType("reset-db")}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
        >
          Reset Entire Database
        </button>
      </div>

      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-surface rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-primary">
              {isResetDb ? "Confirm Database Reset" : isStudents ? "Confirm Export & Delete Students" : "Confirm Export & Clear"}
            </h2>
            <p className="text-sm text-red-600 font-semibold">
              {isResetDb
                ? "This will drop ALL tables and recreate the entire database from scratch. ALL data will be permanently lost including users, appointments, evaluations, departments, and all other records. This action CANNOT be undone."
                : isStudents
                  ? "This will permanently delete ALL student records. Their appointments will be preserved but orphaned. This action CANNOT be undone."
                  : "This will permanently delete ALL consultation records. This action CANNOT be undone."}
            </p>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
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
                className="text-xs font-semibold px-4 py-3 sm:py-2 rounded-lg border border-default hover:bg-surface-hover disabled:opacity-50 cursor-pointer w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirmInput !== "CONFIRM" || loading}
                className="text-xs font-semibold px-4 py-3 sm:py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-full sm:w-auto"
              >
                {loading ? (isResetDb ? "Resetting..." : "Exporting & Deleting...") : (isResetDb ? "Reset Database" : "Export & Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    )}
    </ErrorBoundary>
  )
}
