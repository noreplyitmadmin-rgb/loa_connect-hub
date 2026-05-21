"use client"

import { useState, useEffect } from "react"

interface Schedule {
  id: string
  date: string
  startTime: string
  endTime: string
  isAvailable: boolean
  faculty?: { name: string }
}

export function BookingForm() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSchedule, setSelectedSchedule] = useState<string>("")
  const [booking, setBooking] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetchSchedules()
  }, [])

  const fetchSchedules = async () => {
    try {
      const res = await fetch("/api/schedules")
      const data = await res.json()
      setSchedules(data.schedules || [])
    } catch {
      setMessage("Failed to load schedules")
    } finally {
      setLoading(false)
    }
  }

  const handleBook = async () => {
    if (!selectedSchedule) {
      setMessage("Please select a time slot")
      return
    }

    setBooking(true)
    setMessage("")

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId: selectedSchedule }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage("Appointment requested!")
        fetchSchedules()
        setSelectedSchedule("")
        setTimeout(() => setMessage(""), 3000)
      } else {
        setMessage(data.error || "Failed to book appointment")
      }
    } catch {
      setMessage("An error occurred")
    } finally {
      setBooking(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-3.5 w-24 bg-slate-100 rounded animate-pulse" />
        <div className="h-10 w-full bg-slate-50 border border-slate-100 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="schedule" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Select a Consultation Time Slot
        </label>
        <div className="relative">
          <select
            id="schedule"
            value={selectedSchedule}
            onChange={(e) => setSelectedSchedule(e.target.value)}
            className="input appearance-none bg-white text-slate-800 text-sm pr-10 py-2.5"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236366f1' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: "right 0.75rem center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "1.25rem",
            }}
          >
            <option value="" className="text-slate-400">-- Choose a slot --</option>
            {schedules
              .filter((s) => s.isAvailable)
              .map((schedule) => (
                <option key={schedule.id} value={schedule.id} className="text-slate-800">
                  {schedule.faculty?.name} — {schedule.date} ({schedule.startTime} - {schedule.endTime})
                </option>
              ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleBook}
        disabled={booking || !selectedSchedule}
        className="btn-primary w-full text-xs font-semibold py-2.5"
      >
        {booking ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Booking...
          </span>
        ) : "Book Appointment"}
      </button>

      {message && (
        <p className={`text-xs text-center font-semibold animate-slide-down ${
          message.includes("successfully") ? "text-emerald-600" : "text-rose-600"
        }`}>
          {message}
        </p>
      )}
    </div>
  )
}
