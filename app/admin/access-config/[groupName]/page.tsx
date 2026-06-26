"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Skeleton from "@/components/ui/Skeleton"
import SubmitButton from "@/components/ui/SubmitButton"
import ErrorState from "@/components/ui/ErrorState"
import ErrorBoundary from "@/components/ui/ErrorBoundary"
import { invalidate } from "@/lib/api/client"

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

const ALWAYS_LOCKED_PAGES = new Set(["/faq", "/403", "/student/evaluations/thank-you"])

export default function EditAccessGroupPage() {
  const params = useParams()
  const groupName = params.groupName as string

  const [group, setGroup] = useState<GroupAccess | null>(null)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const [selectedPages, setSelectedPages] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [pageTab, setPageTab] = useState<"pages" | "api">("pages")
  const [readOnly, setReadOnly] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/access-config").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()).catch(() => ({ user: null })),
    ])
      .then(([data, me]) => {
        const g = (data.groups || []).find((grp: GroupAccess) => grp.groupName === groupName)
        if (g) {
          setGroup(g)
          if (g.groupName === "ADMIN" && data.catalog?.pages) {
            // Admin paths are mandatory (locked) — pulled from catalog.
            // Non-admin paths come from saved DB pages (toggleable).
            const adminCatalogPaths: string[] = []
            for (const items of Object.values(data.catalog.pages as Record<string, CatalogItem[]>)) {
              for (const item of items) {
                if (item.path.startsWith("/admin")) adminCatalogPaths.push(item.path)
              }
            }
            setSelectedPages([...new Set([...g.pages, ...adminCatalogPaths])])
          } else {
            setSelectedPages(g.pages)
          }
        }
        if (data.catalog) setCatalog(data.catalog)
        const role = me?.user?.role ?? ""
        setReadOnly(!role.split("|").includes("ADMIN"))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [groupName])

  const isLockedPage = (p: string) =>
    (group?.groupName === "ADMIN" && p.startsWith("/admin") && p !== "/admin/etl-hub") || ALWAYS_LOCKED_PAGES.has(p)

  const togglePage = (path: string) => {
    if (readOnly) return
    if (isLockedPage(path)) return
    setSelectedPages((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    )
  }

  const normalizePath = (p: string) => p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p

  const handleSave = async () => {
    if (!group) return
    setSaving(true)
    setSaved(false)
    let deduped = [...new Set(selectedPages.map(normalizePath))]
    // ADMIN access is hardcoded — only persist additional non-admin pages
    if (group.groupName === "ADMIN") {
      deduped = deduped.filter((p) => !p.startsWith("/admin"))
    }

    try {
      const res = await fetch("/api/admin/access-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupName: group.groupName, pages: deduped }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.group) {
          setGroup(data.group)
          setSelectedPages(data.group.pages)
        }
        invalidate("/api/auth/access")
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

  const norm = (a: string[]) => [...new Set(a.map(normalizePath))].sort()
  const hasChanges =
    group &&
    JSON.stringify(norm(selectedPages)) !== JSON.stringify(norm(group.pages))

  if (loading) {
    return (
      <div className="w-full space-y-8 pb-12">
        <Skeleton variant="card" />
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
              <div className="flex items-center gap-2">
                {catalog && (() => {
                  const rolePrefixes = ["/admin/", "/dean/", "/faculty/", "/student/"]
                  const suffixAfterRolePrefix = (p: string) => {
                    for (const prefix of rolePrefixes) {
                      if (p.startsWith(prefix)) return p.slice(prefix.length)
                    }
                    return null
                  }
                  const isApi = (p: string) => p.startsWith("/api/")
                  const visibleToggleable = Object.entries(catalog.pages).reduce<string[]>((acc, [category, items]) => {
                    for (const item of items) {
                  if (isLockedPage(item.path) || readOnly) continue
                      if (pageTab === "api" && !isApi(item.path)) continue
                      if (pageTab === "pages" && isApi(item.path)) continue
                      if (search.trim()) {
                        const q = search.toLowerCase()
                        if (!item.label.toLowerCase().includes(q) && !item.path.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) continue
                      }
                      acc.push(item.path)
                    }
                    return acc
                  }, [])
                  const allSelected = visibleToggleable.length > 0 && visibleToggleable.every((v) => selectedPages.includes(v))
                  if (visibleToggleable.length > 0) {
                    return (
                      <button
                        onClick={() => {
                          if (allSelected) {
                            setSelectedPages((prev) => prev.filter((p) => !visibleToggleable.includes(p)))
                          } else {
                            setSelectedPages((prev) => {
                              const next = new Set(prev)
                              for (const v of visibleToggleable) next.add(v)
                              return Array.from(next)
                            })
                          }
                        }}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-surface text-amber-600 hover:bg-surface-hover border border-strong transition-colors"
                      >
                        {allSelected ? "Deselect all" : "Select all"}
                      </button>
                    )
                  }
                  return null
                })()}
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter pages..."
                  className="input text-xs w-48 px-3 py-1.5 rounded-lg border border-strong"
                />
              </div>
            </div>

          {catalog && (() => {
            const rolePrefixes = ["/admin/", "/dean/", "/faculty/", "/student/"]
            const suffixAfterRolePrefix = (p: string) => {
              for (const prefix of rolePrefixes) {
                if (p.startsWith(prefix)) return p.slice(prefix.length)
              }
              return null
            }

            const displayPath = (p: string) => suffixAfterRolePrefix(p) || p
            const ROLE_CATS = ["Admin", "Dean", "Faculty", "Student"]
            const displayLabel = (label: string, category: string) =>
              ROLE_CATS.includes(category) && label.startsWith(category + " / ") ? label.slice(category.length + 3) : label

            const ownRoleCat = group.groupName === "ADMIN" ? "Admin" : group.groupName === "DEAN" ? "Dean" : null
            const ownRoleSuffixes = new Set<string>()
            if (ownRoleCat && catalog.pages[ownRoleCat]) {
              for (const item of catalog.pages[ownRoleCat]) {
                const suffix = suffixAfterRolePrefix(item.path)
                if (suffix) ownRoleSuffixes.add(suffix)
              }
            }

            const isMirroredDuplicate = (category: string, path: string) => {
              if (group.groupName === "ADMIN" && category === "Dean") {
                const s = suffixAfterRolePrefix(path)
                return s !== null && ownRoleSuffixes.has(s)
              }
              if (group.groupName === "DEAN" && category === "Admin") {
                const s = suffixAfterRolePrefix(path)
                return s !== null && ownRoleSuffixes.has(s)
              }
              return false
            }

            const isApi = (p: string) => p.startsWith("/api/")

            const catalogEntries = pageTab === "api"
              ? Object.entries(catalog.pages).flatMap<[string, CatalogItem[]]>(([, items]) => {
                  const grouped = new Map<string, CatalogItem[]>()
                  for (const item of items) {
                    if (!isApi(item.path)) continue
                    const seg = item.path.split("/")[2]
                    const key = `api/${seg}`
                    if (!grouped.has(key)) grouped.set(key, [])
                    grouped.get(key)!.push(item)
                  }
                  return Array.from(grouped.entries())
                })
              : Object.entries(catalog.pages).filter(([category]) => category !== "API")

            const filtered = catalogEntries.reduce<[string, CatalogItem[]][]>((acc, [category, items]) => {
              const matched = items.filter((item) => {
                if (isMirroredDuplicate(category, item.path)) return false
                const lockedFilter = !isLockedPage(item.path) || selectedPages.includes(item.path)
                if (!lockedFilter) return false
                if (!search.trim()) return true
                const q = search.toLowerCase()
                return (
                  item.label.toLowerCase().includes(q) ||
                  displayPath(item.path).toLowerCase().includes(q) ||
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
                      const locked = isLockedPage(item.path)
                      return (
                        <label
                          key={item.path}
                          className={`flex items-start gap-2 px-2 py-1.5 rounded hover:bg-surface-hover cursor-pointer text-xs ${locked ? "opacity-60" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPages.includes(item.path)}
                            onChange={() => togglePage(item.path)}
                            disabled={locked || readOnly}
                            className="mt-0.5 rounded border-strong text-gold-600 focus:ring-gold-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span>{displayLabel(item.label, category)}</span>
                              <span className="text-[10px] text-tertiary font-mono">{displayPath(item.path)}</span>
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
            disabled={saving || !hasChanges || readOnly}
          >
            {saving ? "Saving…" : "Save Changes"}
          </SubmitButton>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  )
}
