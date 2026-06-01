"use client"

import { useState, useMemo } from "react"
import BookingForm from "./BookingForm"

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

interface FacultyRule {
  id: string
  dayOfWeek: number
  isBlocked: boolean
  startTime: string | null
  endTime: string | null
  startDate: string
  endDate: string | null
}

interface FacultyWithRules {
  id: string
  name: string
  email: string
  hasLoggedInBefore: boolean
  rules: FacultyRule[]
}

interface Props {
  facultyWithRules: FacultyWithRules[]
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Convert Sunday=0 → Monday=0
}

/** Convert JS getDay() (0=Sun) to our dayOfWeek (0=Mon, 6=Sun) */
function toOurDayOfWeek(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1
}

/** Format YYYY-MM-DD from year/month/day */
function fmtDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** Generate 30-minute to 8-hour slot suggestions from a time window */
function generateSlots(startTime: string, endTime: string): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = []
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  
  // Convert to minutes for easier calculation
  let currentMinutes = sh * 60 + sm
  const endMinutes = eh * 60 + em
  const maxSlotDuration = 8 * 60 // 8 hours
  
  // Generate 30-minute increment slots
  while (currentMinutes < endMinutes) {
    const slotDuration = Math.min(maxSlotDuration, endMinutes - currentMinutes)
    if (slotDuration >= 30) { // Only add if duration is at least 30 minutes
      const startHours = Math.floor(currentMinutes / 60)
      const startMins = currentMinutes % 60
      const endHours = Math.floor((currentMinutes + slotDuration) / 60)
      const endMins = (currentMinutes + slotDuration) % 60
      
      const s = `${String(startHours).padStart(2, "0")}:${String(startMins).padStart(2, "0")}`
      const e = `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`
      slots.push({ start: s, end: e })
    }
    currentMinutes += 30 // Move to next 30-minute increment
  }
  return slots
}

