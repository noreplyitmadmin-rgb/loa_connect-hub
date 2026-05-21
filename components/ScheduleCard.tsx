"use client"

import { useState } from "react"

interface ScheduleCardProps {
  schedule: {
    id: string
    date: string
    startTime: string
    endTime: string
    isAvailable: boolean
    faculty?: { name: string }
  }
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

export function ScheduleCard({ schedule }: ScheduleCardProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [booked, setBooked] = useState(false)

  const handleBook = async () => {
    setLoading(true)
    setMessage("")

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId: schedule.id }),
      })

      if (res.ok) {
        setBooked(true)
        setMessage("Appointment requested!")
      } else {
        const data = await res.json()
        setMessage(data.error || "Failed to book appointment")
      }
    } catch {
      setMessage("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const getInitial = (name: string) => name?.charAt(0)?.toUpperCase() || "?"

  return (
    <div className="card p-5 bg-white flex flex-col justify-between h-full min-h-[220px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          {schedule.faculty && (
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getAvatarClass(schedule.faculty.name)} flex items-center justify-center text-xs font-bold shadow-sm shrink-0`}>
                {getInitial(schedule.faculty.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 leading-tight">{schedule.faculty.name}</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Faculty</p>
              </div>
            </div>
          )}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
            schedule.isAvailable
              ? "bg-emerald-50 text-emerald-700 border-emerald-200/50"
              : "bg-slate-100 text-slate-500 border-slate-200/50"
          }`}>
            {schedule.isAvailable ? "Available" : "Booked"}
          </span>
        </div>

        <div className="pt-2 border-t border-slate-50">
          <p className="text-base font-bold text-slate-800 tracking-tight">{schedule.date}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-medium">
            <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{schedule.startTime} &ndash; {schedule.endTime}</span>
          </div>
        </div>
      </div>

      <div className="pt-4 mt-auto">
        {schedule.isAvailable && !booked && (
          <button
            onClick={handleBook}
            disabled={loading}
            className="w-full btn-primary text-xs font-semibold py-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Booking...
              </span>
            ) : "Book Appointment"}
          </button>
        )}
        {booked && (
          <div className="text-center py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-xs font-semibold text-emerald-700">\u2713 Requested \u2014 awaiting faculty approval</p>
          </div>
        )}

        {message && !booked && (
          <p className={`mt-3 text-xs text-center font-semibold ${
            message.includes("successfully") || message.includes("Reloading")
              ? "text-emerald-600"
              : "text-rose-600"
          }`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
