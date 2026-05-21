"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface FacultyUser {
  id: string
  name: string
  email: string
}

interface Conflict {
  type: "appointment" | "meeting"
  userName: string
  title: string
  date: string
  startTime: string
  endTime: string
}

export default function NewMeetingPage() {
  const router = useRouter()
  const [facultyList, setFacultyList] = useState<FacultyUser[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/auth/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.users) setFacultyList(data.users.filter((u: any) => u.role === "FACULTY"))
      })
      .catch(() => {})
  }, [])

  // Check conflicts when date/time/participants change
  useEffect(() => {
    if (!date || !startTime || !endTime || selectedIds.length === 0) {
      setConflicts([])
      return
    }
    const timer = setTimeout(async () => {
      setChecking(true)
      try {
        const res = await fetch("/api/meetings/conflicts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ facultyIds: selectedIds, date, startTime, endTime }),
        })
        const data = await res.json()
        setConflicts(data.conflicts || [])
      } catch {
        setConflicts([])
      } finally {
        setChecking(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [date, startTime, endTime, selectedIds])

  const toggleParticipant = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          date,
          startTime,
          endTime,
          participantIds: selectedIds,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(`/faculty/meetings/${data.meeting.id}`)
      } else {
        setError(data.error || "Failed to create meeting")
      }
    } catch {
      setError("An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">New Internal Meeting</h1>
        <p className="text-sm text-slate-500 mt-1">Schedule a meeting with other faculty members</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="input-label">Meeting Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="e.g. Thesis Review Sync"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="input-label">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input min-h-[80px]"
            placeholder="Agenda, topics to discuss..."
          />
        </div>

        {/* Date */}
        <div>
          <label className="input-label">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
            required
          />
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="input-label">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>

        {/* Participants */}
        <div>
          <label className="input-label">Invite Faculty</label>
          <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
            {facultyList.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Loading faculty...</p>
            ) : (
              facultyList.map((f) => (
                <label
                  key={f.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedIds.includes(f.id)
                      ? "border-indigo-300 bg-indigo-50/50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(f.id)}
                    onChange={() => toggleParticipant(f.id)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{f.name}</p>
                    <p className="text-xs text-slate-400">{f.email}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Conflict warnings */}
        {conflicts.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm font-semibold text-amber-800">Scheduling Conflicts Detected</p>
            </div>
            <ul className="space-y-1 ml-7">
              {conflicts.map((c, i) => (
                <li key={i} className="text-xs text-amber-700">
                  <span className="font-medium">{c.userName}</span> has a{c.type === "appointment" ? "n" : ""}{" "}
                  <span className="font-semibold">{c.type === "appointment" ? "appointment" : "meeting"}</span>:{" "}
                  &ldquo;{c.title}&rdquo; at {c.startTime}&ndash;{c.endTime}
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-600 mt-2">Conflicts are advisory — you can still proceed.</p>
          </div>
        )}
        {checking && (
          <p className="text-xs text-slate-400 italic">Checking for conflicts...</p>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !title || !date || !startTime || !endTime}
            className="btn-primary text-sm font-semibold px-6 py-2.5 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Meeting"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/faculty/meetings")}
            className="text-sm font-medium text-slate-500 hover:text-slate-700 px-4 py-2.5"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
