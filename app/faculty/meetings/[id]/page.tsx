"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import SubmitButton from "@/components/SubmitButton"
import Skeleton from "@/components/Skeleton"

interface Participant {
  id: string
  userId: string
  status: "PENDING" | "ACCEPTED" | "DECLINED"
  user: {
    id: string
    name: string
    email: string
  }
}

interface Meeting {
  id: string
  title: string
  description: string | null
  date: string
  startTime: string
  endTime: string
  organizerId: string
  status: "CONFIRMED" | "CANCELLED"
  teamsLink: string | null
  createdAt: string
  organizer: { id: string; name: string; email: string }
  participants: Participant[]
}

interface ResendState {
  count: number
  nextAvailableAt: number | null
}

const statusColors: Record<string, string> = {
  CONFIRMED: "bg-emerald-500/20 text-emerald-600",
  CANCELLED: "bg-slate-500/20 text-slate-500",
}

const participantBadgeColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  ACCEPTED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  DECLINED: "bg-red-100 text-red-700 border-red-200",
}

function getInitial(name: string) {
  return name?.charAt(0)?.toUpperCase() || "?"
}

export default function MeetingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [resendState, setResendState] = useState<ResendState>({ count: 0, nextAvailableAt: null })
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState("")
  const [resendError, setResendError] = useState("")
  const [resendTimer, setResendTimer] = useState(0)

  const meetingId = params.id as string
  const userId = (session?.user as any)?.id

  const storageKey = `meeting-resend-${meetingId}`

  useEffect(() => {
    if (!meetingId) return
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (
        typeof parsed?.count === "number" &&
        (parsed?.nextAvailableAt === null || typeof parsed?.nextAvailableAt === "number")
      ) {
        setResendState(parsed)
      }
    } catch {
      // ignore malformed local storage
    }
  }, [meetingId, storageKey])

  useEffect(() => {
    if (!resendState.nextAvailableAt) {
      setResendTimer(0)
      return
    }

    const tick = () => {
      const remainingMs = resendState.nextAvailableAt! - Date.now()
      if (remainingMs <= 0) {
        setResendTimer(0)
        if (resendState.count >= 3) {
          setResendState((prev) => (prev ? { ...prev, nextAvailableAt: null } : prev))
        } else {
          setResendState((prev) => (prev ? { ...prev, nextAvailableAt: null } : prev))
        }
        return
      }

      setResendTimer(Math.ceil(remainingMs / 1000))
    }

    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [resendState.count, resendState.nextAvailableAt])

  const getResendDelay = (attempt: number) => {
    if (attempt === 1) return 60_000
    if (attempt === 2) return 5 * 60_000
    if (attempt === 3) return 15 * 60_000
    return 0
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${remainingSeconds}s`
  }

  const getResendButtonLabel = () => {
    if (resendState.nextAvailableAt && resendTimer > 0) {
      return `Resend available in ${formatTime(resendTimer)}`
    }

    if (resendState.count >= 3) {
      return "Resend disabled"
    }

    return "Resend Invitations"
  }

  const handleResend = async () => {
    if (resendLoading) return
    if (resendState.nextAvailableAt && Date.now() < resendState.nextAvailableAt) return
    if (resendState.count >= 3) return

    setResendLoading(true)
    setResendError("")
    setResendMessage("")

    try {
      const res = await fetch(`/api/meetings/${meetingId}/resend`, {
        method: "POST",
      })
      const data = await res.json()

      if (!res.ok) {
        setResendError(data.error || "Failed to resend invites")
        return
      }

      const nextCount = resendState.count + 1
      const nextAvailableAt = nextCount <= 3 ? Date.now() + getResendDelay(nextCount) : null
      const nextState = { count: nextCount, nextAvailableAt }
      setResendState(nextState)
      window.localStorage.setItem(storageKey, JSON.stringify(nextState))
      setResendMessage(data.message || "Invites resent successfully.")
    } catch {
      setResendError("Failed to resend invites")
    } finally {
      setResendLoading(false)
    }
  }

  useEffect(() => {
    if (!meetingId) return
    fetch(`/api/meetings/${meetingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.meeting) setMeeting(data.meeting)
        else setError("Meeting not found")
      })
      .catch(() => setError("Failed to load meeting"))
      .finally(() => setLoading(false))
  }, [meetingId])

  const pendingRef = useRef(false)

  const handleRespond = async (status: "ACCEPTED" | "DECLINED") => {
    if (pendingRef.current) return
    pendingRef.current = true
    try {
      const res = await fetch(`/api/meetings/${meetingId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (res.ok && data.participant) {
        setMeeting((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            participants: prev.participants.map((p) =>
              p.userId === userId ? { ...p, status } : p
            ),
          }
        })
      }
    } catch {
      // ignore
    } finally {
      pendingRef.current = false
    }
  }

  const handleCancel = async () => {
    if (!confirm("Cancel this meeting?")) return
    if (pendingRef.current) return
    pendingRef.current = true
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, { method: "PATCH" })
      const data = await res.json()
      if (res.ok && data.meeting) {
        setMeeting(data.meeting)
      }
    } catch {
      // ignore
    } finally {
      pendingRef.current = false
    }
  }

  if (loading) return (
    <div className="p-6 md:p-8 max-w-3xl space-y-4">
      <Skeleton variant="card" className="h-48" />
      <Skeleton variant="text" className="w-1/3" />
      <Skeleton variant="text" className="w-1/2" />
      <Skeleton variant="card" className="h-32" />
    </div>
  )
  if (error || !meeting) return <div className="p-6 md:p-8"><p className="text-red-600">{error || "Meeting not found"}</p></div>

  const isOrganizer = meeting.organizerId === userId
  console.log("Meeting details:", meeting, userId);
  const myParticipation = meeting.participants?.find((p) => p.userId === userId)
  const otherParticipantCount = meeting.participants?.filter((p) => p.userId !== userId).length || 0
  const isResendThrottled = resendState.nextAvailableAt ? Date.now() < resendState.nextAvailableAt : false
  const isResendDisabled = resendState.count >= 3 || isResendThrottled

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      {/* Back */}
      {/* <button
        onClick={() => router.push("/faculty/meetings")}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Consultations
      </button> */}

      {/* Header */}
      <div className="card p-6 bg-white mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-slate-900">{meeting.title}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[meeting.status]}`}>
                {meeting.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {meeting.date}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {meeting.startTime} &ndash; {meeting.endTime}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Organized by <span className="font-semibold text-slate-600">{meeting.organizer?.name}</span>
            </p>
          </div>
        </div>

        {meeting.description && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-sm text-slate-600">{meeting.description}</p>
          </div>
        )}

        {meeting.teamsLink && (
          <a
            href={meeting.teamsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-gold-700 bg-gold-50 border border-gold-200 hover:bg-gold-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Join Teams Meeting
          </a>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          {!isOrganizer && meeting.status === "CONFIRMED" && myParticipation?.status === "PENDING" && (
            <>
              <SubmitButton onClick={() => handleRespond("ACCEPTED")} variant="primary">
                Accept
              </SubmitButton>
              <SubmitButton onClick={() => handleRespond("DECLINED")} variant="danger">
                Decline
              </SubmitButton>
            </>
          )}
          {myParticipation?.status === "ACCEPTED" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              You accepted
            </span>
          )}
          {myParticipation?.status === "DECLINED" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700">
              You declined
            </span>
          )}
          {isOrganizer && meeting.status === "CONFIRMED" && (
            <SubmitButton onClick={handleCancel} variant="danger">
              Cancel Consultation
            </SubmitButton>
          )}
          {isOrganizer && meeting.status === "CONFIRMED" && otherParticipantCount > 0 && (
            <SubmitButton
              onClick={handleResend}
              loading={resendLoading}
              disabled={isResendDisabled}
              variant="secondary"
            >
              {getResendButtonLabel()}
            </SubmitButton>
          )}
        </div>
        {resendMessage && (
          <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
            {resendMessage}
          </div>
        )}
        {resendError && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {resendError}
          </div>
        )}
      </div>

      {/* Participants */}
      <div className="card p-6 bg-white">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
          Participants ({meeting.participants?.length || 0})
        </h2>
        <div className="space-y-3">
          {meeting.participants?.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                  p.status === "ACCEPTED" ? "bg-emerald-500" : p.status === "DECLINED" ? "bg-red-400" : "bg-slate-400"
                }`}>
                  {getInitial(p.user?.name || "?")}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.user?.name}</p>
                  <p className="text-xs text-slate-400">{p.user?.email}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${participantBadgeColors[p.status] || "bg-slate-100 text-slate-500 border-slate-200"}`}>
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
