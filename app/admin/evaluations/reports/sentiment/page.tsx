"use client"

import { useState, useEffect } from "react"
import Skeleton from "@/components/ui/Skeleton"
import { SkeletonCard } from "@/components/ui/Skeleton"
import LockedTab from "@/components/ui/LockedTab"
import ErrorState from "@/components/ui/ErrorState"
import ErrorBoundary from "@/components/ui/ErrorBoundary"

interface CommentRow {
  id: string
  comment: string
  sentimentLabel: string | null
  sentimentScore: number | null
  evaluation: { evaluateeId: string; semesterId: string }
}

const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: "bg-emerald-100 text-emerald-700 border-emerald-300",
  NEGATIVE: "bg-red-100 text-red-700 border-red-300",
  NEUTRAL: "bg-slate-100 text-slate-600 border-slate-300",
  MIXED: "bg-amber-100 text-amber-700 border-amber-300",
}

const SENTIMENT_BG: Record<string, string> = {
  POSITIVE: "bg-emerald-500",
  NEGATIVE: "bg-red-500",
  NEUTRAL: "bg-slate-500",
  MIXED: "bg-amber-500",
}

interface Semester {
  id: string
  title: string
}

export default function SentimentAnalysisPage() {
  const [comments, setComments] = useState<CommentRow[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [selectedSemester, setSelectedSemester] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)
  const [lockedEndpoint, setLockedEndpoint] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        const [perRes, comRes] = await Promise.all([
          fetch("/api/evaluation-periods"),
          fetch("/api/evaluation-comments"),
        ])
        if (perRes.status === 403) {
          const data = await perRes.json()
          setLockedEndpoint(data.endpoint || "/api/evaluation-periods")
          return
        }
        if (comRes.status === 403) {
          const data = await comRes.json()
          setLockedEndpoint(data.endpoint || "/api/evaluation-comments")
          return
        }
        const [perData, comData] = await Promise.all([perRes.json(), comRes.json()])
        setSemesters(perData.periods || [])
        if (perData.periods?.length > 0) setSelectedSemester(perData.periods[0].id)
        setComments(comData.comments || [])
      } catch {
        setErrorMessage("Failed to load sentiment data")
      } finally {
        setLoading(false)
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedSemester) return
    Promise.resolve().then(async () => {
      const res = await fetch(`/api/evaluation-comments?semesterId=${selectedSemester}`)
      if (!res.ok) return
      const data = await res.json()
      setComments(data.comments || [])
    })
  }, [selectedSemester])

  const filteredComments = filter
    ? comments.filter((c) => c.sentimentLabel === filter)
    : comments

  if (loading) {
    return (
      <div className="pb-12 space-y-6">
        <Skeleton variant="text" className="w-48 h-7" />
        <Skeleton variant="text" className="w-64 h-4" />
        <SkeletonCard count={2} />
      </div>
    )
  }

  if (lockedEndpoint) {
    return (
      <div className="w-full pb-12">
        <LockedTab endpoint={lockedEndpoint} />
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="w-full pb-12">
        <ErrorState message={errorMessage} onRetry={() => setErrorMessage("")} />
      </div>
    )
  }

  const labelCounts = { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0, MIXED: 0 }
  const labelKeys = Object.keys(labelCounts)
  for (const c of comments) {
    const key = (c.sentimentLabel || "NEUTRAL") as keyof typeof labelCounts
    if (key in labelCounts) labelCounts[key]++
  }
  const total = comments.length
  const distribution = labelKeys.map((label) => ({
    label,
    count: labelCounts[label as keyof typeof labelCounts],
    percentage: total > 0 ? Math.round((labelCounts[label as keyof typeof labelCounts] / total) * 100) : 0,
  }))
  const maxCount = Math.max(...distribution.map((d) => d.count), 1)

  return (
    <ErrorBoundary>
    <div className="w-full space-y-8 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-primary">Sentiment Analysis</h1>
          <p className="text-sm text-tertiary mt-1">{total} comments analyzed</p>
        </div>
        <select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
          className="text-sm border border-default rounded-lg px-3 py-1.5 bg-surface text-primary"
        >
          <option value="">All Semesters</option>
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {distribution.map((d) => (
          <div key={d.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${SENTIMENT_COLORS[d.label]?.split(" ")[0] ?? ""} inline-block px-2 py-0.5 rounded-full`}>
              {d.label}
            </p>
            <p className="text-2xl font-bold text-primary mt-1">{d.count}</p>
            <p className="text-xs text-tertiary">{d.percentage}%</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-primary mb-4">Distribution</h3>
        <div className="space-y-3">
          {distribution.map((d) => (
            <div key={d.label} className="flex items-center gap-3">
              <span className={`text-xs font-semibold w-20 ${SENTIMENT_COLORS[d.label]?.split(" ")[0] ?? ""}`}>
                {d.label}
              </span>
              <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${SENTIMENT_BG[d.label] ?? "bg-slate-500"}`}
                  style={{ width: `${maxCount > 0 ? (d.count / maxCount) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-tertiary w-12 text-right">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-primary">Comments</h3>
          <div className="flex gap-2">
            {["ALL", "POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"].map((l) => (
              <button
                key={l}
                onClick={() => setFilter(l === "ALL" ? null : l)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  (l === "ALL" && !filter) || filter === l
                    ? "bg-blue-100 border-blue-300 text-blue-700"
                    : "bg-white border-slate-200 text-tertiary hover:border-slate-300"
                }`}
              >
                {l === "ALL" ? "All" : l.charAt(0) + l.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        {filteredComments.length === 0 ? (
          <p className="text-sm text-tertiary py-8 text-center">No comments found</p>
        ) : (
          <div className="space-y-2">
            {filteredComments.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-primary whitespace-pre-wrap">{c.comment}</p>
                  {c.sentimentLabel && (
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${SENTIMENT_COLORS[c.sentimentLabel] ?? ""}`}>
                      {c.sentimentLabel}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  )
}
