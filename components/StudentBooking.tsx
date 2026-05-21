"use client"

import { useState, useMemo } from "react"

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
  const [sh] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  let h = sh
  while (h + 1 < eh || (h + 1 === eh && em > 0)) {
    const s = `${String(h).padStart(2, "0")}:00`
    h++
    const e = h < eh ? `${String(h).padStart(2, "0")}:00` : endTime
    slots.push({ start: s, end: e })
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
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null)
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
    setSelectedDay(null); setSelectedSlot(null); setManualTime(null); setResult(null); setConflicts([])
  }

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1) }
    else { setCurrentMonth((m) => m + 1) }
    setSelectedDay(null); setSelectedSlot(null); setManualTime(null); setResult(null); setConflicts([])
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
    setSelectedDay(null); setSelectedSlot(null); setManualTime(null); setResult(null); setConflicts([])
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
    setSelectedSlot(null)
    setResult(null)
    setConflicts([])
  }

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot || selectedFaculty.length === 0 || !selectedDay) return

    setSubmitting(true)
    const dateStr = fmtDate(currentYear, currentMonth, selectedDay)
    const facultyIds = selectedFaculty.map((f) => f.id)

    try {
      const res = await fetch("/api/appointments/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facultyIds,
          date: dateStr,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
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
        setSelectedSlot(null)
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
                        ? "border-indigo-300 bg-indigo-50/50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFaculty(f.id)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
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
                            ? "bg-indigo-100 text-indigo-700"
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
                      ${isSelected ? "bg-indigo-50 border-indigo-200 z-10" : ""}
                      ${!isPast ? "hover:bg-indigo-50/50 cursor-pointer" : ""}
                      ${isPast ? "opacity-40" : ""}`}
                  >
                    <span className={`text-xs font-semibold ${isToday ? "bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center" : "text-slate-700"}`}>
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

          {/* Available Slots or Manual Time */}
          {selectedDay && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-700">
                {fmtDate(currentYear, currentMonth, selectedDay)}
              </h4>
              {availableSlots.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {availableSlots.map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedSlot(slot); setManualTime(null) }}
                      className={`card p-3 bg-white border flex items-center justify-between transition-colors ${
                        selectedSlot?.start === slot.start
                          ? "border-indigo-300 bg-indigo-50/50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {slot.start} – {slot.end}
                      </div>
                      {selectedSlot?.start === slot.start && (
                        <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    <p className="font-semibold">Conflicting Schedules</p>
                    <p className="opacity-75 mt-0.5">No common availability for all selected faculty on this date. You can still book by entering a custom time — invited faculty will review and accept/decline.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={manualTime?.start || ""}
                      onChange={(e) => setManualTime((prev) => ({ start: e.target.value, end: prev?.end || "" }))}
                      className="input text-xs w-auto"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="time"
                      value={manualTime?.end || ""}
                      onChange={(e) => setManualTime((prev) => ({ start: prev?.start || "", end: e.target.value }))}
                      className="input text-xs w-auto"
                    />
                    <button
                      onClick={() => {
                        if (manualTime?.start && manualTime?.end) {
                          setSelectedSlot({ start: manualTime.start, end: manualTime.end })
                        }
                      }}
                      disabled={!manualTime?.start || !manualTime?.end}
                      className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50"
                    >
                      Use This Time
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 3. Booking Form */}
      {selectedSlot && selectedFaculty.length > 0 && (
        <form onSubmit={handleBook} className="card p-5 bg-white space-y-4">
          <h3 className="text-sm font-bold text-slate-700">3. Confirm Booking</h3>

          <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 text-sm space-y-1">
            <p className="text-indigo-700 font-semibold">
              {fmtDate(currentYear, currentMonth, selectedDay!)} &middot; {selectedSlot.start} – {selectedSlot.end}
            </p>
            <p className="text-indigo-600 text-xs">
              With {selectedFaculty.map((f) => `${f.name}${f.department ? ` (${f.department})` : ""}`).join(", ")}
            </p>
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
