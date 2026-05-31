"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Skeleton from "@/components/Skeleton"
import SubmitButton from "@/components/SubmitButton"

interface GroupAccess {
  groupName: string
  pages: string[]
}

interface CatalogItem {
  path: string
  label: string
  description: string
}

interface Catalog {
  pages: Record<string, CatalogItem[]>
}

const badgeColors: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  DEAN: "bg-amber-100 text-amber-700",
  FACULTY: "bg-emerald-100 text-emerald-700",
  STUDENT: "bg-blue-100 text-blue-700",
  GUEST: "bg-slate-100 text-slate-600",
}

const ADMIN_LOCKED_PAGES = new Set(["/admin", "/admin/users", "/admin/access-config"])

export default function EditAccessGroupPage() {
  const params = useParams()
  const groupName = params.groupName as string

  const [group, setGroup] = useState<GroupAccess | null>(null)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [selectedPages, setSelectedPages] = useState<string[]>([])

  useEffect(() => {
    fetch("/api/admin/access-config")
      .then((r) => r.json())
      .then((data) => {
        const g = (data.groups || []).find((grp: GroupAccess) => grp.groupName === groupName)
        if (g) {
          setGroup(g)
          setSelectedPages(g.pages)
        }
        if (data.catalog) setCatalog(data.catalog)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [groupName])

  const isLockedPage = (p: string) =>
    group?.groupName === "ADMIN" && ADMIN_LOCKED_PAGES.has(p)

  const togglePage = (path: string) => {
    if (isLockedPage(path) && selectedPages.includes(path)) return
    setSelectedPages((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    )
  }

  const handleSave = async () => {
    if (!group) return
    setSaving(true)
    setSaved(false)

    try {
      const res = await fetch("/api/admin/access-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupName: group.groupName, pages: selectedPages }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.group) {
          setGroup(data.group)
          setSelectedPages(data.group.pages)
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        const data = await res.json()
        alert(data.error || "Failed to save")
      }
    } finally {
      setSaving(false)
    }
  }

  const hasChanges =
    group &&
    JSON.stringify([...selectedPages].sort()) !== JSON.stringify([...group.pages].sort())

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <Skeleton variant="card" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <Link href="/admin/access-config" className="text-xs text-gold-600 hover:underline">&larr; Back to groups</Link>
        <p className="text-sm text-slate-400 text-center py-8">Group not found.</p>
      </div>
    )
  }

  const badgeColor = badgeColors[group.groupName] || "bg-slate-100 text-slate-600"

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <Link href="/admin/access-config" className="text-xs text-gold-600 hover:underline">&larr; Back to groups</Link>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${badgeColor}`}>
            {group.groupName}
          </span>
          <span className="text-xs text-slate-400">Access Group</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">Allowed Pages</label>
          {catalog && (
            <div className="space-y-1 mb-3">
              {Object.entries(catalog.pages).map(([category, items]) => {
                const visible = items.filter(
                  (item) =>
                    !(group.groupName === "ADMIN" && ADMIN_LOCKED_PAGES.has(item.path)) ||
                    selectedPages.includes(item.path)
                )
                if (visible.length === 0) return null
                return (
                  <div key={category}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 mt-2 first:mt-0">
                      {category}
                    </p>
                    {visible.map((item) => {
                      const locked = group.groupName === "ADMIN" && ADMIN_LOCKED_PAGES.has(item.path)
                      return (
                        <label
                          key={item.path}
                          className={`flex items-start gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs ${locked ? "opacity-60" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPages.includes(item.path)}
                            onChange={() => togglePage(item.path)}
                            disabled={locked}
                            className="mt-0.5 rounded border-slate-300 text-gold-600 focus:ring-gold-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span>{item.label}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{item.path}</span>
                              {locked && (
                                <span className="text-[10px] text-slate-400 ml-0">(required)</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">{item.description}</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-1">Child routes are automatically allowed.</p>
        </div>



        <div className="flex items-center justify-end gap-3 pt-1 border-t border-slate-100">
          {saved && (
            <span className="text-xs font-semibold text-emerald-600">Saved</span>
          )}
          <SubmitButton
            onClick={handleSave}
            variant="primary"
            className="text-xs font-semibold px-4 py-2 rounded-lg"
            disabled={saving || !hasChanges}
          >
            {saving ? "Saving…" : "Save Changes"}
          </SubmitButton>
        </div>
      </div>
    </div>
  )
}
