"use client"

import { useState } from "react"

export function AvailabilityForm() {
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, startTime, endTime }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage("Availability slot created!")
        setDate("")
        setStartTime("")
        setEndTime("")
      } else {
        setMessage(data.error || "Failed to create schedule")
      }
    } catch {
      setMessage("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div>
          <label htmlFor="date" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Consultation Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            min={new Date().toISOString().split("T")[0]}
            className="input text-slate-800"
          />
        </div>

        <div>
          <label htmlFor="startTime" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Start Time
          </label>
          <input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="input text-slate-800"
          />
        </div>

        <div>
          <label htmlFor="endTime" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            End Time
          </label>
          <input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className="input text-slate-800"
          />
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between gap-4 flex-wrap-reverse">
        {message && (
          <p className={`text-xs font-semibold animate-slide-down ${
            message.includes("successfully") || message.includes("created")
              ? "text-emerald-600"
              : "text-rose-600"
          }`}>
            {message}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn-success text-xs font-semibold px-5 py-2.5 ml-auto">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating...
            </span>
          ) : "Create Availability Slot"}
        </button>
      </div>
    </form>
  )
}
