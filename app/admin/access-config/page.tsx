"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Skeleton from "@/components/Skeleton"

interface GroupAccess {
  groupName: string
  pages: string[]
  apis: string[]
}

const badgeColors: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  DEAN: "bg-amber-100 text-amber-700",
  FACULTY: "bg-emerald-100 text-emerald-700",
  STUDENT: "bg-blue-100 text-blue-700",
  GUEST: "bg-slate-100 text-slate-600",
}

export default function AdminAccessConfigPage() {
  const [groups, setGroups] = useState<GroupAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")

  const loadGroups = () => {
    fetch("/api/admin/access-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.groups) setGroups(data.groups)
      })
      .catch(() => {})
      .finally(() => setLoading(() => false))
  }

  useEffect(() => { loadGroups() }, [])

  const handleAddGroup = async () => {
    const name = newGroupName.trim()
    if (!name) return
    setCreating(true)
    try {
      const res = await fetch("/api/admin/access-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupName: name }),
      })
      if (res.ok) {
        setNewGroupName("")
        loadGroups()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to create group")
      }
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <h1 className="text-2xl font-bold text-slate-900">Access Configuration</h1>
        <p className="text-xs text-slate-500">Loading access groups…</p>
        <div className="space-y-4">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Access Configuration</h1>
        <p className="text-xs text-slate-500 mt-1">
          Select a group to configure which pages and API endpoints they can access.
        </p>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              handleAddGroup()
            }
          }}
          placeholder="New group name (e.g. COORDINATOR)"
          className="input text-xs flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-300"
        />
        <button
          onClick={handleAddGroup}
          disabled={creating || !newGroupName.trim()}
          className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
        >
          {creating ? "Adding…" : "Add Group"}
        </button>
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">No access groups found. Create one above.</p>
      )}

      <div className="space-y-3">
        {groups.map((group) => {
          const badgeColor = badgeColors[group.groupName] || "bg-slate-100 text-slate-600"
          return (
            <Link
              key={group.groupName}
              href={`/admin/access-config/${group.groupName}`}
              className="block card p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${badgeColor}`}>
                    {group.groupName}
                  </span>
                  <span className="text-xs text-slate-400">Access Group</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>{group.pages.length} pages</span>
                  <span>{group.apis.length} APIs</span>
                  <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
