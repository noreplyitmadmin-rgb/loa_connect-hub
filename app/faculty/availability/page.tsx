"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useRef } from "react"
import { redirect } from "next/navigation"
import { hasRole } from "@/lib/utils/roles"

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

interface Rule {
  id: string
  facultyId: string
  dayOfWeek: number
  isBlocked: boolean
  startTime: string | null
  endTime: string | null
  startDate: string
  endDate: string | null
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function AvailabilityPage() {
  const { data: session, status } = useSession()
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [startDate, setStartDate] = useState(todayStr())
  const [endDate, setEndDate] = useState("")

  // Determine active rules for the selected date range
  const activeRules = rules.filter((r) => {
    if (r.startDate > startDate) return false
    if (r.endDate && r.endDate < startDate) return false
    return true
  })

  const getRule = (day: number): Rule =>
    activeRules.find((r) => r.dayOfWeek === day) || {
      id: "",
      facultyId: "",
      dayOfWeek: day,
      isBlocked: day >= 5,
      startTime: day < 5 ? "08:00" : null,
      endTime: day < 5 ? "18:00" : null,
      startDate: startDate,
      endDate: endDate || null,
    }

  useEffect(() => {
    if (status === "unauthenticated") redirect("/login")
    if (status === "authenticated" && !hasRole((session?.user as any)?.role, "FACULTY") && !hasRole((session?.user as any)?.role, "DEAN")) redirect("/login")

    if (status === "authenticated") {
      fetch("/api/availability-rules")
        .then((res) => res.json())
        .then((data) => {
          setRules(data.rules || [])
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [status, session])

  const pendingRef = useRef(false)

  const toggleBlocked = async (day: number) => {
    if (pendingRef.current) return
    pendingRef.current = true
    const current = getRule(day)
    const newBlocked = !current.isBlocked
    setSaving(day)

    const res = await fetch("/api/availability-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayOfWeek: day,
        isBlocked: newBlocked,
        startTime: newBlocked ? null : current.startTime || "08:00",
        endTime: newBlocked ? null : current.endTime || "18:00",
        startDate,
        endDate: endDate || null,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      setRules((prev) => {
        const filtered = prev.filter(
          (r) => !(r.dayOfWeek === day && r.startDate === startDate)
        )
        return [...filtered, data.rule].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      })
    }
    setSaving(null)
    pendingRef.current = false
  }

  const updateTime = async (day: number, field: "startTime" | "endTime", value: string) => {
    const current = getRule(day)
    const updated = { ...current, [field]: value }
    setRules((prev) => {
      const filtered = prev.filter(
        (r) => !(r.dayOfWeek === day && r.startDate === startDate)
      )
      return [...filtered, updated as Rule].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    })

    const res = await fetch("/api/availability-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayOfWeek: day,
        isBlocked: updated.isBlocked,
        startTime: updated.startTime,
        endTime: updated.endTime,
        startDate,
        endDate: endDate || null,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      setRules((prev) => {
        const filtered = prev.filter(
          (r) => !(r.dayOfWeek === day && r.startDate === startDate)
        )
        return [...filtered, data.rule].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      })
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 flex items-center justify-center">
        <svg className="animate-spin w-6 h-6 text-gold-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-display">Availability Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure when students can book consultations with you. Weekend blocking is enabled by default.
        </p>
      </div>

      {/* Date Range Picker */}
      <div className="card p-5 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Effective From <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Effective Until <span className="text-slate-400">(optional)</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
              min={startDate || undefined}
            />
            {endDate && (
              <button
                onClick={() => setEndDate("")}
                className="text-[10px] text-gold-600 hover:text-gold-800 font-semibold mt-1"
              >
                Clear end date (no expiry)
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          Rules below apply from <strong>{startDate}</strong>
          {endDate ? <> until <strong>{endDate}</strong></> : <> with no end date</>}.
          After the end date, these rules are disabled and no bookings will be accepted.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {DAY_LABELS.map((label, dayIndex) => {
          const rule = getRule(dayIndex)
          const isSaving = saving === dayIndex

          return (
            <div
              key={dayIndex}
              className={`card p-5 bg-white transition-all ${rule.isBlocked ? "opacity-70" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-slate-800">{label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={!rule.isBlocked}
                    onChange={() => toggleBlocked(dayIndex)}
                    disabled={isSaving}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold-600" />
                </label>
              </div>

              {isSaving && (
                <div className="text-[10px] text-gold-600 font-semibold">Saving...</div>
              )}

              {!rule.isBlocked && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">From</label>
                    <input
                      type="time"
                      value={rule.startTime || "08:00"}
                      onChange={(e) => updateTime(dayIndex, "startTime", e.target.value)}
                      className="input text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">To</label>
                    <input
                      type="time"
                      value={rule.endTime || "18:00"}
                      onChange={(e) => updateTime(dayIndex, "endTime", e.target.value)}
                      className="input text-xs mt-1"
                    />
                  </div>
                </div>
              )}

              {rule.isBlocked && (
                <p className="text-[11px] text-slate-400 font-medium mt-2">Blocked — no bookings</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="card p-5 bg-slate-50 border-slate-200">
        <p className="text-xs text-slate-500 font-medium">
          <strong>Note:</strong> These rules only apply to students booking consultations. 
          Faculty-to-faculty meetings bypass these restrictions. Rules with an end date
          will automatically become inactive after that date.
        </p>
      </div>
    </div>
  )
}