export default function BookingCalendar({ facultyWithRules }: Props) {
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [facultyFilter, setFacultyFilter] = useState<string>("")
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [formSlot, setFormSlot] = useState<{
    id: string
    facultyId: string
    facultyName: string
    facultyEmail: string
    date: string
    startTime: string
    endTime: string
  } | null>(null)
  const [bookingMsg, setBookingMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Find the selected faculty's rules
  const selectedFaculty = useMemo(
    () => (facultyFilter ? facultyWithRules.find((f) => f.id === facultyFilter) || null : null),
    [facultyWithRules, facultyFilter]
  )

  // Get active rule for a specific date
  const getActiveRule = (faculty: FacultyWithRules, dateStr: string) => {
    const dayOfWeek = toOurDayOfWeek(new Date(dateStr + "T12:00:00").getDay())
    return faculty.rules.find(
      (r) =>
        r.dayOfWeek === dayOfWeek &&
        r.startDate <= dateStr &&
        (r.endDate === null || r.endDate >= dateStr)
    ) || null
  }

  // Check if a day in the calendar has available slots
  const dayHasSlots = (year: number, month: number, day: number): boolean => {
    if (!selectedFaculty) return false
    const dateStr = fmtDate(year, month, day)
    const rule = getActiveRule(selectedFaculty, dateStr)
    if (!rule || rule.isBlocked) return false
    if (!rule.startTime || !rule.endTime) return true // full day available
    return rule.startTime < rule.endTime
  }

  // Get available blocks for the selected day
  const availableSlots = useMemo(() => {
    if (!selectedDay || !selectedFaculty) return []
    const dateStr = fmtDate(currentYear, currentMonth, selectedDay)
    const rule = getActiveRule(selectedFaculty, dateStr)
    if (!rule || rule.isBlocked) return []
    if (rule.startTime && rule.endTime) {
      return generateSlots(rule.startTime, rule.endTime)
    }
    // Full day — show reasonable slots (08:00–17:00)
    return generateSlots("08:00", "17:00")
  }, [selectedDay, selectedFaculty, currentYear, currentMonth])

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayOffset = getFirstDayOfMonth(currentYear, currentMonth)

  const calendarCells: (number | null)[] = []
  for (let i = 0; i < firstDayOffset; i++) calendarCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d)

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

  const handleSlotBook = (slot: { start: string; end: string }) => {
    if (!selectedFaculty || !selectedDay) return
    const dateStr = fmtDate(currentYear, currentMonth, selectedDay)
    setFormSlot({
      id: `${selectedFaculty.id}-${dateStr}-${slot.start}`,
      facultyId: selectedFaculty.id,
      facultyName: selectedFaculty.name,
      facultyEmail: selectedFaculty.email,
      date: dateStr,
      startTime: slot.start,
      endTime: slot.end,
    })
  }

  return (
    <div className="space-y-4">
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

      {/* Faculty Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
        <label className="text-xs font-semibold text-slate-500">Professor:</label>
        <select
          value={facultyFilter}
          onChange={(e) => {
            setFacultyFilter(e.target.value)
            setSelectedDay(null)
            setBookingMsg(null)
          }}
          className="input text-xs py-1.5 w-full sm:w-auto sm:min-w-[200px]"
        >
          <option value="">Select a professor...</option>
          {facultyWithRules.map((f) => (
            <option key={f.id} value={f.id}>{f.name}{!f.hasLoggedInBefore ? " (Inactive)" : ""}</option>
          ))}
        </select>
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="p-3 sm:p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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
          className="p-3 sm:p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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

            const hasSlots = selectedFaculty && dayHasSlots(currentYear, currentMonth, day)
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
                      if (hasSlots && !isPast) {
                        setSelectedDay(day)
                        setBookingMsg(null)
                      }
                    }}
                    disabled={!hasSlots || isPast}
                    className={`
                      p-1 sm:p-2 min-h-[44px] sm:min-h-[56px] border border-slate-50 relative transition-colors text-left flex flex-col items-center justify-start
                      ${isSelected ? "bg-gold-50 border-gold-200 z-10" : ""}
                      ${hasSlots && !isPast ? "hover:bg-gold-50/50 cursor-pointer" : ""}
                      ${!hasSlots || isPast ? "opacity-40" : ""}
                    `}
                  >
                    <span
                      className={`
                        text-xs font-semibold
                        ${isToday ? "bg-gold-600 text-white w-6 h-6 rounded-full flex items-center justify-center" : "text-slate-700"}
                      `}
                    >
                      {day}
                    </span>
                    {hasSlots && !isPast && (
                      <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                )
          })}
        </div>
      </div>

      {/* Selected Day — Available Blocks */}
      {selectedDay && availableSlots.length > 0 && selectedFaculty && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-700">
            {selectedFaculty.name} &middot; {MONTH_NAMES[currentMonth]} {selectedDay}, {currentYear}
          </h4>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {availableSlots.map((slot, i) => (
              <div key={i} className="card p-3 bg-white border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0 sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {slot.start} – {slot.end}
                </div>
                <button
                  onClick={() => handleSlotBook(slot)}
                  className="btn-primary text-xs py-2 sm:py-1.5 px-4 w-full sm:w-auto"
                >
                  Book
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!selectedFaculty ? (
        <div className="card p-12 text-center bg-white">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-slate-700 font-semibold text-sm">Select a professor</p>
          <p className="text-slate-400 text-xs mt-1">Choose a faculty member above to see their available consultation slots.</p>
        </div>
      ) : selectedDay && availableSlots.length === 0 ? (
        <div className="card p-6 text-center bg-white">
          <p className="text-sm text-slate-500">No available time slots for this day.</p>
        </div>
      ) : !selectedDay ? (
        <p className="text-xs text-slate-400 text-center">Click a highlighted day above to see available time slots.</p>
      ) : null}

      {/* Booking Form Modal */}
      {formSlot && (
        <BookingForm
          slot={formSlot}
          onClose={() => setFormSlot(null)}
          onSuccess={() => {
            setFormSlot(null)
            setSelectedDay(null)
            setBookingMsg({ type: "success", text: "Appointment requested! Faculty will review it shortly." })
          }}
        />
      )}
    </div>
  )
}
