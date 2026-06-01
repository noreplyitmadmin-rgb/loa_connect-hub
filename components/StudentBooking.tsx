"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import TeamsLinkForm from "@/components/TeamsLinkForm"
import { useRouter } from "next/navigation"

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

const MINUTE_OPTIONS = [0, 15, 30, 45]

function timeToMinutes(h: number, m: number): number {
  return h * 60 + m
}

/** Validate that time is at a 15-minute boundary (HH:00, HH:15, HH:30, HH:45) */
function isValid15MinuteTime(time: string): boolean {
  if (!time) return false
  const [, mins] = time.split(":").map(Number)
  return MINUTE_OPTIONS.includes(mins)
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
  hasLoggedInBefore: boolean
  department: string | null
  rules: FacultyRule[]
}

interface SimpleUser {
  id: string
  name: string
  email: string
  department: string | null
}

interface Props {
  facultyWithRules: FacultyWithRules[]
  userRole: "STUDENT" | "FACULTY" | "DEAN"
  students?: SimpleUser[]
  serverNow?: string
  currentUserId?: string
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

export default function StudentBooking({ facultyWithRules, userRole, students, serverNow, currentUserId }: Props) {

  const now = useMemo(() => serverNow ? new Date(serverNow) : new Date(), [serverNow])
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const router = useRouter()


  // Faculty selection
  const [primaryFacultyId, setPrimaryFacultyId] = useState<string | null>(
    userRole !== "STUDENT" ? (currentUserId || null) : null
  )
  const [attendeeIds, setAttendeeIds] = useState<string[]>([])
  const [primarySearch, setPrimarySearch] = useState("")
  const [attendeeSearch, setAttendeeSearch] = useState("")
  const [showPrimaryDropdown, setShowPrimaryDropdown] = useState(false)
  const [showAttendeeDropdown, setShowAttendeeDropdown] = useState(false)
  const [primaryDeptFilter, setPrimaryDeptFilter] = useState<string>("all")
  const [attendeeDeptFilter, setAttendeeDeptFilter] = useState<string>("all")
  const [bookedAppointments, setBookedAppointments] = useState<{ date: string; startTime: string; endTime: string }[]>([])
  const [primaryUsers, setPrimaryUsers] = useState<SimpleUser[]>([])
  const [attendeeUsers, setAttendeeUsers] = useState<SimpleUser[]>([])
  const primaryRef = useRef<HTMLDivElement>(null)
  const attendeeRef = useRef<HTMLDivElement>(null)

  // Date & slot selection
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<{ date: string; start: string; end: string }[]>([])
  const [manualTime, setManualTime] = useState<{ start: string; end: string } | null>(null)

  // Booking form
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [allow24Hours, setAllow24Hours] = useState(false)

  const todayStr = useMemo(() => fmtDate(now.getFullYear(), now.getMonth(), now.getDate()), [now])
  const selectedDateStr = selectedDay ? fmtDate(currentYear, currentMonth, selectedDay) : null
  const isSelectedToday = selectedDateStr === todayStr

  // Fetch primary faculty's booked (APPROVED) appointments for the visible month
  useEffect(() => {
    if (!primaryFacultyId || userRole !== "STUDENT") {
      return
    }
    const startDate = fmtDate(currentYear, currentMonth, 1)
    const endDate = fmtDate(currentYear, currentMonth, getDaysInMonth(currentYear, currentMonth))
    let cancelled = false

    fetch(`/api/appointments/faculty-booked?facultyId=${primaryFacultyId}&startDate=${startDate}&endDate=${endDate}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.appointments) setBookedAppointments(data.appointments)
      })
      .catch(() => { if (!cancelled) setBookedAppointments([]) })

    return () => { cancelled = true }
  }, [primaryFacultyId, currentYear, currentMonth, userRole])

  // Fetch primary faculty users (filtered by department)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/users/primary?department=${primaryDeptFilter}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setPrimaryUsers(data.users || []) })
      .catch(() => { if (!cancelled) setPrimaryUsers([]) })
    return () => { cancelled = true }
  }, [primaryDeptFilter])

  // Fetch attendee users (filtered by department)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/users/attendees?department=${attendeeDeptFilter}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setAttendeeUsers(data.users || []) })
      .catch(() => { if (!cancelled) setAttendeeUsers([]) })
    return () => { cancelled = true }
  }, [attendeeDeptFilter])

  const hourOptions = useMemo(() => {
    const base = allow24Hours
      ? Array.from({ length: 24 }, (_, i) => i)
      : Array.from({ length: 16 }, (_, i) => i + 6)

    if (!isSelectedToday) return base

    // Hide current hour once it has started — only future hours are selectable
    const currentHour = now.getHours()
    return base.filter((h) => h > currentHour)
  }, [allow24Hours, isSelectedToday, now])

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: string[]; sessionGroupId?: string } | null>(null)
  const [showTeamsLinkForm, setShowTeamsLinkForm] = useState(false)
  const [teamsLinkMode, setTeamsLinkMode] = useState<"single" | "per-slot">("single")
  const [singleLink, setSingleLink] = useState("")
  const [slotLinks, setSlotLinks] = useState<Record<string, string>>({})
  const [teamsLinkError, setTeamsLinkError] = useState("")

  // Conflict warnings
  const [conflicts, setConflicts] = useState<{ userName: string; message: string; appointments?: { appointmentId: string; title: string | null; meetingType: string; date: string; startTime: string; endTime: string }[] }[]>([])

  const selectedFaculty = useMemo(
    () => facultyWithRules.filter((f) => f.id === primaryFacultyId),
    [facultyWithRules, primaryFacultyId]
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

  // Free time ranges for selected date — rule window minus booked (APPROVED) appointments
  const freeRanges = useMemo(() => {
    if (!selectedDay || selectedFaculty.length === 0) return []
    const dateStr = fmtDate(currentYear, currentMonth, selectedDay)
    const faculty = selectedFaculty[0]
    const rule = getActiveRule(faculty, dateStr)

    if (!rule || rule.isBlocked || !rule.startTime || !rule.endTime) return []

    // Start with the full rule window
    let ranges = [{ start: rule.startTime, end: rule.endTime }]

    // Subtract booked appointments
    const dayBookings = bookedAppointments.filter((a) => a.date === dateStr)
    for (const apt of dayBookings) {
      const newRanges: { start: string; end: string }[] = []
      for (const r of ranges) {
        if (apt.startTime < r.end && apt.endTime > r.start) {
          // Range before the booked slot
          if (apt.startTime > r.start) {
            newRanges.push({ start: r.start, end: apt.startTime })
          }
          // Range after the booked slot
          if (apt.endTime < r.end) {
            newRanges.push({ start: apt.endTime, end: r.end })
          }
        } else {
          newRanges.push(r)
        }
      }
      ranges = newRanges
    }

    return ranges.sort((a, b) => a.start.localeCompare(b.start))
  }, [selectedDay, selectedFaculty, currentYear, currentMonth, bookedAppointments])

  // For students: constrain hour options to only hours within free time ranges
  const studentHourOptions = useMemo(() => {
    if (userRole !== "STUDENT" || freeRanges.length === 0) return hourOptions
    const availableHours = new Set<number>()
    for (const range of freeRanges) {
      const startH = parseInt(range.start.split(":")[0])
      const endH = parseInt(range.end.split(":")[0])
      for (let h = startH; h <= endH; h++) {
        availableHours.add(h)
      }
    }
    // Also respect today's past-hour filter
    if (!isSelectedToday) return Array.from(availableHours).sort((a, b) => a - b)
    const currentHour = now.getHours()
    return Array.from(availableHours).filter((h) => h > currentHour).sort((a, b) => a - b)
  }, [hourOptions, freeRanges, userRole, isSelectedToday, now])

  // All available start hours (overlap is validated on add)
  const startHourOpts = studentHourOptions

  // All available start minutes (overlap is validated server-side on add)
  const getStartMinuteOpts = () => MINUTE_OPTIONS

  // Filtered end hours: must be >= start hour (for 30-min min duration)
  const getEndHourOpts = (start: string | null) => {
    if (!start || userRole !== "STUDENT") return studentHourOptions
    const [sH, sM] = start.split(":").map(Number)
    const minEndMinutes = sH * 60 + sM + 30
    const minEndH = Math.floor(minEndMinutes / 60)
    return studentHourOptions.filter(h => h >= minEndH)
  }

  // Filtered end minutes: when same hour as min end hour, only allow minutes >= min end minute
  const getEndMinuteOpts = (start: string | null, selEndHour: number) => {
    if (!start || userRole !== "STUDENT") return MINUTE_OPTIONS
    const [sH, sM] = start.split(":").map(Number)
    const minEndMinutes = sH * 60 + sM + 30
    const minEndH = Math.floor(minEndMinutes / 60)
    const minEndM = minEndMinutes % 60
    if (selEndHour !== minEndH) return MINUTE_OPTIONS
    return MINUTE_OPTIONS.filter(m => m >= minEndM)
  }

  // Determine day status for student booking (primary faculty only)
  const getDayStatus = (year: number, month: number, day: number): "available" | "partially" | "not-available" | "blocked" => {
    if (selectedFaculty.length === 0) return "not-available"
    const dateStr = fmtDate(year, month, day)
    const faculty = selectedFaculty[0]
    const rule = getActiveRule(faculty, dateStr)

    if (!rule) return "not-available"
    if (rule.isBlocked) return "blocked"
    if (!rule.startTime || !rule.endTime) return "blocked"

    // Get ACCEPTED appointments for this day
    const dayBookings = bookedAppointments.filter((a) => a.date === dateStr)
    if (dayBookings.length === 0) return "available"

    // Calculate total available time from rule
    const ruleStart = timeToMinutes(parseInt(rule.startTime.split(":")[0]), parseInt(rule.startTime.split(":")[1]))
    const ruleEnd = timeToMinutes(parseInt(rule.endTime.split(":")[0]), parseInt(rule.endTime.split(":")[1]))
    const totalAvailableMinutes = ruleEnd - ruleStart

    // Calculate overlapping booked minutes
    let bookedMinutes = 0
    for (const apt of dayBookings) {
      const aptStart = timeToMinutes(parseInt(apt.startTime.split(":")[0]), parseInt(apt.startTime.split(":")[1]))
      const aptEnd = timeToMinutes(parseInt(apt.endTime.split(":")[0]), parseInt(apt.endTime.split(":")[1]))
      const overlapStart = Math.max(aptStart, ruleStart)
      const overlapEnd = Math.min(aptEnd, ruleEnd)
      if (overlapStart < overlapEnd) {
        bookedMinutes += overlapEnd - overlapStart
      }
    }

    if (bookedMinutes === 0) return "available"
    if (bookedMinutes >= totalAvailableMinutes) return "not-available"
    return "partially"
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

  const selectPrimary = (id: string) => {
    setPrimaryFacultyId(id)
    setAttendeeIds((prev) => prev.filter((x) => x !== id))
    setConflicts([]); setSelectedDay(null); setSelectedSlots([]); setManualTime(null); setResult(null)
  }

  const toggleAttendee = (id: string) => {
    setAttendeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleDayClick = (day: number) => {
    setSelectedDay(day)
    setSelectedSlots([]); setManualTime(null); setResult(null); setConflicts([])
  }

  const handleAddSlot = (slot: { start: string; end: string }) => {
    if (!selectedDay) return
    const dateStr = fmtDate(currentYear, currentMonth, selectedDay)
    const newSlot = { date: dateStr, start: slot.start, end: slot.end }
    setSelectedSlots((prev) => {
      const exists = prev.some((s) => s.date === newSlot.date && s.start === newSlot.start && s.end === newSlot.end)
      if (exists) return prev
      // Also reject overlap with existing slots on same day
      const overlaps = prev.some((s) => {
        if (s.date !== dateStr) return false
        return slot.start < s.end && slot.end > s.start
      })
      if (overlaps) return prev
      return [...prev, newSlot]
    })
    setResult(null)
  }

  const handleRemoveSlot = (index: number) => {
    setSelectedSlots((prev) => prev.filter((_, i) => i !== index))
  }

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedSlots.length === 0 || !primaryFacultyId) return

    setSubmitting(true)

    try {
      // Build payload
      const payload: Record<string, unknown> = {
        facultyIds: [primaryFacultyId],
        timeSlots: selectedSlots.map((s) => ({ date: s.date, startTime: s.start, endTime: s.end })),
        title: title.trim(),
        description: description.trim() || undefined,
        attendeeOptions: attendeeIds.map((id) => ({ userId: id, isMandatory: true })),
        meetingType: userRole === "STUDENT" ? "CONSULTATION" : "INTERNAL",
      }

      // If creator is faculty/dean and teams form is shown, validate and attach links
      if ((userRole === "FACULTY" || userRole === "DEAN") && showTeamsLinkForm) {
        setTeamsLinkError("")
        if (teamsLinkMode === "single") {
          if (!singleLink.trim()) {
            setTeamsLinkError("Please provide a Teams meeting link")
            setSubmitting(false)
            return
          }
          payload.teamsLink = singleLink.trim()
        } else {
          // per-slot: ensure each selected slot has a link
          const missing = selectedSlots.find((s) => !slotLinks[`${s.date}-${s.start}-${s.end}`]?.trim())
          if (missing) {
            setTeamsLinkError("Please provide a Teams link for each time slot")
            setSubmitting(false)
            return
          }
          const slotLinksMap: Record<string, string> = {}
          for (const s of selectedSlots) {
            slotLinksMap[`${s.date}-${s.start}-${s.end}`] = slotLinks[`${s.date}-${s.start}-${s.end}`].trim()
          }
          payload.slotLinks = slotLinksMap
        }
      }

      const req = JSON.stringify(payload)

      console.log("Booking request payload:", payload);

      const res = await fetch("/api/appointments/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: req })

      const data = await res.json()
      if (res.ok) {
        setConflicts(data.conflicts || [])
        setResult({
          success: 1,
          errors: [],
          sessionGroupId: data.sessionGroupId,
        })
        setPrimaryFacultyId(null)
        setAttendeeIds([])
        setSelectedDay(null)
        setSelectedSlots([])
        setTitle("")
        setDescription("")
      } else {
        setConflicts(data.conflicts || [])
        setResult({ success: 0, errors: [data.error || "Booking failed"] })
      }
    } catch (err: unknown) {
      console.error("DEBUG: Frontend Caught Error:", err);
      const errObj = err as Record<string, unknown>
      setResult({
        success: 0,
        errors: [(errObj.message as string) || "An unexpected error occurred. Check server logs."]
      });
    } finally {
      //TODO: Remove if error 
      if (userRole === "STUDENT") {
        router.push("/student/meetings")
      } else {
        router.push("/faculty/meetings")
      }
    }
  }

  // Departments for filter
  const allDepartments = useMemo(() => {
    const depts = new Set<string>()
    for (const f of facultyWithRules) {
      if (f.department) depts.add(f.department)
    }
    return Array.from(depts).sort()
  }, [facultyWithRules])

  // Search results — API handles role/department filtering, client handles text search
  const primarySearchResults = useMemo(() => {
    if (!primarySearch.trim()) return []
    const q = primarySearch.toLowerCase()
    const exclude = primaryFacultyId ? [primaryFacultyId] : []
    return primaryUsers.filter(
      (u) =>
        !exclude.includes(u.id) &&
        (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    )
  }, [primarySearch, primaryFacultyId, primaryUsers])

  const attendeeSearchResults = useMemo(() => {
    if (!attendeeSearch.trim()) return []
    const q = attendeeSearch.toLowerCase()
    const exclude = [primaryFacultyId, ...attendeeIds].filter(Boolean) as string[]
    return attendeeUsers.filter(
      (u) =>
        !exclude.includes(u.id) &&
        (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    )
  }, [attendeeSearch, attendeeIds, primaryFacultyId, attendeeUsers])

  const teamsLinkSlots = useMemo(
    () => selectedSlots.map((slot) => ({
      key: `${slot.date}-${slot.start}-${slot.end}`,
      date: slot.date,
      startTime: slot.start,
      endTime: slot.end,
    })),
    [selectedSlots]
  )

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (primaryRef.current && !primaryRef.current.contains(e.target as Node)) setShowPrimaryDropdown(false)
      if (attendeeRef.current && !attendeeRef.current.contains(e.target as Node)) setShowAttendeeDropdown(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div className="space-y-6">
      {/* 1a. Select Primary Faculty (Required) — hidden for Faculty/Dean, they ARE the primary */}
      {userRole === "STUDENT" ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">
              1. Select Faculty
              <span className="text-red-500 ml-1">*</span>
            </h3>
            {primaryFacultyId && (
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Required
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div ref={primaryRef} className="relative flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={primarySearch}
                  onChange={(e) => { setPrimarySearch(e.target.value); setShowPrimaryDropdown(true) }}
                  onFocus={() => { if (primarySearch.trim()) setShowPrimaryDropdown(true) }}
                  placeholder="Search by name or email..."
                  className="input text-xs pl-9 w-full"
                />
              </div>
              {showPrimaryDropdown && primarySearchResults.length > 0 && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {primarySearchResults.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => { selectPrimary(f.id); setPrimarySearch(""); setShowPrimaryDropdown(false) }}
                      className="w-full text-left px-3 py-2.5 hover:bg-gold-50 border-b border-slate-50 last:border-b-0 transition-colors"
                    >
                      <p className="text-sm font-medium text-slate-800">{f.name}</p>
                      <p className="text-xs text-slate-400">{f.email}</p>
                    </button>
                  ))}
                </div>
              )}
              {showPrimaryDropdown && primarySearch.trim() && primarySearchResults.length === 0 && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                  <p className="text-xs text-slate-400">No faculty match your search.</p>
                </div>
              )}
            </div>
            {allDepartments.length > 0 && (
              <select
                value={primaryDeptFilter}
                onChange={(e) => setPrimaryDeptFilter(e.target.value)}
                className="input text-xs py-1.5 min-w-0 sm:min-w-[140px] w-full sm:w-auto"
              >
                <option value="all">All Departments</option>
                {allDepartments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
          </div>

          {/* Selected primary chip */}
          {primaryFacultyId && (() => {
            const f = facultyWithRules.find((x) => x.id === primaryFacultyId)
            if (!f) return null
            return (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gold-50 border border-gold-200">
                <div className="w-8 h-8 rounded-full bg-gold-200 flex items-center justify-center text-xs font-bold text-gold-700">
                  {f.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{f.name}</p>
                  <p className="text-xs text-slate-400">{f.email}</p>
                </div>
                <span className="text-[10px] font-semibold text-gold-700 bg-gold-100 px-2 py-0.5 rounded-full border border-gold-200">
                  Primary
                </span>
                <button
                  type="button"
                  onClick={() => { setPrimaryFacultyId(null); setAttendeeIds([]) }}
                  className="text-xs text-red-500 hover:text-red-700 font-bold ml-1"
                >
                  &times;
                </button>
              </div>
            )
          })()}
        </section>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">
              1. Primary Faculty
              <span className="text-red-500 ml-1">*</span>
            </h3>
          </div>
          {primaryFacultyId && (() => {
            const f = facultyWithRules.find((x) => x.id === primaryFacultyId)
            if (!f) return null
            return (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gold-50 border border-gold-200">
                <div className="w-8 h-8 rounded-full bg-gold-200 flex items-center justify-center text-xs font-bold text-gold-700">
                  {f.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{f.name} <span className="text-xs text-slate-400 font-normal">(You)</span></p>
                  <p className="text-xs text-slate-400">{f.email}</p>
                </div>
                <span className="text-[10px] font-semibold text-gold-700 bg-gold-100 px-2 py-0.5 rounded-full border border-gold-200">
                  Primary
                </span>
              </div>
            )
          })()}
        </section>
      )}

      {/* 1b. Select Attendees (Optional) — shown only after primary is selected */}
      {primaryFacultyId && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">2. Select Attendees <span className="text-slate-400 font-normal text-xs">(Optional)</span></h3>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div ref={attendeeRef} className="relative flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={attendeeSearch}
                  onChange={(e) => { setAttendeeSearch(e.target.value); setShowAttendeeDropdown(true) }}
                  onFocus={() => { if (attendeeSearch.trim()) setShowAttendeeDropdown(true) }}
                  placeholder="Search by name or email..."
                  className="input text-xs pl-9 w-full"
                />
              </div>
              {showAttendeeDropdown && attendeeSearchResults.length > 0 && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {attendeeSearchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { toggleAttendee(p.id); setAttendeeSearch(""); setShowAttendeeDropdown(false) }}
                      className="w-full text-left px-3 py-2.5 hover:bg-gold-50 border-b border-slate-50 last:border-b-0 transition-colors"
                    >
                      <p className="text-sm font-medium text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.email}</p>
                    </button>
                  ))}
                </div>
              )}
              {showAttendeeDropdown && attendeeSearch.trim() && attendeeSearchResults.length === 0 && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                  <p className="text-xs text-slate-400">No users match your search.</p>
                </div>
              )}
            </div>
            {allDepartments.length > 0 && (
              <select
                value={attendeeDeptFilter}
                onChange={(e) => setAttendeeDeptFilter(e.target.value)}
                className="input text-xs py-1.5 min-w-0 sm:min-w-[140px] w-full sm:w-auto"
              >
                <option value="all">All Departments</option>
                {allDepartments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}

          </div>

          {/* Selected attendee chips */}
          {attendeeIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attendeeIds.map((id) => {
                const f = facultyWithRules.find((x) => x.id === id)
                const s = students?.find((x) => x.id === id)
                const person = f || s
                if (!person) return null
                return (
                  <div key={id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700">
                    <span className="font-medium truncate max-w-[120px]">{person.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleAttendee(id)}
                      className="text-red-500 hover:text-red-700 font-bold leading-none ml-0.5"
                    >
                      &times;
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {attendeeIds.length === 0 && userRole === "STUDENT" && (
            <p className="text-xs text-slate-400 italic">No additional attendees selected. Only the primary faculty will be invited.</p>
          )}
          {attendeeIds.length === 0 && userRole !== "STUDENT" && (
            <p className="text-xs text-amber-600 font-semibold italic">At least one attendee is required before selecting a date and time.</p>
          )}
        </section>
      )}

      {/* 3. Date & Time — requires at least one attendee for Faculty/Dean */}
      {primaryFacultyId && (userRole === "STUDENT" || attendeeIds.length > 0) && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-700">3. Pick a Date & Time</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> Available</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" /> Partial</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 shrink-0" /> Unavail.</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" /> Blocked</span>
          </div>

          {/* Calendar */}
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="p-3 sm:p-2 rounded-lg hover:bg-slate-100 text-slate-500 min-h-[44px] min-w-[44px] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h4 className="text-base font-bold text-slate-800">{MONTH_NAMES[currentMonth]} {currentYear}</h4>
            <button onClick={nextMonth} className="p-3 sm:p-2 rounded-lg hover:bg-slate-100 text-slate-500 min-h-[44px] min-w-[44px] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="card overflow-hidden bg-white">
            <div className="grid grid-cols-7 border-b border-slate-100">
              {DAY_NAMES.map((d) => (
                <div key={d} className="px-1 sm:px-2 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarCells.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} className="p-2" />
                const dayStatus = getDayStatus(currentYear, currentMonth, day)
                const isToday = day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear()
                const isSelected = selectedDay === day
                const isPast = currentYear < now.getFullYear() ||
                  (currentYear === now.getFullYear() && currentMonth < now.getMonth()) ||
                  (currentYear === now.getFullYear() && currentMonth === now.getMonth() && day < now.getDate())

                const dotColor = dayStatus === "available" ? "bg-emerald-500" :
                  dayStatus === "partially" ? "bg-blue-400" :
                  dayStatus === "not-available" ? "bg-red-400" :
                  "bg-slate-400"

                return (
                  <button
                    key={day}
                    onClick={() => { if (!isPast) handleDayClick(day) }}
                    disabled={isPast}
                    className={`p-1 sm:p-2 min-h-[40px] sm:min-h-[56px] border border-slate-50 relative transition-colors flex flex-col items-center justify-start
                      ${isSelected ? "bg-gold-50 border-gold-200 z-10" : ""}
                      ${!isPast ? "hover:bg-gold-50/50 cursor-pointer" : ""}
                      ${isPast ? "opacity-40" : ""}`}
                  >
                    <span className={`text-xs font-semibold ${isToday ? "bg-gold-600 text-white w-6 h-6 rounded-full flex items-center justify-center" : "text-slate-700"}`}>
                      {day}
                    </span>
                    {!isPast && (
                      <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
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

              {/* Hourly suggestions — click to pre-fill time selectors, then adjust */}
              {userRole === "STUDENT" && freeRanges.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">Available blocks — click to use, then edit the time:</p>
                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {freeRanges.flatMap((range) => {
                      const suggestions: { start: string; end: string }[] = []
                      const startH = parseInt(range.start.split(":")[0])
                      const endH = parseInt(range.end.split(":")[0])
                      for (let h = startH; h < endH; h++) {
                        suggestions.push({
                          start: `${String(h).padStart(2, "0")}:00`,
                          end: `${String(h + 1).padStart(2, "0")}:00`,
                        })
                      }
                      return suggestions
                    }).map((slot, i) => {
                      const isSelected = manualTime?.start === slot.start && manualTime?.end === slot.end
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setManualTime({ start: slot.start, end: slot.end })}
                          className={`card p-3 bg-white border flex items-center justify-between transition-colors ${isSelected
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
              )}

              <div className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                {freeRanges.length === 0 ? (
                  <div className="text-xs text-red-700">
                    <p className="font-semibold">No common availability</p>
                    <p className="opacity-75">Add a custom block and invited faculty will review it.</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">You can also add additional custom blocks for this day.</p>
                )}
                <div className="flex flex-col gap-2">
                  {userRole !== "STUDENT" && (
                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allow24Hours}
                        onChange={(e) => setAllow24Hours(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-gold-600 focus:ring-gold-500"
                      />
                      Allow 24-hour range (00:00 – 23:00)
                    </label>
                  )}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] font-semibold text-slate-400 sm:hidden w-8">Start</label>
                      <select
                        value={manualTime?.start ? manualTime.start.split(":")[0] : ""}
                        onChange={(e) => {
                          const h = e.target.value
                          const m = manualTime?.start?.split(":")[1] || "00"
                          setManualTime({ start: `${h}:${m}`, end: "" })
                        }}
                        className="input text-xs py-2 flex-1 sm:w-auto min-w-0"
                      >
                        <option value="" disabled>HH</option>
                        {startHourOpts.map((h) => (
                          <option key={h} value={String(h).padStart(2, "0")}>{String(h).padStart(2, "0")}</option>
                        ))}
                      </select>
                      <span className="text-slate-400 font-bold shrink-0">:</span>
                      <select
                        value={manualTime?.start?.split(":")[1] || ""}
                        onChange={(e) => {
                          const m = e.target.value
                          const h = manualTime?.start?.split(":")[0] || "00"
                          setManualTime({ start: `${h}:${m}`, end: "" })
                        }}
                        className="input text-xs py-2 flex-1 sm:w-auto min-w-0"
                      >
                        <option value="" disabled>MM</option>
                        {getStartMinuteOpts().map((m) => (
                          <option key={m} value={String(m).padStart(2, "0")}>{String(m).padStart(2, "0")}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-center sm:px-2">
                      <span className="text-xs font-semibold text-slate-400">to</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <label className="text-[10px] font-semibold text-slate-400 sm:hidden w-8">End</label>
                      <select
                        value={manualTime?.end ? manualTime.end.split(":")[0] : ""}
                        onChange={(e) => {
                          const h = e.target.value
                          const m = manualTime?.end?.split(":")[1] || "00"
                          setManualTime((prev) => ({ start: prev?.start || "", end: `${h}:${m}` }))
                        }}
                        className="input text-xs py-2 flex-1 sm:w-auto min-w-0"
                      >
                        <option value="" disabled>HH</option>
                        {getEndHourOpts(manualTime?.start || null).map((h) => (
                          <option key={h} value={String(h).padStart(2, "0")}>{String(h).padStart(2, "0")}</option>
                        ))}
                      </select>
                      <span className="text-slate-400 font-bold shrink-0">:</span>
                      <select
                        value={manualTime?.end?.split(":")[1] || ""}
                        onChange={(e) => {
                          const m = e.target.value
                          const h = manualTime?.end?.split(":")[0] || "00"
                          setManualTime((prev) => ({ start: prev?.start || "", end: `${h}:${m}` }))
                        }}
                        className="input text-xs py-2 flex-1 sm:w-auto min-w-0"
                      >
                        <option value="" disabled>MM</option>
                        {getEndMinuteOpts(manualTime?.start || null, parseInt(manualTime?.end?.split(":")[0] || "0")).map((m) => (
                          <option key={m} value={String(m).padStart(2, "0")}>{String(m).padStart(2, "0")}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        if (manualTime?.start && manualTime?.end && isValid15MinuteTime(manualTime.start) && isValid15MinuteTime(manualTime.end)) {
                          handleAddSlot({ start: manualTime.start, end: manualTime.end })
                          setManualTime(null)
                        }
                      }}
                      disabled={!manualTime?.start || !manualTime?.end}
                      className="btn-primary text-xs py-3 sm:py-1.5 px-4 disabled:opacity-50 shrink-0"
                    >
                      Add Block
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">Min 30 min, max 8 hrs per block. 15-min intervals.</p>
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

      {/* 4. Booking Form */}
      {selectedSlots.length > 0 && primaryFacultyId && (
        <form onSubmit={handleBook} className="card p-5 bg-white space-y-4">
          <h3 className="text-sm font-bold text-slate-700">4. Confirm Booking</h3>

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
                {(() => {
                  const primary = facultyWithRules.find((f) => f.id === primaryFacultyId)
                  const attendees = facultyWithRules.filter((f) => attendeeIds.includes(f.id))
                  const studentAttendees = (students || []).filter((s) => attendeeIds.includes(s.id))
                  const parts: string[] = []
                  if (primary) parts.push(`${primary.name} (Primary)`)
                  attendees.forEach((a) => parts.push(`${a.name}${a.department ? ` (${a.department})` : ""}`))
                  studentAttendees.forEach((s) => parts.push(`${s.name} (Student)`))
                  return parts.length > 0 ? parts.join(", ") : "No participants"
                })()}
              </p>
            </div>
          </div>

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
            <label className="input-label">Concern / Agenda (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input min-h-[80px]"
              placeholder="Topics to discuss, questions..."
            />
          </div>

          {/* Teams link form for Faculty/Dean — shown after initial click */}
          {(userRole === "FACULTY" || userRole === "DEAN") && showTeamsLinkForm && (
            <TeamsLinkForm
              teamsLinkMode={teamsLinkMode}
              onModeChange={setTeamsLinkMode}
              singleLink={singleLink}
              onSingleLinkChange={setSingleLink}
              slotLinks={slotLinks}
              onSlotLinkChange={(key, value) => setSlotLinks((prev) => ({ ...prev, [key]: value }))}
              timeSlots={teamsLinkSlots}
              error={teamsLinkError}
            />
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {userRole === "STUDENT" ? (
              <button type="submit" disabled={submitting || !title.trim()} className="btn-primary text-sm font-semibold px-6 py-3 sm:py-2.5 disabled:opacity-50 w-full sm:w-auto">
                {submitting ? "Booking..." : "Book Consultation"}
              </button>
            ) : (
              <button type="button" onClick={() => {
                if (!showTeamsLinkForm) {
                  setShowTeamsLinkForm(true)
                  return
                }
                // If form already shown, submit normally
                const submitEvent = { preventDefault: () => { } } as unknown as React.FormEvent
                handleBook(submitEvent)
              }} disabled={submitting || !title.trim()} className="btn-primary text-sm font-semibold px-6 py-3 sm:py-2.5 disabled:opacity-50 w-full sm:w-auto">
                {submitting ? "Booking..." : "Create Meeting"}
              </button>
            )}
          </div>
        </form>
      )}

      {/* Conflicts (outside form so it persists) */}
      {conflicts.length > 0 && (
        <div className={`p-3 rounded-lg text-xs space-y-1 border ${result?.success ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          <p className="font-semibold">Schedule Conflicts Detected</p>
          {conflicts.map((c, i) => (
            <div key={i} className="space-y-0.5">
              <p className="font-semibold">{c.userName}: {c.message}</p>
              {c.appointments && c.appointments.map((a, j) => (
                <a
                  key={j}
                  href={`/${userRole === "STUDENT" ? "student" : "faculty"}/meetings/${a.appointmentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline hover:opacity-80 ml-2"
                >
                  {a.meetingType === "CONSULTATION" ? "Consultation" : "Meeting"}{a.title ? `: ${a.title}` : ""} &mdash; {a.date} {a.startTime}&ndash;{a.endTime}
                </a>
              ))}
            </div>
          ))}
          {result?.success ? (
            <p className="opacity-75 pt-1">You can still proceed with booking. Invited faculty will review and accept/decline.</p>
          ) : (
            <p className="opacity-75 pt-1">Please resolve the conflicts before booking.</p>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`p-3 rounded-lg text-xs font-medium border ${result.errors.length > 0
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
          {result.success > 0 && <p>{result.success} appointment(s) created successfully.</p>}
          {result.sessionGroupId && <p className="text-[10px] opacity-75 mt-1">Session: {result.sessionGroupId}</p>}
          {result.errors.map((err, i) => <p key={i} className="text-red-600">{err}</p>)}
        </div>
      )}

      {!primaryFacultyId && (
        <div className="card p-12 text-center bg-white">
          <p className="text-slate-700 font-semibold text-sm">Select a primary faculty member</p>
          <p className="text-slate-400 text-xs mt-1">Pick a faculty member above to see available dates and times.</p>
        </div>
      )}
    </div>
  )
}
