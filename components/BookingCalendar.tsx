"use client"

import { useState, useMemo } from "react"

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

interface Slot {
  id: string
  facultyId: string
  faculty: { id: string; name: string; email: string }
  date: string
  startTime: string
  endTime: string
}

interface Props {
  schedules: Slot[]
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  // Convert Sunday=0 → Monday=0 index
  return day === 0 ? 6 : day - 1
}

export default function BookingCalendar({ schedules }: Props) {
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [bookingMsg, setBookingMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [facultyFilter, setFacultyFilter] = useState<string>("all")

  // Group schedules by date
  const slotsByDate = useMemo(() => {
    const map = new Map<string, Slot[]>()
    for (const s of schedules) {
      const existing = map.get(s.date) || []
      existing.push(s)
      map.set(s.date, existing)
    }
    return map
  }, [schedules])

  // Get unique faculty list for filter
  const facultyList = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of schedules) {
      if (!map.has(s.facultyId)) {
        map.set(s.facultyId, s.faculty.name)
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [schedules])

  // Get slots for a specific date string
  const getSlotsForDay = (year: number, month: number, day: number): Slot[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const slots = slotsByDate.get(dateStr) || []
    if (facultyFilter === "all") return slots
    return slots.filter((s) => s.facultyId === facultyFilter)
  }

  // Count slots for a day (for calendar cells)
  const getSlotCount = (year: number, month: number, day: number): number => {
    return getSlotsForDay(year, month, day).length
  }

  // Navigate months
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
    setSelectedDay(null)
    setBookingMsg(null)
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
    setSelectedDay(null)
    setBookingMsg(null)
  }

  const handleBook = async (scheduleId: string) => {
    setBookingId(scheduleId)
    setBookingMsg(null)

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId }),
      })

      if (res.ok) {
        setBookingMsg({ type: "success", text: "Appointment requested! Faculty will review it shortly." })
      } else {
        const err = await res.json()
        setBookingMsg({ type: "error", text: err.error || "Failed to book. Please try again." })
      }
    } catch {
      setBookingMsg({ type: "error", text: "Network error. Please try again." })
    } finally {
      setBookingId(null)
    }
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayOffset = getFirstDayOfMonth(currentYear, currentMonth)

  // Calendar grid: 6 rows × 7 cols
  const calendarCells: (number | null)[] = []
  // Empty cells before first day
  for (let i = 0; i < firstDayOffset; i++) calendarCells.push(null)
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d)

  const selectedDateStr = selectedDay
    ? `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : null

  const selectedSlots = selectedDay ? getSlotsForDay(currentYear, currentMonth, selectedDay) : []

  return (
    <div className="space-y-4">
      {/* Faculty Filter */}
      {facultyList.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Faculty:</label>
          <select
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
            className="input text-xs w-auto py-1.5"
          >
            <option value="all">All Faculty</option>
            {facultyList.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Booking message */}
      {bookingMsg && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
            bookingMsg.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {bookingMsg.type === "success" ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
          {bookingMsg.text}
        </div>
      )}

      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-lg font-bold text-slate-800">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="card overflow-hidden bg-white">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DAY_NAMES.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarCells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="p-2" />
            }

            const slotCount = getSlotCount(currentYear, currentMonth, day)
            const isToday =
              day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear()
            const isSelected = selectedDay === day
            const isPast =
              currentYear < now.getFullYear() ||
              (currentYear === now.getFullYear() && currentMonth < now.getMonth()) ||
              (currentYear === now.getFullYear() && currentMonth === now.getMonth() && day < now.getDate())

            return (
              <button
                key={day}
                onClick={() => {
                  if (slotCount > 0 && !isPast) {
                    setSelectedDay(day)
                    setBookingMsg(null)
                  }
                }}
                disabled={slotCount === 0 || isPast}
                className={`
                  p-2 min-h-[56px] border border-slate-50 relative transition-colors text-left
                  ${isSelected ? "bg-indigo-50 border-indigo-200 z-10" : ""}
                  ${slotCount > 0 && !isPast ? "hover:bg-indigo-50/50 cursor-pointer" : ""}
                  ${slotCount === 0 || isPast ? "opacity-40" : ""}
                `}
              >
                <span
                  className={`
                    text-xs font-semibold
                    ${isToday ? "bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center" : "text-slate-700"}
                  `}
                >
                  {day}
                </span>
                {slotCount > 0 && !isPast && (
                  <div className="mt-1">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">
                      {slotCount} slot{slotCount > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Day Slots */}
      {selectedDay && selectedSlots.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-700">
            Available on {MONTH_NAMES[currentMonth]} {selectedDay}, {currentYear}
          </h4>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {selectedSlots.map((slot) => (
              <div key={slot.id} className="card p-4 bg-white border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                    {slot.faculty.name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{slot.faculty.name}</p>
                    <p className="text-[10px] text-slate-400">{slot.faculty.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {slot.startTime} – {slot.endTime}
                </div>
                <button
                  onClick={() => handleBook(slot.id)}
                  disabled={bookingId === slot.id}
                  className="btn-primary w-full text-xs py-2"
                >
                  {bookingId === slot.id ? "Booking..." : "Book Appointment"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDay && selectedSlots.length === 0 && (
        <div className="card p-6 text-center bg-white">
          <p className="text-sm text-slate-500">No available slots for this day with the selected filter.</p>
        </div>
      )}

      {!selectedDay && schedules.length > 0 && (
        <p className="text-xs text-slate-400 text-center">Click a highlighted day above to see available slots.</p>
      )}

      {schedules.length === 0 && (
        <div className="card p-12 text-center bg-white">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-slate-700 font-semibold text-sm">No slots available</p>
          <p className="text-slate-400 text-xs mt-1">Faculty haven't posted any availability yet. Check back later.</p>
        </div>
      )}
    </div>
  )
}
