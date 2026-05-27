"use client"

import { useState, useEffect } from "react"
import SubmitButton from "@/components/SubmitButton"
import { hasRole } from "@/lib/utils/roles"

interface SlotInfo {
  id: string
  facultyId: string
  facultyName: string
  facultyEmail: string
  date: string
  startTime: string
  endTime: string
}

interface FacultyUser {
  id: string
  name: string
  email: string
  hasLoggedInBefore?: boolean
}

interface BookingFormProps {
  slot: SlotInfo
  sessionGroupId?: string
  onClose: () => void
  onSuccess: (appointmentId: string, groupId: string) => void
}

export default function BookingForm({ slot, sessionGroupId, onClose, onSuccess }: BookingFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [facultyList, setFacultyList] = useState<FacultyUser[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/auth/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.users) {
          setFacultyList(
            data.users
              .filter((u: any) => hasRole(u.role, "FACULTY") && u.id !== slot.facultyId && !u.isDisabled)
          )
        }
      })
      .catch(() => {})
  }, [slot.facultyId])

  const toggleAttendee = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!title.trim()) return

    setSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facultyId: slot.facultyId,
          sessionGroupId: sessionGroupId || undefined,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          title: title.trim(),
          description: description.trim() || undefined,
          attendeeIds: selectedIds,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        onSuccess(data.appointment.id, data.appointment.sessionGroupId || data.appointment.id)
      } else {
        setError(data.error || "Failed to book")
      }
    } catch {
      setError("An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">
            {sessionGroupId ? "Add Time Block" : "Book Appointment"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Slot info (read-only) */}
          <div className="p-3 rounded-lg bg-gold-50 border border-gold-100 text-sm">
            <div className="flex items-center gap-2 text-gold-700 font-semibold mb-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {slot.date} &middot; {slot.startTime} &ndash; {slot.endTime}
            </div>
            <p className="text-gold-600 text-xs">
              with <span className="font-semibold">{slot.facultyName}</span>
            </p>
          </div>

          {sessionGroupId && (
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
              This block will be added to your existing consultation session.
            </div>
          )}

          {/* Title */}
          <div>
            <label className="input-label">Meeting Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="e.g. Thesis Consultation"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="input-label">Description / Agenda (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input min-h-[80px]"
              placeholder="Topics to discuss, questions, materials to review..."
            />
          </div>

          {/* Additional Faculty Attendees */}
          <div>
            <label className="input-label">Invite Additional Faculty / Dean (optional)</label>
            <p className="text-[10px] text-slate-400 mb-2">Only faculty and dean accounts can be invited. Students cannot invite other students.</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {facultyList.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No other faculty available</p>
              ) : (
                facultyList.map((f) => (
                  <label
                    key={f.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedIds.includes(f.id)
                        ? "border-gold-300 bg-gold-50/50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(f.id)}
                      onChange={() => toggleAttendee(f.id)}
                      className="w-4 h-4 rounded border-slate-300 text-gold-600 focus:ring-gold-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800">{f.name}</p>
                        {f.hasLoggedInBefore === false && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 leading-none">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{f.email}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <SubmitButton type="submit" loading={submitting} variant="primary" className="w-full">
              {submitting ? "Booking..." : sessionGroupId ? "Add Block" : "Book Consultation"}
            </SubmitButton>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-slate-500 hover:text-slate-700 px-4 py-2.5"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
