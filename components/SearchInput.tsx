"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function SearchInput({ query }: { query: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(query)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value !== query) {
        const params = new URLSearchParams(searchParams.toString())
        if (value.trim()) {
          params.set("q", value.trim())
        } else {
          params.delete("q")
        }
        router.replace(`/faculty/meetings?${params.toString()}`)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [value, query, searchParams, router])

  return (
    <div className="relative w-full sm:w-72">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search meetings..."
        className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 shadow-sm transition-colors focus:border-slate-400 focus:outline-none"
      />
    </div>
  )
}
