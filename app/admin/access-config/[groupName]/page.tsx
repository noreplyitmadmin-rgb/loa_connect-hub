"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Skeleton from "@/components/ui/Skeleton"
import SubmitButton from "@/components/ui/SubmitButton"
import LockedTab from "@/components/ui/LockedTab"
import ErrorState from "@/components/ui/ErrorState"
import ErrorBoundary from "@/components/ui/ErrorBoundary"

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
  GUEST: "bg-surface text-secondary",
}

const ADMIN_LOCKED_PAGES = new Set(["/admin", "/admin/users", "/admin/access-config"])
const ALWAYS_LOCKED_PAGES = new Set(["/faq", "/403", "/admin/etl-hub", "/student/evaluations/thank-you"])

export default function EditAccessGroupPage() {
  const params = useParams()
  const groupName = params.groupName as string

  const [group, setGroup] = useState<GroupAccess | null>(null)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [lockedEndpoint, setLockedEndpoint] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const [selectedPages, setSelectedPages] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [pageTab, setPageTab] = useState<"pages" | "api">("pages")

  useEffect(() => {
    fetch("/api/admin/access-config")
      .then((r) => {
        if (r.status === 403) {
          return r.json().then((data) => {
            setLockedEndpoint(data.endpoint || "/api/admin/access-config")
            throw new Error("locked")
          })
        }
        return r.json()
      })
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
    (group?.groupName === "ADMIN" && ADMIN_LOCKED_PAGES.has(p)) || ALWAYS_LOCKED_PAGES.has(p)

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
        setErrorMessage(data.error || "Failed to save")
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
      <div className="w-full space-y-8 pb-12">
        <Skeleton variant="card" />
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

  if (!group) {
    return (
      <div className="w-full space-y-8 pb-12">
        <Link href="/admin/access-config" className="text-xs text-gold-600 hover:underline">&larr; Back to groups</Link>
        <p className="text-sm text-tertiary text-center py-8">Group not found.</p>
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

  const badgeColor = badgeColors[group.groupName] || "bg-surface text-secondary"

  return (
    <ErrorBoundary>
    <div className="w-full space-y-8 pb-12">
      <div>
        <Link href="/admin/access-config" className="text-xs text-gold-600 hover:underline">&larr; Back to groups</Link>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${badgeColor}`}>
            {group.groupName}
          </span>
          <span className="text-xs text-tertiary">Access Group</span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1 p-1 bg-surface-tertiary rounded-xl">
              <button
                onClick={() => setPageTab("pages")}
                className={`shrink-0 text-xs font-semibold px-4 py-1.5 rounded-lg whitespace-nowrap transition-all duration-200 ${
                  pageTab === "pages"
                    ? "bg-surface text-amber-600 shadow-ios-sm"
                    : "text-tertiary hover:text-secondary"
                }`}
              >
                Pages
              </button>
              <button
                onClick={() => setPageTab("api")}
                className={`shrink-0 text-xs font-semibold px-4 py-1.5 rounded-lg whitespace-nowrap transition-all duration-200 ${
                  pageTab === "api"
                    ? "bg-surface text-amber-600 shadow-ios-sm"
                    : "text-tertiary hover:text-secondary"
                }`}
              >
                API
              </button>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter pages..."
              className="input text-xs w-48 px-3 py-1.5 rounded-lg border border-strong"
            />
          </div>

          {catalog && (() => {
            const filtered = Object.entries(catalog.pages).reduce<[string, CatalogItem[]][]>((acc, [category, items]) => {
              const isApi = (p: string) => p.startsWith("/api/")
              const matched = items.filter((item) => {
                if (pageTab === "api" && !isApi(item.path)) return false
                if (pageTab === "pages" && isApi(item.path)) return false
                const lockedFilter = !((group.groupName === "ADMIN" && ADMIN_LOCKED_PAGES.has(item.path)) || ALWAYS_LOCKED_PAGES.has(item.path)) || selectedPages.includes(item.path)
                if (!lockedFilter) return false
                if (!search.trim()) return true
                const q = search.toLowerCase()
                return (
                  item.label.toLowerCase().includes(q) ||
                  item.path.toLowerCase().includes(q) ||
                  item.description.toLowerCase().includes(q)
                )
              })
              if (matched.length === 0) return acc
              acc.push([category, matched])
              return acc
            }, [])

            return filtered.length === 0 ? (
              <p className="text-sm text-tertiary text-center py-8">No pages found.</p>
            ) : (
              <div className="space-y-1 mb-3">
                {filtered.map(([category, items]) => (
                  <div key={category}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary mb-1 mt-2 first:mt-0">
                      {category}
                    </p>
                    {items.map((item) => {
                      const locked = (group.groupName === "ADMIN" && ADMIN_LOCKED_PAGES.has(item.path)) || ALWAYS_LOCKED_PAGES.has(item.path)
                      return (
                        <label
                          key={item.path}
                          className={`flex items-start gap-2 px-2 py-1.5 rounded hover:bg-surface-hover cursor-pointer text-xs ${locked ? "opacity-60" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPages.includes(item.path)}
                            onChange={() => togglePage(item.path)}
                            disabled={locked}
                            className="mt-0.5 rounded border-strong text-gold-600 focus:ring-gold-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span>{item.label}</span>
                              <span className="text-[10px] text-tertiary font-mono">{item.path}</span>
                              {locked && (
                                <span className="text-[10px] text-tertiary ml-0">(required)</span>
                              )}
                            </div>
                            <p className="text-[10px] text-tertiary truncate">{item.description}</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                ))}
              </div>
            )
          })()}
          <p className="text-[10px] text-tertiary mt-1">Child routes are automatically allowed.</p>
        </div>



        <div className="flex items-center justify-end gap-3 pt-1 border-t border-default">
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
    </ErrorBoundary>
  )
}
