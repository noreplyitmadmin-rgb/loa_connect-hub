"use client"

import { useState } from "react"
import { StatusBadge } from "./StatusBadge"
import { TeamsLinkInput } from "./TeamsLinkInput"

interface AppointmentCardProps {
  appointment: {
    id: string
    status: string
    teamsLink: string | null
    requestedAt: string
    student?: { name: string; email: string }
    faculty?: { name: string; email: string }
    schedule?: { date: string; startTime: string; endTime: string }
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
  return avatarGradients[char] || "from-indigo-500 to-indigo-600 text-white"
}

export function AppointmentCard({ appointment, role }: AppointmentCardProps) {
  const [loading, setLoading] = useState("")
  const [message, setMessage] = useState("")
  const [localStatus, setLocalStatus] = useState<string | null>(null)
  const [localTeamsLink, setLocalTeamsLink] = useState<string | null>(appointment.teamsLink)

  const effectiveStatus = localStatus || appointment.status

  const handleAction = async (action: string) => {
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
            approve: "APPROVED",
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
            {localTeamsLink && (
              <a
                href={localTeamsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-indigo-700 bg-indigo-50/50 border border-indigo-100 hover:bg-indigo-100 transition-colors shadow-sm"
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

          {appointment.schedule && (
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-2.5 max-w-max">
              <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium text-slate-700">{appointment.schedule.date}</span>
              <span className="text-slate-300">\u2022</span>
              <span className="text-slate-600 font-medium">{appointment.schedule.startTime} &ndash; {appointment.schedule.endTime}</span>
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
            <button
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
              disabled={loading !== ""}
              className="btn-danger text-xs font-semibold px-4 py-2"
            >
              {loading === "cancel" ? "Cancelling..." : "Cancel Request"}
            </button>
          </div>
        )}

        {role === "FACULTY" && effectiveStatus === "PENDING" && (
          <div className="flex md:flex-col lg:flex-row gap-2 shrink-0 self-end md:self-center">
            <button
              onClick={() => handleAction("approve")}
              disabled={loading !== ""}
              className="btn-success text-xs font-semibold px-4 py-2"
            >
              {loading === "approve" ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing
                </span>
              ) : "Approve"}
            </button>
            <button
              onClick={() => handleAction("reject")}
              disabled={loading !== ""}
              className="btn-danger text-xs font-semibold px-4 py-2"
            >
              {loading === "reject" ? "Rejecting..." : "Reject"}
            </button>
          </div>
        )}

        {role === "FACULTY" && effectiveStatus === "APPROVED" && (
          <div className="flex flex-col gap-3 shrink-0 self-stretch md:self-center md:max-w-xs w-full">
            <div className="flex gap-2">
              <button
                onClick={() => handleAction("complete")}
                disabled={loading !== ""}
                className="btn-primary text-xs font-semibold py-2 flex-1"
              >
                {loading === "complete" ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Completing
                  </span>
                ) : "Mark Complete"}
              </button>
              <button
                onClick={() => handleAction("cancel")}
                disabled={loading !== ""}
                className="btn-danger text-xs font-semibold py-2"
              >
                {loading === "cancel" ? "Cancelling..." : "Cancel"}
              </button>
            </div>
            <div className="w-full">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Microsoft Teams Link</p>
              <TeamsLinkInput appointmentId={appointment.id} />
            </div>
          </div>
        )}
      </div>

      {message && (
        <p className={`mt-4 text-sm font-semibold ${
          message.includes("successfully") ? "text-emerald-600" : "text-rose-600"
        }`}>
          {message}
        </p>
      )}
    </div>
  )
}
