"use client"

import { useState, useRef, useEffect, useMemo } from "react"

interface UserItem {
  id: string
  name: string
  email: string
}

interface UserSearchSelectProps {
  users: UserItem[]
  excludeIds: string[]
  onSelect: (user: UserItem) => void
  placeholder?: string
}

function getSurname(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.length > 1 ? parts[parts.length - 1] : name
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text
  const escaped = escapeRegex(query)
  const regex = new RegExp(`(${escaped})`, "gi")
  const parts = text.split(regex)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <span key={i} className="bg-yellow-200 font-semibold rounded px-0.5">{part}</span>
      : part
  )
}

export default function UserSearchSelect({
  users,
  excludeIds,
  onSelect,
  placeholder = "Search by name or email...",
}: UserSearchSelectProps) {
  const [search, setSearch] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const results = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    const filtered = users.filter(
      (u) =>
        !excludeIds.includes(u.id) &&
        (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    )
    return filtered.sort((a, b) => {
      const aNameStarts = a.name.toLowerCase().startsWith(q)
      const bNameStarts = b.name.toLowerCase().startsWith(q)
      const aEmailStarts = a.email.toLowerCase().startsWith(q)
      const bEmailStarts = b.email.toLowerCase().startsWith(q)

      if (aNameStarts && !bNameStarts) return -1
      if (!aNameStarts && bNameStarts) return 1

      if (aEmailStarts && !bEmailStarts) return -1
      if (!aEmailStarts && bEmailStarts) return 1

      const aSurname = getSurname(a.name)
      const bSurname = getSurname(b.name)
      return aSurname.localeCompare(bSurname)
    })
  }, [search, users, excludeIds])

  const handleSelect = (user: UserItem) => {
    onSelect(user)
    setSearch("")
    setShowDropdown(false)
  }

  return (
    <div ref={ref} className="relative flex-1">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowDropdown(true) }}
          onFocus={() => { if (search.trim()) setShowDropdown(true) }}
          placeholder={placeholder}
          className="input text-xs pl-9 w-full"
        />
      </div>
      {showDropdown && results.length > 0 && (
        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleSelect(u)}
              className="w-full text-left px-3 py-2.5 hover:bg-gold-50 border-b border-slate-50 last:border-b-0 transition-colors"
            >
              <p className="text-sm font-medium text-slate-800">{highlightMatch(u.name, search)}</p>
              <p className="text-xs text-slate-400">{highlightMatch(u.email, search)}</p>
            </button>
          ))}
        </div>
      )}
      {showDropdown && search.trim() && results.length === 0 && (
        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg p-3">
          <p className="text-xs text-slate-400">No users match your search.</p>
        </div>
      )}
    </div>
  )
}
