"use client"

import { useEffect, useState } from "react"

interface VersionInfo {
  version: string
  commit: string
  buildTime: string
}

export function BuildVersion() {
  const [info, setInfo] = useState<VersionInfo | null>(null)

  useEffect(() => {
    fetch("/version.json")
      .then((r) => r.json())
      .then((d) => setInfo(d))
      .catch(() => {})
  }, [])

  if (!info) return null

  const date = new Date(info.buildTime)
  const dateStr = date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className="fixed bottom-2 right-2 z-50">
      <span className="text-[10px] text-slate-400 dark:text-slate-600 font-mono bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm px-2 py-0.5 rounded-full border border-slate-200/50 dark:border-slate-700/50">
        v{info.version} · {info.commit} · {dateStr}
      </span>
    </div>
  )
}
