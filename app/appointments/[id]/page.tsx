"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { StatusBadge } from "@/components/StatusBadge"
import SubmitButton from "@/components/SubmitButton"
import Skeleton from "@/components/Skeleton"

interface AppointmentDetail {
  id: string
  status: string
  meetingType: string
  date: string
  startTime: string
  endTime: string
  teamsLink: string | null
  teamsSyncStatus: string
  teamsSyncRetries: number
  teamsSyncError: string | null
  teamsSyncLastAttempt: string | null
  requestedAt: string
  updatedAt: string
  student: { id: string; name: string; email: string }
  faculty: { id: string; name: string; email: string }
}

function getInitial(name: string) {
  return name?.charAt(0)?.toUpperCase() || "?"
}

const avatarGradients: Record<string, string> = {
  S: "from-emerald-500 to-indigo-500 text-white",
  F: "from-violet-500 to-fuchsia-500 text-white",
}

function getAvatarClass(name: string) {
  const char = name?.charAt(0)?.toUpperCase() || "A"
  return avatarGradients[char] || "from-gold-500 to-gold-600 text-white"
}

export default function AppointmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null)
  const [localStatus, setLocalStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState("")

  const role = (session?.user as any)?.role
  const userId = (session?.user as any)?.id
  const appointmentId = params.id as string

  useEffect(() => {
    if (!appointmentId) return
    fetch(`/api/appointments/${appointmentId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.appointment) setAppointment(data.appointment)
        else setError("Appointment not found")
      })
      .catch(() => setError("Failed to load appointment"))
      .finally(() => setLoading(false))
  }, [appointmentId])

  const effectiveStatus = localStatus || appointment?.status || ""

  const pendingRef = useRef(false)

  const handleAction = async (action: string, endpoint?: string) => {
    if (pendingRef.current) return
    pendingRef.current = true
    setActionLoading(action)
    try {
      const url = endpoint || `/api/appointments/${appointmentId}/${action}`
      const res = await fetch(url, { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        if (data.appointment) setAppointment(data.appointment)
        const statusMap: Record<string, string> = {
          accept: "APPROVED",
          approve: "APPROVED",
          decline: "REJECTED",
          reject: "REJECTED",
          complete: "COMPLETED",
          cancel: "CANCELLED",
          "student-cancel": "CANCELLED",
          "retry-sync": appointment?.status || "",
        }
        setLocalStatus(statusMap[action] || null)
      } else {
        setError(data.error || "Action failed")
      }
    } catch {
      setError("An error occurred")
    } finally {
      setActionLoading("")
      pendingRef.current = false
    }
  }

  if (loading) return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-4">
      <Skeleton variant="card" className="h-48" />
      <Skeleton variant="text" className="w-1/3" />
      <Skeleton variant="text" className="w-1/2" />
      <Skeleton variant="card" className="h-32" />
    </div>
  )
  if (error || !appointment) return <div className="p-6 md:p-8 max-w-3xl mx-auto"><p className="text-red-600">{error || "Not found"}</p></div>

  const isStudent = role === "STUDENT" && appointment.student?.id === userId
  const isFaculty = role === "FACULTY" && appointment.faculty?.id === userId

  return (
   
    <div className="p-6 md:p-8 max-w-3xl">
      {/* Back */}
      {/* <button
        onClick={() => router.push(role === "STUDENT" ? "/student" : "/faculty")}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </button> */}

      {/* Main ticket card */}
      <div className="card p-6 bg-white mb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900">Consultation</h1>
          <div className="flex items-center gap-2">
            {appointment.meetingType && (
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                appointment.meetingType === "CONSULTATION"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-purple-50 text-purple-700 border-purple-200"
              }`}>
                {appointment.meetingType === "CONSULTATION" ? "Consultation" : "Internal"}
              </span>
            )}
            <StatusBadge status={effectiveStatus} />
          </div>
        </div>

        {/* People */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarClass(appointment.faculty.name)} flex items-center justify-center text-lg font-bold shadow-sm shrink-0`}>
              {getInitial(appointment.faculty.name)}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Faculty</p>
              <p className="text-sm font-bold text-slate-800">{appointment.faculty.name}</p>
              <p className="text-xs text-slate-400">{appointment.faculty.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarClass(appointment.student.name)} flex items-center justify-center text-lg font-bold shadow-sm shrink-0`}>
              {getInitial(appointment.student.name)}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Student</p>
              <p className="text-sm font-bold text-slate-800">{appointment.student.name}</p>
              <p className="text-xs text-slate-400">{appointment.student.email}</p>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-gold-50 border border-gold-100 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gold-100 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gold-600 font-semibold uppercase tracking-wider">Scheduled</p>
            <p className="text-sm font-bold text-gold-900">{appointment.date}</p>
            <p className="text-sm font-medium text-gold-700">{appointment.startTime} &ndash; {appointment.endTime}</p>
          </div>
        </div>

        {/* Teams Sync Status */}
        {effectiveStatus === "APPROVED" && (
          <div className={`p-4 rounded-xl border mb-6 ${
            appointment.teamsSyncStatus === "WRITTEN"
              ? "bg-emerald-50 border-emerald-200"
              : appointment.teamsSyncStatus === "FAILED"
              ? "bg-red-50 border-red-200"
              : "bg-amber-50 border-amber-200"
          }`}>
            <div className="flex items-center gap-3">
              {appointment.teamsSyncStatus === "WRITTEN" && (
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {appointment.teamsSyncStatus === "FAILED" && (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              {appointment.teamsSyncStatus === "UNWRITTEN" && (
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-amber-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {appointment.teamsSyncStatus === "WRITTEN" && "Microsoft Teams Meeting Created"}
                  {appointment.teamsSyncStatus === "FAILED" && "Microsoft Teams Sync Failed"}
                  {appointment.teamsSyncStatus === "UNWRITTEN" && "Microsoft Teams Meeting Pending"}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {appointment.teamsSyncStatus === "WRITTEN" && "The meeting link is active and ready to use."}
                  {appointment.teamsSyncStatus === "FAILED" && `Sync failed after ${appointment.teamsSyncRetries} attempts. ${appointment.teamsSyncError || ""}`}
                  {appointment.teamsSyncStatus === "UNWRITTEN" && "The meeting link will be available shortly after sync completes."}
                </p>
              </div>
            </div>
            {appointment.teamsSyncStatus === "WRITTEN" && appointment.teamsLink && (
              <a
                href={appointment.teamsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-gold-700 bg-white border border-gold-200 hover:bg-gold-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Join Teams Meeting
              </a>
            )}
          </div>
        )}

        {/* Timestamps */}
        <div className="text-xs text-slate-400 space-y-1">
          <p>Requested: {new Date(appointment.requestedAt).toLocaleString()}</p>
          <p>Last updated: {new Date(appointment.updatedAt).toLocaleString()}</p>
          {appointment.teamsSyncLastAttempt && (
            <p>Last sync attempt: {new Date(appointment.teamsSyncLastAttempt).toLocaleString()}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="card p-5 bg-white">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {/* Student: cancel PENDING */}
          {isStudent && effectiveStatus === "PENDING" && (
            <SubmitButton
              onClick={() => handleAction("student-cancel", `/api/appointments/${appointmentId}/student-cancel`)}
              loading={actionLoading === "student-cancel"}
              variant="danger"
            >
              Cancel Request
            </SubmitButton>
          )}

          {/* Faculty: accept/decline PENDING */}
          {isFaculty && effectiveStatus === "PENDING" && (
            <>
              <SubmitButton
                onClick={() => handleAction("accept")}
                loading={actionLoading === "accept"}
                variant="success"
              >
                Accept
              </SubmitButton>
              <SubmitButton
                onClick={() => handleAction("decline")}
                loading={actionLoading === "decline"}
                variant="danger"
              >
                Decline
              </SubmitButton>
            </>
          )}

          {/* Faculty: complete/cancel APPROVED */}
          {isFaculty && effectiveStatus === "APPROVED" && (
            <>
              <SubmitButton
                onClick={() => handleAction("complete")}
                loading={actionLoading === "complete"}
                variant="primary"
              >
                Mark Complete
              </SubmitButton>
              <SubmitButton
                onClick={() => handleAction("cancel")}
                loading={actionLoading === "cancel"}
                variant="danger"
              >
                Cancel Meeting
              </SubmitButton>
              {appointment.teamsSyncStatus === "FAILED" && (
                <SubmitButton
                  onClick={() => handleAction("retry-sync", `/api/appointments/${appointmentId}/retry-sync`)}
                  loading={actionLoading === "retry-sync"}
                  variant="primary"
                >
                  Retry Sync
                </SubmitButton>
              )}
            </>
          )}

          {(effectiveStatus === "REJECTED" || effectiveStatus === "COMPLETED" || effectiveStatus === "CANCELLED") && (
            <p className="text-sm text-slate-400 italic">No further actions available</p>
          )}
        </div>
      </div>
    </div>
  )
}
