"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { StatusBadge } from "@/components/StatusBadge"
import SubmitButton from "@/components/SubmitButton"
import { TeamsLinkInput } from "@/components/TeamsLinkInput"
import TeamsLinkForm from "@/components/TeamsLinkForm"
import AppointmentDetailSkeleton from "@/components/AppointmentDetailSkeleton"
import type { AppointmentDetailDto } from "@/lib/dtos/Appointments"
import { hasRole } from "@/lib/utils/roles"

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

const attendeeBadgeColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  ACCEPTED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  DECLINED: "bg-red-100 text-red-700 border-red-200",
}

export default function AppointmentDetail() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [appointment, setAppointment] = useState<AppointmentDetailDto | null>(null)
  const [localStatus, setLocalStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState("")
  const [teamsLinkMode, setTeamsLinkMode] = useState<"single" | "per-slot">("single")
  const [showTeamsLinkForm, setShowTeamsLinkForm] = useState(false)
  const [singleLink, setSingleLink] = useState("")
  const [slotLinks, setSlotLinks] = useState<Record<string, string>>({})
  const [teamsLinkError, setTeamsLinkError] = useState("")
  const [showCompleteForm, setShowCompleteForm] = useState(false)
  const [actionTaken, setActionTaken] = useState("")
  const [completeFiles, setCompleteFiles] = useState<File[]>([])
  const [completeError, setCompleteError] = useState("")
  const [previewFile, setPreviewFile] = useState<AppointmentDetailDto["files"][number] | null>(null)

  const role = (session?.user as any)?.role
  const userEmail = (session?.user as any)?.email
  const userId = (session?.user as any)?.id
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

  const handleConfirmApprove = async () => {
    setTeamsLinkError("")

    if (teamsLinkMode === "single") {
      if (!singleLink.trim()) {
        setTeamsLinkError("Please provide a Teams meeting link")
        return
      }
    } else {
      const emptySlot = appointment?.timeSlots?.find((s) => !slotLinks[s.id]?.trim())
      if (emptySlot) {
        setTeamsLinkError("Please provide a Teams link for each time slot")
        return
      }
    }

    setActionLoading("accept")

    try {
      if (teamsLinkMode === "single") {
        const res = await fetch(`/api/appointments/${appointmentId}/teams-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamsLink: singleLink.trim() }),
        })
        if (!res.ok) {
          const data = await res.json()
          setTeamsLinkError(data.error || "Failed to save Teams link")
          setActionLoading("")
          return
        }
      } else {
        for (const slot of appointment?.timeSlots || []) {
          const link = slotLinks[slot.id]?.trim()
          if (!link) continue
          const res = await fetch(`/api/appointments/slots/${slot.id}/teams-link`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teamsLink: link }),
          })
          if (!res.ok) {
            const data = await res.json()
            setTeamsLinkError(data.error || `Failed to save link for ${slot.date} ${slot.startTime}`)
            setActionLoading("")
            return
          }
        }
      }

      const res = await fetch(`/api/appointments/${appointmentId}/accept`, { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        if (data.appointment) setAppointment(data.appointment)
        setLocalStatus("APPROVED")
        setShowTeamsLinkForm(false)
        setSingleLink("")
        setSlotLinks({})
      } else {
        setTeamsLinkError(data.error || "Failed to approve appointment")
      }
    } catch {
      setTeamsLinkError("An error occurred")
    } finally {
      setActionLoading("")
    }
  }

  const handleCompleteSubmit = async () => {
    setCompleteError("")

    if (actionTaken.trim().length < 100) {
      setCompleteError("Actions taken must be at least 100 characters")
      return
    }

    // if (completeFiles.length === 0) {
    //   setCompleteError("Please upload at least one screenshot as proof")
    //   return
    // }

    setActionLoading("complete")

    try {
      const filePayload = await Promise.all(
        completeFiles.map(async (f) => {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const result = reader.result as string
              resolve(result.split(",")[1])
            }
            reader.onerror = reject
            reader.readAsDataURL(f)
          })
          return {
            fileName: f.name,
            fileType: f.type,
            fileData: base64,
            fileSize: f.size,
          }
        })
      )

      const fileRes = await fetch(`/api/appointments/${appointmentId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: filePayload }),
      })

      if (!fileRes.ok) {
        const fileData = await fileRes.json()
        setCompleteError(fileData.error || "Failed to upload files")
        setActionLoading("")
        return
      }

      const res = await fetch(`/api/appointments/${appointmentId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionTaken: actionTaken.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.appointment) setAppointment(data.appointment)
        setLocalStatus("COMPLETED")
        setShowCompleteForm(false)
        setActionTaken("")
        setCompleteFiles([])
      } else {
        setCompleteError(data.error || "Failed to complete appointment")
      }
    } catch (err){
      setCompleteError("An error occurred")
      console.error(err)
    } finally {
      setActionLoading("")
    }
  }

  // ── Loading ──────────────────────────────────────────────────────
  if (loading) return <AppointmentDetailSkeleton />

  if (error || !appointment) return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <p className="text-red-600">{error || "Appointment not found"}</p>
    </div>
  )

  const isStudent = hasRole(role, "STUDENT") && appointment.student?.id === userId
  const isFaculty = hasRole(role, "FACULTY") && appointment.faculty?.id === userId
  const isDean = hasRole(role, "DEAN") && appointment.faculty?.id === userId
  const isOrganizer = !!(appointment.organizer && userEmail && appointment.organizer.email === userEmail)
  const studentIsOrganizer = !!(appointment.organizer && appointment.student?.email === appointment.organizer.email)
  const facultyIsOrganizer = !!(appointment.organizer && appointment.faculty?.email === appointment.organizer.email)
  const myAttendeeRecord = appointment.attendees?.find((a) => a.userId === userId)

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* ── Main ticket card ──────────────────────────────────────── */}
      <div className="card p-6 bg-white mb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900">
            {appointment.title || (appointment.meetingType === "CONSULTATION" ? "Consultation" : "Meeting")}
          </h1>
          <div className="flex items-center gap-2">
            {appointment.meetingType && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-blue-50 text-blue-700 border-blue-200">
                Consultation
              </span>
            )}
            { (isFaculty || isDean)  && isOrganizer ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-green-50 text-green-700 border-green-200">
                Auto-accepted
              </span>
            ) :  <StatusBadge status={effectiveStatus} /> }
           
          </div>
        </div>

        {/* Organizer */}
        {appointment.organizer && (
          <p className="text-xs text-slate-400 mb-4">
            Organized by <span className="font-semibold text-slate-600">{appointment.organizer.name}</span>
            {appointment.organizer.email && <span className="text-slate-400"> &lt;{appointment.organizer.email}&gt;</span>}
          </p>
        )}

        {/* Time slots */}
        {appointment.timeSlots && appointment.timeSlots.length > 0 && (
          <div className="mb-6 space-y-2">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Time slots</p>
            {(() => {
              const grouped: Record<string, typeof appointment.timeSlots> = {}
              for (const slot of appointment.timeSlots) {
                if (!grouped[slot.date]) grouped[slot.date] = []
                grouped[slot.date].push(slot)
              }
              return Object.entries(grouped).map(([date, slots]) => (
                <div key={date} className="space-y-1">
                  <p className="text-xs font-semibold text-slate-600">{date}</p>
                  {slots.map((slot) => {
                    const effectiveLink = slot.teamsLink || appointment.teamsLink
                    return (
                      <div key={slot.id}>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <p className="text-sm text-slate-700">{slot.startTime} &ndash; {slot.endTime}</p>
                          {effectiveLink && (
                            <a
                              href={effectiveLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-gold-700 bg-gold-50/50 border border-gold-100 hover:bg-gold-100 transition-colors shadow-sm"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Join
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            })()}
          </div>
        )}

        {/* Microsoft Teams Links (input: only before accept) */}
        {(hasRole(role, "FACULTY") || hasRole(role, "DEAN")) && effectiveStatus === "PENDING" && showTeamsLinkForm && (
          <TeamsLinkForm
            teamsLinkMode={teamsLinkMode}
            onModeChange={setTeamsLinkMode}
            singleLink={singleLink}
            onSingleLinkChange={setSingleLink}
            slotLinks={slotLinks}
            onSlotLinkChange={(key, value) => setSlotLinks((prev) => ({ ...prev, [key]: value }))}
            timeSlots={(appointment.timeSlots || []).map((slot) => ({
              key: slot.id,
              date: slot.date,
              startTime: slot.startTime,
              endTime: slot.endTime,
            }))}
            error={teamsLinkError}
          />
        )}

        {/* People: student + faculty (hide own card + hide if info is in organizer line) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {(!isFaculty && !isDean && !facultyIsOrganizer) && (
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
          )}
          { appointment.student && (!isStudent && !studentIsOrganizer) && (
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
          )}
        </div>

        {/* Description */}
        {appointment.description && (
          <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-sm text-slate-600">{appointment.description}</p>
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

      {/* ── Attendees / Participants ──────────────────────────────── */}
      {appointment.attendees && appointment.attendees.length > 0 && (
        <div className="card p-6 bg-white">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
            Participants ({appointment.attendees.length})
          </h2>
          <div className="space-y-3">
            {appointment.attendees.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                    a.status === "ACCEPTED" ? "bg-emerald-500" : a.status === "DECLINED" ? "bg-red-400" : "bg-slate-400"
                  }`}>
                    {getInitial(a.user.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{a.user.name}</p>
                    <p className="text-xs text-slate-400">{a.user.email}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  effectiveStatus === "COMPLETED" && a.status === "PENDING"
                    ? "bg-amber-100 text-amber-700 border-amber-200"
                    : attendeeBadgeColors[a.status] || "bg-slate-100 text-slate-500 border-slate-200"
                }`}>
                  {effectiveStatus === "COMPLETED" && a.status === "PENDING" ? "INVITED" : "OPTIONAL"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Completed Details (visible to all when COMPLETED) ────── */}
      {effectiveStatus === "COMPLETED" && (
        <div className="card p-6 bg-white space-y-6">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Appointment Completed
          </h2>

          {appointment.actionTaken && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Actions Taken
              </p>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{appointment.actionTaken}</p>
              </div>
            </div>
          )}

          {appointment.files && appointment.files.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Screenshot Proof ({appointment.files.length})
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {appointment.files.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPreviewFile(f)}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50 hover:border-gold-400 hover:shadow-md transition-all"
                  >
                    <img
                      src={`data:${f.fileType};base64,${f.fileData}`}
                      alt={f.fileName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Image Preview Modal ──────────────────────────────────── */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] rounded-xl overflow-hidden bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewFile(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors text-lg font-bold"
            >
              &times;
            </button>
            <img
              src={`data:${previewFile.fileType};base64,${previewFile.fileData}`}
              alt={previewFile.fileName}
              className="max-w-full max-h-[90vh] object-contain"
            />
            <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 pt-8 pb-3 text-xs text-white/90 truncate">
              {previewFile.fileName}
            </p>
          </div>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────── */}
      <div className="card p-5 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1">
            {/* Student: cancel PENDING */}
          {isStudent && effectiveStatus === "PENDING" && (
            <SubmitButton
              onClick={() => handleAction("student-cancel", `/api/appointments/${appointmentId}/student-cancel`)}
              loading={actionLoading === "student-cancel"}
              variant="danger"
            >
              {actionLoading === "student-cancel" ? "Cancelling..." : "Cancel Request"}
            </SubmitButton>
          )}

          {/* Faculty/Dean: Accept flow with mandatory Teams link */}
          {(isFaculty || isDean) && effectiveStatus === "PENDING" && !showTeamsLinkForm && (
            <div className="flex flex-wrap gap-2">
              <SubmitButton
                onClick={() => setShowTeamsLinkForm(true)}
                variant="success"
              >
                Accept
              </SubmitButton>
              <SubmitButton
                onClick={() => handleAction("decline")}
                loading={actionLoading === "decline"}
                variant="danger"
              >
                {actionLoading === "decline" ? "Declining..." : "Decline"}
              </SubmitButton>
            </div>
          )}

          {/* Faculty/Dean: Confirm/Cancel after setting Teams links */}
          {(isFaculty || isDean) && showTeamsLinkForm && (
            <div className="space-y-2">
              {teamsLinkError && <p className="text-xs text-red-600 font-semibold">{teamsLinkError}</p>}
              <div className="flex flex-wrap gap-2">
                <SubmitButton
                  onClick={handleConfirmApprove}
                  loading={actionLoading === "accept"}
                  variant="success"
                >
                  {actionLoading === "accept" ? "Approving..." : "Confirm & Approve"}
                </SubmitButton>
                <SubmitButton
                  onClick={() => {
                    setShowTeamsLinkForm(false)
                    setTeamsLinkError("")
                    setSingleLink("")
                    setSlotLinks({})
                  }}
                  variant="secondary"
                >
                  Cancel
                </SubmitButton>
              </div>
            </div>
          )}

          {/* Faculty/Dean: complete/cancel APPROVED (without active form) */}
          {(isFaculty || isDean) && effectiveStatus === "APPROVED" && !showCompleteForm && (
            <div className="flex flex-wrap gap-2">
              <SubmitButton
                onClick={() => setShowCompleteForm(true)}
                variant="primary"
              >
                Mark Complete
              </SubmitButton>
              <SubmitButton
                onClick={() => handleAction("cancel")}
                loading={actionLoading === "cancel"}
                variant="danger"
              >
                {actionLoading === "cancel" ? "Cancelling..." : "Cancel"}
              </SubmitButton>
            </div>
          )}

          {/* Faculty/Dean: Complete form */}
          {(isFaculty || isDean) && showCompleteForm && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-800">Complete Appointment</p>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Actions Taken <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  rows={4}
                  placeholder="Describe what actions were taken during this appointment..."
                  className="input text-xs py-2 w-full resize-none"
                />
                <p className={`text-[10px] mt-0.5 ${actionTaken.trim().length >= 100 ? "text-emerald-600" : "text-slate-400"}`}>
                  {actionTaken.trim().length}/100 minimum
                </p>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Screenshot proof (images only, up to 3)
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  multiple
                  disabled={completeFiles.length >= 3}
                  onChange={(e) => {
                    const newFiles = Array.from(e.target.files || [])
                    setCompleteFiles((prev) => [...prev, ...newFiles].slice(0, 3))
                  }}
                  className="text-xs mt-1"
                />
                {completeFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {completeFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-xs text-slate-600">
                        <span className="truncate max-w-[120px]">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setCompleteFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="text-red-500 hover:text-red-700 font-bold leading-none"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {completeError && <p className="text-xs text-red-600 font-semibold">{completeError}</p>}

              <div className="flex flex-wrap gap-2">
                <SubmitButton
                  onClick={handleCompleteSubmit}
                  loading={actionLoading === "complete"}
                  variant="primary"
                >
                  {actionLoading === "complete" ? "Completing..." : "Submit & Complete"}
                </SubmitButton>
                <SubmitButton
                  onClick={() => {
                    setShowCompleteForm(false)
                    setActionTaken("")
                    setCompleteFiles([])
                    setCompleteError("")
                  }}
                  variant="secondary"
                >
                  Cancel
                </SubmitButton>
              </div>
            </div>
          )}

          {/* Faculty/Dean: retry Teams sync */}
          {(hasRole(role, "FACULTY") || hasRole(role, "DEAN")) && effectiveStatus === "APPROVED" && appointment.teamsSyncStatus === "FAILED" && (
            <SubmitButton
              onClick={() => handleAction("retry-sync", `/api/appointments/${appointmentId}/retry-sync`)}
              loading={actionLoading === "retry-sync"}
              variant="secondary"
            >
              {actionLoading === "retry-sync" ? "Retrying..." : "Retry Teams Sync"}
            </SubmitButton>
          )}

          {/* Non-organizer attendee: accept/decline while PENDING */}
          {!isOrganizer && myAttendeeRecord?.status === "PENDING" && effectiveStatus === "APPROVED" && (
            <div className="flex flex-wrap gap-2">
              <SubmitButton
                onClick={() => handleAction("attendee-accept")}
                loading={actionLoading === "accept"}
                variant="success"
              >
                Accept
              </SubmitButton>
              <SubmitButton
                onClick={() => handleAction("attendee-decline")}
                loading={actionLoading === "decline"}
                variant="danger"
              >
                Decline
              </SubmitButton>
            </div>
          )}

          {/* Organizer: resend (disabled, coming soon) */}
          {isOrganizer && effectiveStatus === "APPROVED" && (
            <SubmitButton disabled variant="secondary">
              Resend Invitations — Coming Soon
            </SubmitButton>
          )}

          {/* Terminal states */}
          {(effectiveStatus === "REJECTED" || effectiveStatus === "COMPLETED" || effectiveStatus === "CANCELLED") && (
            <p className="text-sm text-slate-400 italic">No further actions available</p>
          )}
        </div>

        {/* Back button — far right opposite actions */}
        <SubmitButton onClick={() => router.back()} variant="secondary">
          ← Back
        </SubmitButton>
      </div>
    </div>
  </div>
  )
}
