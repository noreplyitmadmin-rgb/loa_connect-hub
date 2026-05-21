"use client"

import { useState } from "react"

interface TeamsLinkInputProps {
  appointmentId: string
}

export function TeamsLinkInput({ appointmentId }: TeamsLinkInputProps) {
  const [teamsLink, setTeamsLink] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamsLink.trim()) return

    setLoading(true)
    setMessage("")

    try {
      const res = await fetch(`/api/appointments/${appointmentId}/teams-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamsLink }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage("Teams link added!")
        setTeamsLink("")
        setTimeout(() => setMessage(""), 3000)
      } else {
        setMessage(data.error || "Failed to add Teams link")
      }
    } catch {
      setMessage("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-1.5 w-full">
      <form onSubmit={handleSubmit} className="flex gap-1.5 w-full">
        <div className="relative flex-grow">
          <input
            type="url"
            value={teamsLink}
            onChange={(e) => setTeamsLink(e.target.value)}
            placeholder="https://teams.microsoft.com/l/meetup-join/..."
            className="input text-xs pr-8 py-2"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !teamsLink.trim()}
          className="btn-primary text-xs whitespace-nowrap px-3.5"
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </form>
      {message && (
        <p className={`text-[11px] font-semibold animate-slide-down ${
          message.includes("successfully") || message.includes("added")
            ? "text-emerald-600"
            : "text-rose-600"
        }`}>
          {message}
        </p>
      )}
    </div>
  )
}
