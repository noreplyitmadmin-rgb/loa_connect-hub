"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import SubmitButton from "@/components/SubmitButton"

interface TimeSlot {
  date: string
  startTime: string
  endTime: string
}

interface StudentInfo {
  name: string
  email: string
}

interface OrganizerInfo {
  name: string
  email: string | null
}

interface AppointmentData {
  id: string
  title: string | null
  meetingType: string
  status: string
  date: string | null
  startTime: string | null
  endTime: string | null
  description: string | null
  teamsLink: string | null
  timeSlots: TimeSlot[] | null
  student: StudentInfo | null
  organizer: OrganizerInfo | null
}

const statusStyles: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  PENDING: { bg: "bg-amber-50/60", text: "text-amber-800", dot: "bg-amber-500", border: "border-amber-200/60" },
  APPROVED: { bg: "bg-emerald-50/60", text: "text-emerald-800", dot: "bg-emerald-500", border: "border-emerald-200/60" },
  REJECTED: { bg: "bg-rose-50/60", text: "text-rose-800", dot: "bg-rose-500", border: "border-rose-200/60" },
  COMPLETED: { bg: "bg-gold-50/60", text: "text-gold-800", dot: "bg-gold-500", border: "border-gold-200/60" },
  CANCELLED: { bg: "bg-slate-50/60", text: "text-slate-600", dot: "bg-slate-400", border: "border-slate-200/60" },
}

function getStyle(status: string) {
  return statusStyles[status] || { bg: "bg-slate-50/60", text: "text-slate-700", dot: "bg-slate-400", border: "border-slate-200/60" }
}

