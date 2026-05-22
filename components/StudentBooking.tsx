"use client"

import { useState, useMemo } from "react"

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

/** Validate that time is at a 30-minute boundary (HH:00 or HH:30) */
function isValid30MinuteTime(time: string): boolean {
  if (!time) return false
  const [, mins] = time.split(":").map(Number)
  return mins === 0 || mins === 30
}

/** Round time to nearest 30-minute boundary */
function roundTo30Minutes(time: string): string {
  if (!time) return ""
  const [hours, mins] = time.split(":").map(Number)
  if (mins <= 15) return `${String(hours).padStart(2, "0")}:00`
  return `${String(hours).padStart(2, "0")}:30`
}

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
  department: string | null
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
  return day === 0 ? 6 : day - 1
}

function toOurDayOfWeek(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1
}

function fmtDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

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

export default function StudentBooking({ facultyWithRules }: Props) {
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(now.getFullYear())

  // Faculty selection
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<string[]>([])
  const [attendeeOptions, setAttendeeOptions] = useState<{ userId: string; isMandatory: boolean }[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [deptFilter, setDeptFilter] = useState<string>("all")

  // Date & slot selection
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<{ date: string; start: string; end: string }[]>([])
  const [manualTime, setManualTime] = useState<{ start: string; end: string } | null>(null)

  // Booking form
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: string[]; sessionGroupId?: string } | null>(null)

  // Conflict warnings
  const [conflicts, setConflicts] = useState<{ facultyName: string; message: string }[]>([])

  const selectedFaculty = useMemo(
    () => facultyWithRules.filter((f) => selectedFacultyIds.includes(f.id)),
    [facultyWithRules, selectedFacultyIds]
  )

  const getActiveRule = (faculty: FacultyWithRules, dateStr: string) => {
    const dayOfWeek = toOurDayOfWeek(new Date(dateStr + "T12:00:00").getDay())
    return faculty.rules.find(
      (r) =>
        r.dayOfWeek === dayOfWeek &&
        r.startDate <= dateStr &&
        (r.endDate === null || r.endDate >= dateStr)
    ) || null
  }

  // Available slots for selected date based on selected faculty
  const availableSlots = useMemo(() => {
    if (!selectedDay || selectedFaculty.length === 0) return []
    const dateStr = fmtDate(currentYear, currentMonth, selectedDay)
    const rules = selectedFaculty
      .map((f) => getActiveRule(f, dateStr))
      .filter((r): r is NonNullable<typeof r> => r !== null && !r.isBlocked && !!r.startTime && !!r.endTime)

    if (rules.length === 0) return []

    // Find overlap across all selected faculty
    let latestStart = rules[0].startTime!
    let earliestEnd = rules[0].endTime!
    for (const r of rules) {
      if (r.startTime! > latestStart) latestStart = r.startTime!
      if (r.endTime! < earliestEnd) earliestEnd = r.endTime!
    }
    if (latestStart >= earliestEnd) return []
    return generateSlots(latestStart, earliestEnd)
  }, [selectedDay, selectedFaculty, currentYear, currentMonth])

  // Check if a day has availability for ALL selected faculty
  const dayHasCommonSlots = (year: number, month: number, day: number): boolean => {
    if (selectedFaculty.length === 0) return false
    const dateStr = fmtDate(year, month, day)
    const rules = selectedFaculty
      .map((f) => getActiveRule(f, dateStr))
      .filter((r): r is NonNullable<typeof r> => r !== null && !r.isBlocked && !!r.startTime && !!r.endTime)

    if (rules.length < selectedFaculty.length) return false

    let latestStart = rules[0].startTime!
    let earliestEnd = rules[0].endTime!
    for (const r of rules) {
      if (r.startTime! > latestStart) latestStart = r.startTime!
      if (r.endTime! < earliestEnd) earliestEnd = r.endTime!
    }
    return latestStart < earliestEnd
  }

  // Check if a day has ANY availability (for non-check mode)
  const dayHasAnySlots = (year: number, month: number, day: number): boolean => {
    if (selectedFaculty.length === 0) return false
    const dateStr = fmtDate(year, month, day)
    return selectedFaculty.some((f) => {
      const rule = getActiveRule(f, dateStr)
      return rule && !rule.isBlocked && rule.startTime && rule.endTime
    })
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayOffset = getFirstDayOfMonth(currentYear, currentMonth)

  const calendarCells: (number | null)[] = []
  for (let i = 0; i < firstDayOffset; i++) calendarCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d)

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1) }
    else { setCurrentMonth((m) => m - 1) }
    setSelectedDay(null); setSelectedSlots([]); setManualTime(null); setResult(null); setConflicts([])
  }

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1) }
    else { setCurrentMonth((m) => m + 1) }
    setSelectedDay(null); setSelectedSlots([]); setManualTime(null); setResult(null); setConflicts([])
  }

  const toggleFaculty = (id: string) => {
    setSelectedFacultyIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id)
        setAttendeeOptions((opts) => opts.filter((o) => o.userId !== id))
        return next
      }
      return [...prev, id]
    })
    setSelectedDay(null); setSelectedSlots([]); setManualTime(null); setResult(null); setConflicts([])
  }

  const toggleMandatory = (userId: string) => {
    setAttendeeOptions((prev) =>
      prev.map((o) =>
        o.userId === userId ? { ...o, isMandatory: !o.isMandatory } : o
      )
    )
  }

  // When faculty selection changes, ensure attendeeOptions has entries for all selected
  const ensureAttendeeOptions = () => {
    setAttendeeOptions((prev) => {
      const existing = new Set(prev.map((o) => o.userId))
      const additions = selectedFacultyIds
        .filter((id) => !existing.has(id))
        .map((id) => ({ userId: id, isMandatory: true }))
      return [...prev, ...additions].filter((o) => selectedFacultyIds.includes(o.userId))
    })
  }

  const handleDayClick = (day: number) => {
    ensureAttendeeOptions()
    setSelectedDay(day)
    setResult(null)
    setConflicts([])
  }

  const handleAddSlot = (slot: { start: string; end: string }) => {
    if (!selectedDay) return
    const dateStr = fmtDate(currentYear, currentMonth, selectedDay)
    const newSlot = { date: dateStr, start: slot.start, end: slot.end }
    setSelectedSlots((prev) => {
      const exists = prev.some((s) => s.date === newSlot.date && s.start === newSlot.start && s.end === newSlot.end)
      if (exists) return prev
      return [...prev, newSlot]
    })
    setResult(null)
  }

  const handleRemoveSlot = (index: number) => {
    setSelectedSlots((prev) => prev.filter((_, i) => i !== index))
  }

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedSlots.length === 0 || selectedFaculty.length === 0) return

    setSubmitting(true)
    const facultyIds = selectedFaculty.map((f) => f.id)

    try {
      const res = await fetch("/api/appointments/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facultyIds,
          timeSlots: selectedSlots.map((s) => ({
            date: s.date,
            startTime: s.start,
            endTime: s.end,
          })),
          title: title.trim(),
          description: description.trim() || undefined,
          attendeeOptions: attendeeOptions.filter((o) => o.userId !== facultyIds[0]),
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setResult({
          success: data.results.length,
          errors: data.errors.map((err: any) => `${err.facultyId}: ${err.error}`),
          sessionGroupId: data.sessionGroupId,
        })
        setSelectedDay(null)
        setSelectedSlots([])
        setTitle("")
        setDescription("")
      } else {
        setResult({ success: 0, errors: [data.error || "Booking failed"] })
      }
    } catch {
      setResult({ success: 0, errors: ["Network error"] })
    } finally {
      setSubmitting(false)
    }
  }

  const allDepartments = useMemo(() => {
    const depts = new Set<string>()
    for (const f of facultyWithRules) {
      if (f.department) depts.add(f.department)
    }
    return Array.from(depts).sort()
  }, [facultyWithRules])

  const filteredFaculty = useMemo(() => {
    return facultyWithRules.filter((f) => {
      if (deptFilter !== "all" && f.department !== deptFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const nameParts = f.name.toLowerCase().split(/\s+/)
        return nameParts.some((p) => p.startsWith(q))
      }
      return true
    })
  }, [facultyWithRules, deptFilter, searchQuery])

  const groupedFaculty = useMemo(() => {
    const groups: { department: string | null; members: FacultyWithRules[] }[] = []
    for (const f of filteredFaculty) {
      let group = groups.find((g) => g.department === f.department)
      if (!group) {
        group = { department: f.department, members: [] }
        groups.push(group)
      }
      group.members.push(f)
    }
    return groups
  }, [filteredFaculty])

  return (
    <div className="space-y-6">
      {/* 1. Faculty Selection */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-700">1. Select Faculty Members</h3>

        {/* Search + Department Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              className="input text-xs pl-9 w-full"
            />
          </div>
          {allDepartments.length > 0 && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="input text-xs w-auto py-1.5 min-w-[160px]"
            >
              <option value="all">All Departments</option>
              {allDepartments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-4">
          {groupedFaculty.map((group) => (
            <div key={group.department || "no-dept"} className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {group.department || "No Department"}
              </p>
              {group.members.map((f) => {
                const isSelected = selectedFacultyIds.includes(f.id)
                const opt = attendeeOptions.find((o) => o.userId === f.id)
                return (
                  <div
                    key={f.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-gold-300 bg-gold-50/50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFaculty(f.id)}
                      className="w-4 h-4 rounded border-slate-300 text-gold-600 focus:ring-gold-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{f.name}</p>
                      <p className="text-xs text-slate-400">{f.email}</p>
                    </div>
                    {isSelected && opt && selectedFacultyIds.length > 1 && (
                      <button
                        onClick={() => toggleMandatory(f.id)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                          opt.isMandatory
                            ? "bg-gold-100 text-gold-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {opt.isMandatory ? "Required" : "Optional"}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
          {groupedFaculty.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">No faculty match your search or filter.</p>
          )}
        </div>
      </section>

      {/* 2. Date & Time */}
      {selectedFaculty.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-700">2. Pick a Date & Time</h3>
          <div className="flex gap-3 text-[10px] font-semibold">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Available for All</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Partially Available</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Conflicting Schedules</span>
          </div>

          {/* Calendar */}
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h4 className="text-base font-bold text-slate-800">{MONTH_NAMES[currentMonth]} {currentYear}</h4>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="card overflow-hidden bg-white">
            <div className="grid grid-cols-7 border-b border-slate-100">
              {DAY_NAMES.map((d) => (
                <div key={d} className="px-2 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarCells.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} className="p-2" />
                const isAllAvailable = dayHasCommonSlots(currentYear, currentMonth, day)
                const isPartiallyAvailable = dayHasAnySlots(currentYear, currentMonth, day)
                const isToday = day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear()
                const isSelected = selectedDay === day
                const isPast = currentYear < now.getFullYear() ||
                  (currentYear === now.getFullYear() && currentMonth < now.getMonth()) ||
                  (currentYear === now.getFullYear() && currentMonth === now.getMonth() && day < now.getDate())

                return (
                  <button
                    key={day}
                    onClick={() => { if (!isPast) handleDayClick(day) }}
                    disabled={isPast}
                    className={`p-2 min-h-[56px] border border-slate-50 relative transition-colors text-left
                      ${isSelected ? "bg-gold-50 border-gold-200 z-10" : ""}
                      ${!isPast ? "hover:bg-gold-50/50 cursor-pointer" : ""}
                      ${isPast ? "opacity-40" : ""}`}
                  >
                    <span className={`text-xs font-semibold ${isToday ? "bg-gold-600 text-white w-5 h-5 rounded-full flex items-center justify-center" : "text-slate-700"}`}>
                      {day}
                    </span>
                    {!isPast && (
                      <div className="mt-1">
                        {isAllAvailable ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">
                            Available for All
                          </span>
                        ) : isPartiallyAvailable ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700">
                            Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-700">
                            Conflicting
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Available Slots & Manual Time Entry */}
          {selectedDay && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-700">
                {fmtDate(currentYear, currentMonth, selectedDay)}
              </h4>

              {/* {availableSlots.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">Quick available blocks:</p>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {availableSlots.map((slot, i) => {
                      const isSelected = selectedSlots.some(
                        (s) => s.date === fmtDate(currentYear, currentMonth, selectedDay!) && s.start === slot.start && s.end === slot.end
                      )
                      return (
                        <button
                          key={i}
                          onClick={() => { handleAddSlot(slot); setManualTime(null) }}
                          className={`card p-3 bg-white border flex items-center justify-between transition-colors ${
                            isSelected
                              ? "border-gold-300 bg-gold-50/50"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {slot.start} – {slot.end}
                          </div>
                          {isSelected && (
                            <svg className="w-4 h-4 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )} */}

              <div className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                {availableSlots.length === 0 ? (
                  <div className="text-xs text-red-700">
                    <p className="font-semibold">No common availability</p>
                    <p className="opacity-75">Add a custom block and invited faculty will review it.</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">You can also add additional custom blocks for this day.</p>
                )}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={manualTime?.start || ""}
                      onChange={(e) => {
                        const rounded = roundTo30Minutes(e.target.value)
                        setManualTime((prev) => ({ start: rounded, end: prev?.end || "" }))
                      }}
                      className="input text-xs w-auto"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="time"
                      value={manualTime?.end || ""}
                      onChange={(e) => {
                        const rounded = roundTo30Minutes(e.target.value)
                        setManualTime((prev) => ({ start: prev?.start || "", end: rounded }))
                      }}
                      className="input text-xs w-auto"
                    />
                    <button
                      onClick={() => {
                        if (manualTime?.start && manualTime?.end && isValid30MinuteTime(manualTime.start) && isValid30MinuteTime(manualTime.end)) {
                          handleAddSlot({ start: manualTime.start, end: manualTime.end })
                          setManualTime(null)
                        }
                      }}
                      disabled={!manualTime?.start || !manualTime?.end || !isValid30MinuteTime(manualTime.start || "") || !isValid30MinuteTime(manualTime.end || "")}
                      className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50"
                    >
                      Add Block
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">Times must be in 30-minute intervals (HH:00 or HH:30). Min 30 min, max 8 hours per block.</p>
                </div>
              </div>

              {/* {selectedSlots.filter((s) => s.date === fmtDate(currentYear, currentMonth, selectedDay)).length > 0 && (
                <div className="p-3 rounded-lg bg-gold-50 border border-gold-200">
                  <p className="text-xs font-semibold text-gold-700 mb-2">Selected blocks for this day:</p>
                  <div className="space-y-1">
                    {selectedSlots
                      .filter((s) => s.date === fmtDate(currentYear, currentMonth, selectedDay))
                      .map((slot, idx) => (
                        <div key={`${slot.date}-${slot.start}-${slot.end}-${idx}`} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-gold-200">
                          <span className="text-slate-700 font-medium">{slot.start} – {slot.end}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(selectedSlots.indexOf(slot))}
                            className="text-red-600 hover:text-red-800 text-xs font-semibold"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )} */}
            </div>
          )}
        </section>
      )}

      {/* 3. Booking Form */}
      {selectedSlots.length > 0 && selectedFaculty.length > 0 && (
        <form onSubmit={handleBook} className="card p-5 bg-white space-y-4">
          <h3 className="text-sm font-bold text-slate-700">3. Confirm Booking</h3>

          <div className="p-3 rounded-lg bg-gold-50 border border-gold-100 text-sm space-y-3">
            <div>
              <p className="text-gold-700 font-semibold">Selected Time Slots</p>
              <ul className="mt-2 space-y-2">
                {selectedSlots.map((slot, index) => (
                  <li key={`${slot.date}-${slot.start}-${slot.end}-${index}`} className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm">
                    <span>{slot.date} · {slot.start} – {slot.end}</span>
                    <button type="button" onClick={() => handleRemoveSlot(index)} className="text-xs text-red-600 hover:text-red-700">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-gold-700 font-semibold">Participants</p>
              <p className="text-gold-600 text-xs mt-1">
                With {selectedFaculty.map((f) => `${f.name}${f.department ? ` (${f.department})` : ""}`).join(", ")}
              </p>
            </div>
          </div>

          {conflicts.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 space-y-1">
              <p className="font-semibold">Advisory: Schedule Conflicts</p>
              {conflicts.map((c, i) => (
                <p key={i}>{c.facultyName}: {c.message}</p>
              ))}
              <p className="opacity-75">You can still proceed with booking. Invited faculty will review and accept/decline.</p>
            </div>
          )}

          <div>
            <label className="input-label">Meeting Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="e.g. Thesis Consultation"
              required
            />
          </div>
          <div>
            <label className="input-label">Description / Agenda (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input min-h-[80px]"
              placeholder="Topics to discuss, questions..."
            />
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={submitting || !title.trim()} className="btn-primary text-sm font-semibold px-6 py-2.5 disabled:opacity-50">
              {submitting ? "Booking..." : `Book Consultation (${selectedFaculty.length} faculty)`}
            </button>
          </div>
        </form>
      )}

      {/* Result */}
      {result && (
        <div className={`p-3 rounded-lg text-xs font-medium border ${
          result.errors.length > 0
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-emerald-50 text-emerald-700 border-emerald-200"
        }`}>
          {result.success > 0 && <p>{result.success} appointment(s) created successfully.</p>}
          {result.sessionGroupId && <p className="text-[10px] opacity-75 mt-1">Session: {result.sessionGroupId}</p>}
          {result.errors.map((err, i) => <p key={i} className="text-red-600">{err}</p>)}
        </div>
      )}

      {selectedFaculty.length === 0 && (
        <div className="card p-12 text-center bg-white">
          <p className="text-slate-700 font-semibold text-sm">Select faculty members</p>
          <p className="text-slate-400 text-xs mt-1">Pick at least one faculty above to see available dates and times.</p>
        </div>
      )}
    </div>
  )
}
