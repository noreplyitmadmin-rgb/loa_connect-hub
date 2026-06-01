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

interface FacultyInfo {
  name: string
  email: string
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
  faculty: FacultyInfo | null
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

export default function StudentMobileMeetingDetail() {
  const params = useParams()
  const [appointment, setAppointment] = useState<AppointmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState("")

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
        <Link href="/student/m/meetings" className="inline-block mt-4 text-sm text-gold-600 hover:text-gold-700 font-medium">
          &larr; Back to consultations
        </Link>
      </div>
    )
  }

  const s = getStyle(appointment.status)
  const slot = appointment.timeSlots?.[0]

  const handleCancel = async () => {
    setActionLoading("cancel")
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/student-cancel`, { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setAppointment(data.appointment || { ...appointment, status: "CANCELLED" })
      } else {
        setError(data.error || "Failed to cancel")
      }
    } catch {
      setError("An error occurred")
    } finally {
      setActionLoading("")
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-4">
      <Link href="/student/m/meetings" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 min-h-[44px]">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to consultations
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
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0`}>
            {(appointment.faculty?.name || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Faculty</p>
            <p className="text-sm font-bold text-slate-800">{appointment.faculty?.name}</p>
            <p className="text-xs text-slate-400">{appointment.faculty?.email}</p>
          </div>
        </div>

        {appointment.teamsLink && (
          <a
            href={appointment.teamsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-gold-700 bg-gold-50 border border-gold-200 hover:bg-gold-100 transition-colors min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Join Microsoft Teams
          </a>
        )}
        {!appointment.teamsLink && appointment.status === "APPROVED" && (
          <p className="text-xs text-slate-400 text-center">Teams link not yet available</p>
        )}
      </div>

      {appointment.description && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">Description</p>
          <p className="text-sm text-slate-600">{appointment.description}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        {appointment.status === "PENDING" && (
          <SubmitButton
            onClick={handleCancel}
            loading={actionLoading === "cancel"}
            variant="danger"
            className="w-full py-3 min-h-[44px] text-sm"
          >
            {actionLoading === "cancel" ? "Cancelling..." : "Cancel Request"}
          </SubmitButton>
        )}
        {(appointment.status === "APPROVED" || appointment.status === "COMPLETED" || appointment.status === "REJECTED" || appointment.status === "CANCELLED") && (
          <p className="text-sm text-slate-400 italic text-center">No further actions</p>
        )}
      </div>

      <div className="text-center pt-2">
        <Link
          href={`/student/meetings/${appointmentId}?desktop=1`}
          className="text-[11px] text-slate-400 hover:text-slate-600 underline"
        >
          Desktop view
        </Link>
      </div>
    </div>
  )
}