export default function FacultyMobileMeetingDetail() {
  const params = useParams()
  const [appointment, setAppointment] = useState<AppointmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState("")
  const [teamsLink, setTeamsLink] = useState("")
  const [showAcceptForm, setShowAcceptForm] = useState(false)
  const [actionError, setActionError] = useState("")

  const appointmentId = params.id as string

  useEffect(() => {
    if (!appointmentId) return
    fetch(`/api/appointments/${appointmentId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.appointment) setAppointment(data.appointment)
        else setError(data.error || "Appointment not found")
      })
      .catch(() => setError("Failed to load appointment"))
      .finally(() => setLoading(false))
  }, [appointmentId])

  const handleAction = async (action: string, endpoint?: string) => {
    setActionError("")
    setActionLoading(action)
    try {
      const url = endpoint || `/api/appointments/${appointmentId}/${action}`
      const res = await fetch(url, { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        if (data.appointment) setAppointment(data.appointment)
        else setAppointment((prev: AppointmentData | null) => prev ? { ...prev, status: action === "accept" || action === "approve" ? "APPROVED" : action === "decline" ? "REJECTED" : action === "cancel" ? "CANCELLED" : action === "complete" ? "COMPLETED" : prev.status } : prev)
        if (action === "accept" || action === "approve") {
          setShowAcceptForm(false)
          setTeamsLink("")
        }
      } else {
        setActionError(data.error || "Action failed")
      }
    } catch {
      setActionError("An error occurred")
    } finally {
      setActionLoading("")
    }
  }

  const handleAcceptFlow = async () => {
    if (!teamsLink.trim()) {
      setActionError("Please provide a Teams meeting link")
      return
    }

    setActionError("")
    setActionLoading("accept")

    try {
      const linkRes = await fetch(`/api/appointments/${appointmentId}/teams-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamsLink: teamsLink.trim() }),
      })
      if (!linkRes.ok) {
        const linkData = await linkRes.json()
        setActionError(linkData.error || "Failed to save Teams link")
        setActionLoading("")
        return
      }

      const acceptRes = await fetch(`/api/appointments/${appointmentId}/accept`, { method: "POST" })
      const acceptData = await acceptRes.json()
      if (!acceptRes.ok) {
        setActionError(acceptData.error || "Failed to accept")
        setActionLoading("")
        return
      }

      const approveRes = await fetch(`/api/appointments/${appointmentId}/approve`, { method: "POST" })
      const approveData = await approveRes.json()
      if (approveRes.ok) {
        if (approveData.appointment) setAppointment(approveData.appointment)
        else setAppointment((prev: AppointmentData | null) => prev ? { ...prev, status: "APPROVED", teamsLink: teamsLink.trim() } : prev)
        setShowAcceptForm(false)
        setTeamsLink("")
      } else {
        setActionError(approveData.error || "Failed to approve")
      }
    } catch {
      setActionError("An error occurred")
    } finally {
      setActionLoading("")
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 pb-24 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading appointment...</span>
        </div>
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <p className="text-red-600 text-sm">{error || "Appointment not found"}</p>
        <Link href="/faculty/m/meetings" className="inline-block mt-4 text-sm text-gold-600 hover:text-gold-700 font-medium">
          &larr; Back to meetings
        </Link>
      </div>
    )
  }

  const s = getStyle(appointment.status)
  const slot = appointment.timeSlots?.[0]

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-4">
      <Link href="/faculty/m/meetings" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 min-h-[44px]">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to meetings
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-lg font-bold text-slate-900 leading-tight">
            {appointment.title || (appointment.meetingType === "CONSULTATION" ? "Consultation" : "Meeting")}
          </h1>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border shrink-0 ${s.bg} ${s.text} ${s.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            <span className="tracking-wider uppercase">{appointment.status}</span>
          </span>
        </div>

        <div className="space-y-3">
          {appointment.date && (
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{appointment.date}</span>
            </div>
          )}
          {appointment.startTime && appointment.endTime && (
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{appointment.startTime} &ndash; {appointment.endTime}</span>
            </div>
          )}
          {!appointment.date && slot && (
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{slot.date} &middot; {slot.startTime} &ndash; {slot.endTime}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-500 flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0">
            {(appointment.student?.name || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Student</p>
            <p className="text-sm font-bold text-slate-800">{appointment.student?.name}</p>
            <p className="text-xs text-slate-400">{appointment.student?.email}</p>
          </div>
        </div>

        {appointment.organizer && (
          <p className="text-xs text-slate-400">
            Organized by <span className="font-semibold text-slate-600">{appointment.organizer.name}</span>
            {appointment.organizer.email && <span className="text-slate-400"> &lt;{appointment.organizer.email}&gt;</span>}
          </p>
        )}

        {(appointment.teamsLink || appointment.status === "APPROVED") && (
          appointment.teamsLink ? (
            <a
              href={appointment.teamsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm min-h-[48px]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Join Microsoft Teams
            </a>
          ) : (
            <p className="text-xs text-slate-400 text-center">Teams link not yet available</p>
          )
        )}
      </div>

      {appointment.description && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">Description</p>
          <p className="text-sm text-slate-600">{appointment.description}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        {actionError && (
          <p className="text-xs text-red-600 font-semibold text-center">{actionError}</p>
        )}

        {appointment.status === "PENDING" && !showAcceptForm && (
          <div className="flex flex-col gap-3">
            <SubmitButton
              onClick={() => setShowAcceptForm(true)}
              variant="success"
              className="w-full py-3 min-h-[44px] text-sm"
            >
              Accept
            </SubmitButton>
            <SubmitButton
              onClick={() => handleAction("decline")}
              loading={actionLoading === "decline"}
              variant="danger"
              className="w-full py-3 min-h-[44px] text-sm"
            >
              {actionLoading === "decline" ? "Declining..." : "Decline"}
            </SubmitButton>
          </div>
        )}

        {appointment.status === "PENDING" && showAcceptForm && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Teams Meeting Link <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={teamsLink}
                onChange={(e) => setTeamsLink(e.target.value)}
                placeholder="https://teams.microsoft.com/l/..."
                className="input text-sm py-2.5 w-full mt-1"
              />
            </div>
            <div className="flex flex-col gap-3">
              <SubmitButton
                onClick={handleAcceptFlow}
                loading={actionLoading === "accept"}
                variant="success"
                className="w-full py-3 min-h-[44px] text-sm"
              >
                {actionLoading === "accept" ? "Approving..." : "Confirm & Approve"}
              </SubmitButton>
              <SubmitButton
                onClick={() => {
                  setShowAcceptForm(false)
                  setTeamsLink("")
                  setActionError("")
                }}
                variant="secondary"
                className="w-full py-3 min-h-[44px] text-sm"
              >
                Cancel
              </SubmitButton>
            </div>
          </div>
        )}

        {appointment.status === "APPROVED" && (
          <div className="flex flex-col gap-3">
            <SubmitButton
              onClick={() => handleAction("complete")}
              loading={actionLoading === "complete"}
              variant="primary"
              className="w-full py-3 min-h-[44px] text-sm"
            >
              {actionLoading === "complete" ? "Completing..." : "Mark Complete"}
            </SubmitButton>
            <SubmitButton
              onClick={() => handleAction("cancel")}
              loading={actionLoading === "cancel"}
              variant="danger"
              className="w-full py-3 min-h-[44px] text-sm"
            >
              {actionLoading === "cancel" ? "Cancelling..." : "Cancel"}
            </SubmitButton>
          </div>
        )}

        {(appointment.status === "COMPLETED" || appointment.status === "CANCELLED" || appointment.status === "REJECTED") && (
          <p className="text-sm text-slate-400 italic text-center">No further actions</p>
        )}
      </div>

      <div className="text-center pt-2">
        <Link
          href={`/faculty/meetings/${appointmentId}?desktop=1`}
          className="text-[11px] text-slate-400 hover:text-slate-600 underline"
        >
          Desktop view
        </Link>
      </div>
    </div>
  )
}
