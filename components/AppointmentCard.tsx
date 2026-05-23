"use client"

import { useState } from "react"
import { StatusBadge } from "./StatusBadge"
import { TeamsLinkInput } from "./TeamsLinkInput"
import Link from "next/link"
import SubmitButton from "@/components/SubmitButton"

interface AppointmentCardProps {
  appointment: {
    id: string
    status: string
    date: string
    startTime: string
    endTime: string
    title?: string | null
    description?: string | null
    meetingType?: "CONSULTATION" | "INTERNAL" | string
    teamsLink: string | null
    teamsSyncStatus?: string
    teamsSyncRetries?: number
    teamsSyncError?: string | null
    requestedAt: string
    student?: { name: string; email: string }
    faculty?: { name: string; email: string }
    attendees?: Array<{ id: string; userId: string; status: string; isMandatory?: boolean; user?: { name: string; email: string } }>
  }
  role: "STUDENT" | "FACULTY"
}

const avatarGradients: Record<string, string> = {
  A: "from-indigo-500 to-purple-500 text-white",
  B: "from-blue-500 to-indigo-500 text-white",
  C: "from-emerald-500 to-teal-500 text-white",
  D: "from-amber-500 to-orange-500 text-white",
  E: "from-rose-500 to-pink-500 text-white",
  F: "from-violet-500 to-fuchsia-500 text-white",
  G: "from-cyan-500 to-blue-500 text-white",
  H: "from-teal-500 to-emerald-500 text-white",
  I: "from-indigo-500 to-pink-500 text-white",
  J: "from-purple-500 to-indigo-500 text-white",
  K: "from-pink-500 to-rose-500 text-white",
  L: "from-orange-500 to-amber-500 text-white",
  M: "from-emerald-500 to-cyan-500 text-white",
  N: "from-blue-500 to-violet-500 text-white",
  O: "from-violet-500 to-purple-500 text-white",
  P: "from-fuchsia-500 to-pink-500 text-white",
  Q: "from-indigo-500 to-cyan-500 text-white",
  R: "from-teal-500 to-blue-500 text-white",
  S: "from-emerald-500 to-indigo-500 text-white",
  T: "from-rose-500 to-orange-500 text-white",
  U: "from-violet-500 to-indigo-500 text-white",
  V: "from-cyan-500 to-teal-500 text-white",
  W: "from-amber-500 to-rose-500 text-white",
  X: "from-indigo-500 to-purple-500 text-white",
  Y: "from-purple-500 to-pink-500 text-white",
  Z: "from-rose-500 to-violet-500 text-white",
}

function getAvatarClass(name: string) {
  const char = name?.charAt(0)?.toUpperCase() || "A"
  return avatarGradients[char] || "from-gold-500 to-gold-600 text-white"
}

