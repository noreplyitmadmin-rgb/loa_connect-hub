"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useApiGet } from "@/lib/api/client"

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
  department: string | null
  rules: FacultyRule[]
}

interface Props {
  facultyWithRules: FacultyWithRules[]
  userRole: string
  serverNow?: string
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

function toOurDayOfWeek(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1
}

function fmtDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

type Step = "faculty" | "date" | "time" | "confirm"

interface BookedAppointment {
  date: string
  startTime: string
  endTime: string
}

export default function MobileBookingFlow({ facultyWithRules, serverNow }: Props) {
  const now = useMemo(() => (serverNow ? new Date(serverNow) : new Date()), [serverNow])
  const router = useRouter()

  const [step, setStep] = useState<Step>("faculty")
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null)
  const [bookedAppointments, setBookedAppointments] = useState<BookedAppointment[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: number; error?: string } | null>(null)
  const [facultySearch, setFacultySearch] = useState("")

  const selectedFaculty = useMemo(
    () => facultyWithRules.filter((f) => f.id === selectedFacultyId),
    [facultyWithRules, selectedFacultyId]
  )

  const filteredFaculty = useMemo(() => {
    if (!facultySearch.trim()) return facultyWithRules
    const q = facultySearch.trim().toLowerCase()
    return facultyWithRules.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.department && f.department.toLowerCase().includes(q)) ||
        f.email.toLowerCase().includes(q)
    )
  }, [facultyWithRules, facultySearch])

  const groupedFaculty = useMemo(() => {
    const groups: Record<string, FacultyWithRules[]> = {}
    for (const f of filteredFaculty) {
      const dept = f.department || "No department"
      if (!groups[dept]) groups[dept] = []
      groups[dept].push(f)
    }
    const sorted = Object.entries(groups).sort(([a], [b]) => {
      if (a === "No department") return 1
      if (b === "No department") return -1
      return a.localeCompare(b)
    })
    return sorted
  }, [filteredFaculty])

  // Fetch booked appointments when faculty or month changes
  const bookedUrl = selectedFacultyId
    ? `/api/appointments/faculty-booked?facultyId=${selectedFacultyId}&startDate=${fmtDate(currentYear, currentMonth, 1)}&endDate=${fmtDate(currentYear, currentMonth, getDaysInMonth(currentYear, currentMonth))}`
    : null

  const { data: bookedData } = useApiGet<{ appointments: { date: string; startTime: string; endTime: string }[] }>(bookedUrl)

  useEffect(() => {
    if (bookedData?.appointments && !bookedAppointments.length) {
      setBookedAppointments(bookedData.appointments) // eslint-disable-line react-hooks/set-state-in-effect -- sync SWR data
    }
  }, [bookedData, bookedAppointments.length])

  const getActiveRule = (faculty: FacultyWithRules, dateStr: string) => {
    const dayOfWeek = toOurDayOfWeek(new Date(dateStr + "T12:00:00").getDay())
    return faculty.rules.find(
      (r) =>
        r.dayOfWeek === dayOfWeek &&
        r.startDate <= dateStr &&
        (r.endDate === null || r.endDate >= dateStr)
    ) || null
  }

  const freeRanges = useMemo(() => {
    if (!selectedDay || selectedFaculty.length === 0) return []
    const dateStr = fmtDate(currentYear, currentMonth, selectedDay)
    const faculty = selectedFaculty[0]
    const rule = getActiveRule(faculty, dateStr)

    if (!rule || rule.isBlocked || !rule.startTime || !rule.endTime) return []

    let ranges = [{ start: rule.startTime, end: rule.endTime }]

    const dayBookings = bookedAppointments.filter((a) => a.date === dateStr)
    for (const apt of dayBookings) {
      const newRanges: { start: string; end: string }[] = []
      for (const r of ranges) {
        if (apt.startTime < r.end && apt.endTime > r.start) {
          if (apt.startTime > r.start) newRanges.push({ start: r.start, end: apt.startTime })
          if (apt.endTime < r.end) newRanges.push({ start: apt.endTime, end: r.end })
        } else {
          newRanges.push(r)
        }
      }
      ranges = newRanges
    }

    return ranges.sort((a, b) => a.start.localeCompare(b.start))
  }, [selectedDay, selectedFaculty, currentYear, currentMonth, bookedAppointments])

  const handleBack = () => {
    if (step === "date") { setSelectedFacultyId(null); setStep("faculty") }
    else if (step === "time") { setSelectedDay(null); setStep("date") }
    else if (step === "confirm") { setSelectedSlot(null); setStep("time") }
  }

  const handleBook = async () => {
    if (!selectedFacultyId || !selectedSlot || !selectedDay) return
    setSubmitting(true)
    setResult(null)

    const dateStr = fmtDate(currentYear, currentMonth, selectedDay)
    const payload = {
      facultyIds: [selectedFacultyId],
      timeSlots: [{ date: dateStr, startTime: selectedSlot.start, endTime: selectedSlot.end }],
      title: "",
      description: "",
    }

    try {
      const res = await fetch("/api/appointments/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: 1 })
        setSelectedFacultyId(null)
        setSelectedDay(null)
        setSelectedSlot(null)
        setTimeout(() => router.push("/student/m/meetings"), 1500)
      } else {
        setResult({ success: 0, error: data.error || "Booking failed" })
      }
    } catch {
      setResult({ success: 0, error: "An error occurred" })
    } finally {
      setSubmitting(false)
    }
  }

  const activeFaculty = selectedFaculty[0]
  const dateStr = selectedDay ? fmtDate(currentYear, currentMonth, selectedDay) : null
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth)
  const todayStr = fmtDate(now.getFullYear(), now.getMonth(), now.getDate())

  return (
    <div className="space-y-4">
      {/* Back button */}
      {step !== "faculty" && (
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 min-h-[44px] -ml-1 px-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      )}

      {/* Step pills */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        {(["faculty", "date", "time", "confirm"] as Step[]).map((s, i) => {
          const labels: Record<Step, string> = { faculty: "Faculty", date: "Date", time: "Time", confirm: "Review" }
          const isActive = step === s
          const isPast = ["faculty", "date", "time", "confirm"].indexOf(step) > i
          return (
            <span
              key={s}
              className={`flex items-center gap-1 ${isActive ? "text-gold-600" : isPast ? "text-emerald-600" : "text-slate-300"}`}
            >
              {isPast && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {i + 1}. {labels[s]}
              {i < 3 && <span className="text-slate-200 mx-0.5">&rarr;</span>}
            </span>
          )
        })}
      </div>

      {/* ── STEP: Faculty ──────────────────────────────────── */}
      {step === "faculty" && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">Select a faculty member</p>

          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={facultySearch}
              onChange={(e) => setFacultySearch(e.target.value)}
              placeholder="Search by name, department, or email"
              className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-white border border-slate-200 focus:border-gold-400 focus:ring-2 focus:ring-gold-200 outline-none transition-colors"
            />
          </div>

          {/* Count */}
          <p className="text-xs text-slate-400">
            {filteredFaculty.length === facultyWithRules.length
              ? `${facultyWithRules.length} faculty`
              : `${filteredFaculty.length} of ${facultyWithRules.length} faculty`}
          </p>

          {groupedFaculty.length === 0 && (
            <div className="card p-8 bg-white text-center">
              <p className="text-sm text-slate-400">No faculty match your search.</p>
              <button
                onClick={() => setFacultySearch("")}
                className="text-sm text-gold-600 font-semibold mt-2 underline underline-offset-2"
              >
                Clear search
              </button>
            </div>
          )}

          <div className="space-y-4">
            {groupedFaculty.map(([dept, members]) => (
              <div key={dept}>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">
                  {dept} &middot; {members.length}
                </h3>
                <div className="space-y-1.5">
                  {members.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => { setSelectedFacultyId(f.id); setStep("date") }}
                      className="w-full text-left p-4 rounded-xl bg-white border border-slate-200 hover:border-gold-300 active:bg-gold-50 transition-colors min-h-[60px]"
                    >
                      <p className="text-sm font-semibold text-slate-800">{f.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{f.department || "No department"}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP: Date ─────────────────────────────────────── */}
      {step === "date" && activeFaculty && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">Select a date for {activeFaculty.name}</p>

          {/* Month nav */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1) }
                else setCurrentMonth((m) => m - 1)
              }}
              className="p-2 rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-bold text-slate-800">{MONTH_NAMES[currentMonth]} {currentYear}</span>
            <button
              onClick={() => {
                if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1) }
                else setCurrentMonth((m) => m + 1)
              }}
              className="p-2 rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {DAY_NAMES.map((d) => (<div key={d}>{d}</div>))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayIndex }).map((_, i) => (<div key={`empty-${i}`} />))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dStr = fmtDate(currentYear, currentMonth, day)
              const isPast = dStr < todayStr
              const hasRule = activeFaculty.rules.some((r) => {
                const dayOfWeek = toOurDayOfWeek(new Date(dStr + "T12:00:00").getDay())
                return r.dayOfWeek === dayOfWeek && !r.isBlocked && r.startDate <= dStr && (r.endDate === null || r.endDate >= dStr)
              })
              const isAvailable = !isPast && hasRule
              const isSelected = selectedDay === day

              return (
                <button
                  key={day}
                  disabled={!isAvailable}
                  onClick={() => { setSelectedDay(day); setStep("time") }}
                  className={`aspect-square rounded-lg text-sm font-semibold flex items-center justify-center transition-colors min-h-[44px] ${
                    isSelected
                      ? "bg-gold-600 text-white"
                      : isAvailable
                        ? "bg-white border border-slate-200 text-slate-800 hover:border-gold-400"
                        : "text-slate-300 cursor-not-allowed"
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── STEP: Time ─────────────────────────────────────── */}
      {step === "time" && dateStr && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">
            Select time on {dateStr}
          </p>

          {freeRanges.length === 0 ? (
            <div className="card p-6 bg-white text-center">
              <p className="text-sm text-slate-400">No available time slots for this date.</p>
              <button onClick={handleBack} className="text-sm text-gold-600 font-semibold mt-2 underline underline-offset-2">
                Choose another date
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {freeRanges.map((range, i) => {
                const startH = parseInt(range.start.split(":")[0])
                const endH = parseInt(range.end.split(":")[0])
                const slots: { start: string; end: string }[] = []

                for (let h = startH; h < endH; h++) {
                  const slotStart = `${String(h).padStart(2, "0")}:00`
                  const slotEnd = `${String(h + 1).padStart(2, "0")}:00`
                  if (slotStart >= range.start && slotEnd <= range.end) {
                    slots.push({ start: slotStart, end: slotEnd })
                  }
                }

                return (
                  <div key={i} className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {range.start} &ndash; {range.end}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((slot) => {
                        const isSelected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end
                        return (
                          <button
                            key={slot.start}
                            onClick={() => { setSelectedSlot(slot); setStep("confirm") }}
                            className={`py-3 px-2 rounded-xl text-sm font-semibold transition-colors border min-h-[44px] ${
                              isSelected
                                ? "bg-gold-600 text-white border-gold-600"
                                : "bg-white border-slate-200 text-slate-700 hover:border-gold-400"
                            }`}
                          >
                            {slot.start}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── STEP: Confirm & Book ───────────────────────────── */}
      {step === "confirm" && activeFaculty && selectedSlot && dateStr && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-700">Review your booking</p>

          <div className="card p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Faculty</span>
              <span className="text-sm font-semibold text-slate-800">{activeFaculty.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Date</span>
              <span className="text-sm font-semibold text-slate-800">{dateStr}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Time</span>
              <span className="text-sm font-semibold text-slate-800">{selectedSlot.start} &ndash; {selectedSlot.end}</span>
            </div>
          </div>

          {result && result.success === 1 && (
            <div className="card p-4 bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-emerald-800">Booking submitted!</p>
              <button
                onClick={() => router.push("/student/m/meetings")}
                className="text-sm font-semibold text-gold-600 underline underline-offset-2"
              >
                View my consultations
              </button>
            </div>
          )}

          {result && result.success === 0 && (
            <div className="card p-4 bg-red-50 border border-red-200">
              <p className="text-sm font-semibold text-red-700">{result.error || "Booking failed"}</p>
            </div>
          )}

          {!result && (
            <button
              onClick={handleBook}
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-gold-600 text-white font-semibold text-sm hover:bg-gold-700 transition-colors disabled:opacity-50 min-h-[48px]"
            >
              {submitting ? "Booking..." : "Confirm & Book"}
            </button>
          )}

          {!result && (
            <button onClick={handleBack} className="w-full text-sm text-slate-500 underline underline-offset-2 py-2">
              Change time or date
            </button>
          )}
        </div>
      )}

      {/* Desktop view link */}
      {step === "faculty" && (
        <div className="text-center pt-2">
          <a
            href="/student/book?desktop=1"
            className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
          >
            Desktop version
          </a>
        </div>
      )}
    </div>
  )
}
