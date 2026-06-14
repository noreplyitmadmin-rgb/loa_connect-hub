"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useRef } from "react"
import { redirect } from "next/navigation"
import { useApiGet } from "@/lib/api/client"
import { hasRole } from "@/lib/utils/roles"
import LockedTab from "@/components/ui/LockedTab"
import ErrorState from "@/components/ui/ErrorState"
import ErrorBoundary from "@/components/ui/ErrorBoundary"

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
  const { data: session, status } = useSession() ?? {};
  const [rules, setRules] = useState<Rule[]>([])
  const [isSavingAll, setIsSavingAll] = useState(false)
  const [startDate, setStartDate] = useState(todayStr())
  const [endDate, setEndDate] = useState("")
  const [pendingChanges, setPendingChanges] = useState<Map<number, Rule>>(new Map())
  const [lockedEndpoint, setLockedEndpoint] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const { data: rulesData, isLoading, error: rulesError } = useApiGet<{ rules: Rule[] }>(
    status === "authenticated" ? "/api/availability-rules" : null
  )

  useEffect(() => {
    Promise.resolve().then(() => {
      if (rulesData?.rules) setRules(rulesData.rules)
      if (rulesError) {
        if (rulesError.message?.includes("403") || rulesError.message?.includes("Forbidden")) {
          setLockedEndpoint("/api/availability-rules")
        } else {
          setErrorMessage(rulesError.message || "Failed to load availability rules")
        }
      }
    })
  }, [rulesData, rulesError])

  useEffect(() => {
    if (status === "unauthenticated") redirect("/login")
    if (status === "authenticated" && !hasRole((session?.user as Record<string, unknown>)?.role as string, "FACULTY") && !hasRole((session?.user as Record<string, unknown>)?.role as string, "DEAN")) redirect("/login")
  }, [status, session])

  const loading = isLoading

  const activeRules = rules.filter((r) => {
    if (r.startDate > startDate) return false
    if (r.endDate && r.endDate < startDate) return false
    return true
  })

  const getRule = (day: number): Rule | null => {
    const matches = activeRules.filter(
      (r) => r.dayOfWeek === day
    )

    if (matches.length > 0) {
      return matches.sort(
        (a, b) => b.startDate.localeCompare(a.startDate)
      )[0]
    }

    return null;
  }

  const pendingRef = useRef(false)

  const toggleBlocked = async (day: number) => {
    if (pendingRef.current) return
    pendingRef.current = true

    const current = getRule(day)

    const base: Rule =
      current ?? {
        id: "",
        facultyId: "",
        dayOfWeek: day,
        isBlocked: true,
        startTime: null,
        endTime: null,
        startDate,
        endDate: endDate || null,
      }

    const newBlocked = !base.isBlocked

    const updated: Rule = {
      ...base,
      isBlocked: newBlocked,
      startTime: newBlocked ? null : base.startTime || "08:00",
      endTime: newBlocked ? null : base.endTime || "18:00",
    }

    setRules((prev) => {
      const filtered = prev.filter((r) => r.dayOfWeek !== day)
      return [...filtered, updated].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    })

    setPendingChanges((prev) => new Map(prev).set(day, updated))

    pendingRef.current = false
  }

  const updateTime = (day: number, field: "startTime" | "endTime", value: string) => {
    const current = getRule(day)

    const base: Rule =
      current ?? {
        id: "",
        facultyId: "",
        dayOfWeek: day,
        isBlocked: true,
        startTime: null,
        endTime: null,
        startDate,
        endDate: endDate || null,
      }

    const updated: Rule = { ...base, [field]: value }

    setRules((prev) => {
      const filtered = prev.filter((r) => r.dayOfWeek !== day)
      return [...filtered, updated].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    })

    setPendingChanges((prev) => new Map(prev).set(day, updated))
  }

  const saveAll = async () => {
    console.log("SAVE ALL CLICKED")
    console.log("pendingChanges size", pendingChanges.size)
    if (pendingChanges.size === 0) return


    setIsSavingAll(true)

    try {
      for (const [day, rule] of pendingChanges) {
        console.log("SENDING", day, rule)


        const res = await fetch("/api/availability-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayOfWeek: day,
            isBlocked: rule.isBlocked,
            startTime: rule.startTime,
            endTime: rule.endTime,
            startDate,
            endDate: endDate || null,
          }),
        })

        if (res.status === 403) { setLockedEndpoint("/api/availability-rules"); return }
        console.log("status", res.status)
      }
      const res = await fetch("/api/availability-rules")
      if (res.status === 403) { setLockedEndpoint("/api/availability-rules"); return }
      const data = await res.json()

      setRules(data.rules || [])
      setPendingChanges(new Map())
    } finally {
      setIsSavingAll(false)
    }
  }

  if (lockedEndpoint) {
    return <LockedTab endpoint={lockedEndpoint} />
  }

  if (errorMessage) {
    return (
      <ErrorBoundary>
        <ErrorState message={errorMessage} />
      </ErrorBoundary>
    )
  }

  if (status === "loading" || loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 flex items-center justify-center">
        <svg className="animate-spin ios-spinner w-6 h-6 text-gold-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <ErrorBoundary>
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-primary font-display">Availability Settings</h1>
        <p className="text-sm text-tertiary mt-1">
          Configure when students can book consultations with you. Weekend blocking is enabled by default.
        </p>
      </div>

      {/* Date Range Picker */}
      <div className="card p-5 bg-surface">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-tertiary uppercase tracking-wider mb-2">
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
            <label className="block text-xs font-bold text-tertiary uppercase tracking-wider mb-2">
              Effective Until <span className="text-tertiary">(optional)</span>
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
        <p className="text-[11px] text-tertiary mt-3">
          Rules below apply from <strong>{startDate}</strong>
          {endDate ? <> until <strong>{endDate}</strong></> : <> with no end date</>}.
          After the end date, these rules are disabled and no bookings will be accepted.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {DAY_LABELS.map((label, dayIndex) => {
          const rule = getRule(dayIndex)
          const hasPending = pendingChanges.has(dayIndex)
          const isBlocked = rule?.isBlocked ?? true

          return (
            <div
              key={dayIndex}
              className={`card p-5 bg-surface transition-all ${isBlocked ? "opacity-70" : ""} ${hasPending ? "border-amber-300 border-2 bg-amber-50/30" : ""
                }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-primary">{label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={!(rule?.isBlocked ?? true)}
                    onChange={() => toggleBlocked(dayIndex)}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-strong after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-brand-600)]" />
                </label>
              </div>

              {hasPending && (
                <div className="text-[10px] text-amber-600 font-semibold mb-2">Pending changes</div>
              )}


              {!isBlocked && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">From</label>
                    <input
                      type="time"
                      value={rule?.startTime || "08:00"}
                      onChange={(e) => updateTime(dayIndex, "startTime", e.target.value)}
                      className="input text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">To</label>
                    <input
                      type="time"
                      value={rule?.endTime || "18:00"}
                      onChange={(e) => updateTime(dayIndex, "endTime", e.target.value)}
                      className="input text-xs mt-1"
                    />
                  </div>
                </div>
              )}

              {isBlocked && (
                <p className="text-[11px] text-tertiary font-medium mt-2">Blocked — no bookings</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="card p-5 bg-surface border-default">
        <p className="text-xs text-tertiary font-medium">
          <strong>Note:</strong> These rules only apply to students booking consultations.
          Faculty-to-faculty meetings bypass these restrictions. Rules with an end date
          will automatically become inactive after that date.
        </p>
      </div>

      <div className="flex items-center justify-between pt-4">
        <div>
          {pendingChanges.size > 0 && (
            <p className="text-sm text-amber-600 font-semibold">
              {pendingChanges.size} {pendingChanges.size === 1 ? "change" : "changes"} pending
            </p>
          )}
          {pendingChanges.size === 0 && (
            <p className="text-xs text-tertiary font-medium">All changes saved ✓</p>
          )}
        </div>
        <button
          onClick={saveAll}
          disabled={pendingChanges.size === 0 || isSavingAll}
          className={`px-5 py-2 rounded-lg text-white text-sm font-semibold transition-all duration-200 ${pendingChanges.size === 0
            ? "bg-slate-300 cursor-not-allowed"
            : "bg-gold-600 hover:bg-gold-700 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            } ${isSavingAll ? "opacity-70" : ""}`}
        >
          {isSavingAll ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
    </ErrorBoundary>
  )
}