export function AppointmentCard({ appointment, role }: AppointmentCardProps) {
  const [loading, setLoading] = useState("")
  const [message, setMessage] = useState("")
  const [localStatus, setLocalStatus] = useState<string | null>(null)
  const [localTeamsLink, setLocalTeamsLink] = useState<string | null>(appointment.teamsLink)
  const [localSyncStatus, setLocalSyncStatus] = useState<string | undefined>(appointment.teamsSyncStatus)

  const effectiveStatus = localStatus || appointment.status

  const handleAction = async (action: string) => {
    if (loading) return
    setLoading(action)
    setMessage("")

    try {
      const res = await fetch(`/api/appointments/${appointment.id}/${action}`, {
        method: "POST",
      })

      const data = await res.json()

      if (res.ok) {
        if (action === "teams-link" && data.appointment?.teamsLink) {
          setLocalTeamsLink(data.appointment.teamsLink)
        } else {
          const statusMap: Record<string, string> = {
            accept: "APPROVED",
            approve: "APPROVED",
            decline: "REJECTED",
            reject: "REJECTED",
            complete: "COMPLETED",
            cancel: "CANCELLED",
          }
          setLocalStatus(statusMap[action] || null)
        }
        setMessage(`Appointment ${action}d!`)
        setTimeout(() => setMessage(""), 3000)
      } else {
        setMessage(data.error || "Action failed")
      }
    } catch {
      setMessage("An error occurred")
    } finally {
      setLoading("")
    }
  }

  const getInitial = (name: string) => name?.charAt(0)?.toUpperCase() || "?"

  return (
    <div className="card p-5 bg-white">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={effectiveStatus} />
            {(appointment as any).meetingType && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                (appointment as any).meetingType === "CONSULTATION"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-purple-50 text-purple-700 border-purple-200"
              }`}>
                {(appointment as any).meetingType === "CONSULTATION" ? "Consultation" : "Internal"}
              </span>
            )}

            {localTeamsLink && (
              <a
                href={localTeamsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-gold-700 bg-gold-50/50 border border-gold-100 hover:bg-gold-100 transition-colors shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Join Teams Meeting
              </a>
            )}
          </div>

          {role === "STUDENT" && appointment.faculty && (
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarClass(appointment.faculty.name)} flex items-center justify-center text-sm font-bold shadow-sm shrink-0`}>
                {getInitial(appointment.faculty.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 leading-tight">{appointment.faculty.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">Faculty Consultant</p>
              </div>
            </div>
          )}
          {role === "FACULTY" && appointment.student && (
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarClass(appointment.student.name)} flex items-center justify-center text-sm font-bold shadow-sm shrink-0`}>
                {getInitial(appointment.student.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 leading-tight">{appointment.student.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{appointment.student.email}</p>
              </div>
            </div>
          )}

          {appointment.date && (
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="font-medium text-slate-700">{appointment.date}</span>
              <span className="text-slate-300">\u2022</span>
              <span className="text-slate-600 font-medium">{appointment.startTime} &ndash; {appointment.endTime}</span>
            </div>
          )}

          {/* Title */}
          {appointment.title && (
            <p className="text-sm font-bold text-slate-800 leading-snug">{appointment.title}</p>
          )}

          {/* Description (truncated) */}
          {appointment.description && (
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{appointment.description}</p>
          )}

          {/* Attendee badges */}
          {appointment.attendees && appointment.attendees.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">With:</span>
              {appointment.attendees.map((att) => (
                <span
                  key={att.id}
                  className="inline-flex items-center gap-1"
                  title={`${att.user?.name || "Unknown"} (${att.status})`}
                >
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      att.status === "ACCEPTED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : att.status === "DECLINED"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {att.user?.name || "Unknown"}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                      att.isMandatory !== false
                        ? "bg-gold-100 text-gold-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {att.isMandatory !== false ? "Required" : "Optional"}
                  </span>
                </span>
              ))}
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            Requested {new Date(appointment.requestedAt).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
            })}
          </p>
        </div>

        {role === "STUDENT" && effectiveStatus === "PENDING" && (
          <div className="shrink-0 self-end md:self-center">
            <SubmitButton
              onClick={async () => {
                setLoading("cancel")
                setMessage("")
                try {
                  const res = await fetch(`/api/appointments/${appointment.id}/student-cancel`, { method: "POST" })
                  const data = await res.json()
                  if (res.ok) {
                    setLocalStatus("CANCELLED")
                    setMessage("Appointment cancelled!")
                    setTimeout(() => setMessage(""), 3000)
                  } else {
                    setMessage(data.error || "Failed to cancel")
                  }
                } catch {
                  setMessage("An error occurred")
                } finally {
                  setLoading("")
                }
              }}
              loading={loading === "cancel"}
              variant="danger"
              className="text-xs font-semibold px-4 py-2"
            >
              {loading === "cancel" ? "Cancelling..." : "Cancel Request"}
            </SubmitButton>
          </div>
        )}

        {role === "FACULTY" && effectiveStatus === "PENDING" && (
          <div className="flex md:flex-col lg:flex-row gap-2 shrink-0 self-end md:self-center">
            <SubmitButton
              onClick={() => handleAction("accept")}
              loading={loading === "accept"}
              variant="success"
              className="text-xs font-semibold px-4 py-2"
            >
              {loading === "accept" ? "Processing" : "Accept"}
            </SubmitButton>
            <SubmitButton
              onClick={() => handleAction("decline")}
              loading={loading === "decline"}
              variant="danger"
              className="text-xs font-semibold px-4 py-2"
            >
              {loading === "decline" ? "Declining..." : "Decline"}
            </SubmitButton>
          </div>
        )}

        {role === "FACULTY" && effectiveStatus === "APPROVED" && (
          <div className="flex flex-col gap-3 shrink-0 self-stretch md:self-center md:max-w-xs w-full">
            <div className="flex gap-2">
              <SubmitButton
                onClick={() => handleAction("complete")}
                loading={loading === "complete"}
                variant="primary"
                className="text-xs font-semibold py-2 flex-1"
              >
                {loading === "complete" ? "Completing" : "Mark Complete"}
              </SubmitButton>
              <SubmitButton
                onClick={() => handleAction("cancel")}
                loading={loading === "cancel"}
                variant="danger"
                className="text-xs font-semibold py-2"
              >
                {loading === "cancel" ? "Cancelling..." : "Cancel"}
              </SubmitButton>
            </div>
            {/* Retry sync for failed syncs */}
            {localSyncStatus === "FAILED" && (
              <SubmitButton
                onClick={async () => {
                  setLoading("retry-sync")
                  try {
                    const res = await fetch(`/api/appointments/${appointment.id}/retry-sync`, { method: "POST" })
                    const data = await res.json()
                    if (res.ok) {
                      setLocalSyncStatus("UNWRITTEN")
                      setMessage("Sync retry queued!")
                      setTimeout(() => setMessage(""), 3000)
                    } else {
                      setMessage(data.error || "Retry failed")
                    }
                  } catch {
                    setMessage("An error occurred")
                  } finally {
                    setLoading("")
                  }
                }}
                loading={loading === "retry-sync"}
                variant="primary"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                {loading === "retry-sync" ? "Retrying..." : "Retry Sync"}
              </SubmitButton>
            )}
            <div className="w-full">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Microsoft Teams Link</p>
              <TeamsLinkInput appointmentId={appointment.id} />
            </div>
          </div>
        )}
      </div>

      {message && (
        <p className={`mt-4 text-sm font-semibold ${
          message.includes("successfully") || message.includes("queued") ? "text-emerald-600" : "text-rose-600"
        }`}>
          {message}
        </p>
      )}

      <div className="mt-4 pt-3 border-t border-slate-100">
        <Link
          href={`/appointments/${appointment.id}`}
          className="text-xs font-semibold text-gold-600 hover:text-gold-700 inline-flex items-center gap-1"
        >
          View Details
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
