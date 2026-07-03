"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Skeleton from "@/components/ui/Skeleton"
import SubmitButton from "@/components/ui/SubmitButton"
import ErrorState from "@/components/ui/ErrorState"
import ErrorBoundary from "@/components/ui/ErrorBoundary"
import { invalidate } from "@/lib/api/client"
import type { PageApiEntry } from "@/lib/page-api-map"

interface GroupAccess {
  groupName: string
  pages: string[]
  api_overrides: Record<string, Record<string, boolean>>
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
const ADMIN_MIRROR_STUBS = new Set([
  "/dean/data/users",
  "/dean/data/users/deleted",
  "/dean/data/academic-infrastructure",
  "/dean/etl-hub",
  "/dean/reports",
  "/dean/reports/health",
  "/dean/reports/demand",
  "/dean/reports/responsiveness",
  "/dean/reports/backlog",
  "/dean/reports/coverage",
  "/dean/reports/distribution",
  "/dean/evaluations/rubrics",
  "/dean/evaluations/reports",
])

type OverrideMap = Record<string, Record<string, boolean>>

export default function EditAccessGroupPage() {
  const params = useParams()
  const groupName = params.groupName as string

  const [group, setGroup] = useState<GroupAccess | null>(null)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [pageApiMap, setPageApiMap] = useState<Record<string, PageApiEntry> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const [selectedPages, setSelectedPages] = useState<string[]>([])
  const [overrides, setOverrides] = useState<OverrideMap>({})
  const [search, setSearch] = useState("")
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
          // API paths are expanded in stored pages — extract only page paths for selections
          const isApiPath = (p: string) => p.startsWith("/api/")
          setSelectedPages((g.pages || []).filter((p: string) => !isApiPath(p)))
          setOverrides(g.api_overrides || {})
        }
        if (data.catalog) setCatalog(data.catalog)
        if (data.pageApiMap) setPageApiMap(data.pageApiMap)
        const role = me?.user?.role ?? ""
        setReadOnly(!role.split("|").includes("ADMIN"))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [groupName])

  const isLockedPage = (p: string) =>
    (group?.groupName === "ADMIN" && (p === "/admin/access-config" || p === "/admin/user-permissions")) || ALWAYS_LOCKED_PAGES.has(p)

  const togglePage = (path: string) => {
    if (readOnly || isLockedPage(path)) return
    setSelectedPages((prev) => {
      const on = prev.includes(path)
      if (on) {
        const newOverrides = { ...overrides }
        delete newOverrides[path]
        setOverrides(newOverrides)
        return prev.filter((p) => p !== path)
      }
      return [...prev, path]
    })
  }

  const toggleApiOverride = (pagePath: string, apiPath: string) => {
    if (readOnly) return
    setOverrides((prev) => {
      const pageOverrides = { ...(prev[pagePath] || {}) }
      const current = pageOverrides[apiPath]
      if (current === true) {
        delete pageOverrides[apiPath]
      } else if (current === false) {
        pageOverrides[apiPath] = true
      } else {
        pageOverrides[apiPath] = false
      }
      const next = { ...prev }
      if (Object.keys(pageOverrides).length === 0) {
        delete next[pagePath]
      } else {
        next[pagePath] = pageOverrides
      }
      return next
    })
  }

  const isApiEffective = (pagePath: string, apiPath: string): boolean => {
    if (!selectedPages.includes(pagePath)) return false
    const o = overrides[pagePath]?.[apiPath]
    if (o === false) return false
    return true
  }

  const isApiOverridden = (pagePath: string, apiPath: string): "granted" | "denied" | null => {
    const o = overrides[pagePath]?.[apiPath]
    if (o === true) return "granted"
    if (o === false) return "denied"
    return null
  }

  const getSharedPages = (apiPath: string, currentPage: string): string[] => {
    if (!pageApiMap) return []
    const pages: string[] = []
    for (const [page, entry] of Object.entries(pageApiMap)) {
      if (page !== currentPage && entry.apis.includes(apiPath)) {
        pages.push(entry.label)
      }
    }
    return pages
  }

  const normalizePath = (p: string) => p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p

  const handleSave = async () => {
    if (!group) return
    setSaving(true)
    setSaved(false)
    let deduped = [...new Set(selectedPages.map(normalizePath))]
    if (group.groupName === "ADMIN") {
      deduped = deduped.filter((p) => p !== "/admin/access-config" && p !== "/admin/user-permissions")
    }

    try {
      const res = await fetch("/api/admin/access-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName: group.groupName,
          pages: deduped,
          api_overrides: overrides,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.group) {
          setGroup(data.group)
          const isApiPath = (p: string) => p.startsWith("/api/")
          setSelectedPages((data.group.pages || []).filter((p: string) => !isApiPath(p)))
          setOverrides(data.group.api_overrides || {})
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
  const isApiPath = (p: string) => p.startsWith("/api/")
  const hasChanges =
    group &&
    (JSON.stringify(norm(selectedPages)) !== JSON.stringify(norm((group.pages || []).filter((p) => !isApiPath(p)))) ||
      JSON.stringify(overrides) !== JSON.stringify(group.api_overrides || {}))

  const catalogEntries = useMemo(() => {
    if (!catalog) return []
    let entries = Object.entries(catalog.pages).filter(([category]) => category !== "API")
    if (group?.groupName === "ADMIN") {
      entries = entries.map(([category, items]) => [
        category,
        items.filter((item) => !ADMIN_MIRROR_STUBS.has(item.path)),
      ] as [string, typeof items]).filter(([, items]) => items.length > 0)
    }
    return entries
  }, [catalog, group])

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

  const rolePrefixes = ["/admin/", "/dean/", "/faculty/", "/student/"]
  const displayPath = (p: string) => {
    for (const prefix of rolePrefixes) {
      if (p.startsWith(prefix)) return p.slice(prefix.length)
    }
    return p
  }

  const displayLabel = (label: string, category: string) => {
    const ROLE_CATS = ["Admin", "Dean", "Faculty", "Student"]
    return ROLE_CATS.includes(category) && label.startsWith(category + " / ") ? label.slice(category.length + 3) : label
  }

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
            <div className="flex items-center gap-2">
              {catalog && pageApiMap && (() => {
                const allPagePaths = catalogEntries.flatMap(([, items]) =>
                  items.map((i) => i.path).filter((p) => !isApiPath(p)),
                )
                const visiblePagePaths = allPagePaths.filter((p) => {
                  if (!search.trim()) return true
                  const q = search.toLowerCase()
                  const entry = pageApiMap[p]
                  const labelMatch = entry?.label.toLowerCase().includes(q)
                  const pathMatch = p.toLowerCase().includes(q)
                  const apiMatch = entry?.apis.some((a) => a.toLowerCase().includes(q))
                  return labelMatch || pathMatch || apiMatch
                })
                const toggleable = visiblePagePaths.filter((p) => !isLockedPage(p) && !readOnly)
                if (toggleable.length === 0) return null
                const allSelected = toggleable.every((p) => selectedPages.includes(p))
                return (
                  <button
                    onClick={() => {
                      if (allSelected) {
                        const next = selectedPages.filter((p) => !toggleable.includes(p))
                        setSelectedPages(next)
                        const nextOverrides = { ...overrides }
                        for (const p of toggleable) delete nextOverrides[p]
                        setOverrides(nextOverrides)
                      } else {
                        setSelectedPages((prev) => {
                          const next = new Set(prev)
                          for (const p of toggleable) next.add(p)
                          return Array.from(next)
                        })
                      }
                    }}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-surface text-amber-600 hover:bg-surface-hover border border-strong transition-colors"
                  >
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                )
              })()}
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter pages..."
              className="input text-xs w-48 px-3 py-1.5 rounded-lg border border-strong"
            />
          </div>

          {catalogEntries.length === 0 ? (
            <p className="text-sm text-tertiary text-center py-8">No pages found.</p>
          ) : (
            <div className="space-y-6">
              {catalogEntries.map(([category, items]) => {
                const pageItems = items.filter((i) => !isApiPath(i.path))
                const filteredPages = pageItems.filter((item) => {
                  if (!pageApiMap) return true
                  if (!search.trim()) return true
                  const q = search.toLowerCase()
                  const entry = pageApiMap[item.path]
                  const labelMatch = entry?.label.toLowerCase().includes(q)
                  const pathMatch = item.path.toLowerCase().includes(q)
                  const apiMatch = entry?.apis.some((a) => a.toLowerCase().includes(q))
                  return labelMatch || pathMatch || apiMatch
                })
                if (filteredPages.length === 0) return null

                return (
                  <div key={category}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary mb-2">
                      {category}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredPages.map((item) => {
                        const locked = isLockedPage(item.path)
                        const pageOn = selectedPages.includes(item.path)
                        const entry = pageApiMap?.[item.path]
                        const apis = entry?.apis ?? []
                        const ctrlId = `page-${item.path.replace(/\//g, "-")}`

                        return (
                          <div
                            key={item.path}
                            className={`rounded-xl border transition-all duration-200 ${
                              pageOn
                                ? "border-amber-300 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-700"
                                : "border-slate-200 dark:border-slate-700 bg-surface"
                            } ${locked ? "opacity-60" : ""}`}
                          >
                            <label
                              htmlFor={ctrlId}
                              className="flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-inherit"
                            >
                              <input
                                id={ctrlId}
                                type="checkbox"
                                checked={pageOn}
                                onChange={() => togglePage(item.path)}
                                disabled={locked || readOnly}
                                className="mt-0.5 rounded border-strong text-amber-600 focus:ring-amber-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-semibold ${pageOn ? "text-amber-800 dark:text-amber-200" : "text-primary"}`}>
                                    {displayLabel(item.label, category)}
                                  </span>
                                  <span className="text-[10px] text-tertiary font-mono">{displayPath(item.path)}</span>
                                  {locked && (
                                    <span className="text-[10px] text-tertiary">(required)</span>
                                  )}
                                </div>
                              </div>
                            </label>

                            {apis.length > 0 && (
                              <div className="px-4 py-2 space-y-1">
                                {apis.map((apiPath) => {
                                  const effective = isApiEffective(item.path, apiPath)
                                  const overrideState = isApiOverridden(item.path, apiPath)
                                  const sharedWith = getSharedPages(apiPath, item.path)
                                  return (
                                    <label
                                      key={apiPath}
                                      className={`flex items-center gap-2 py-1 rounded cursor-pointer text-xs group ${
                                        !pageOn ? "opacity-40 pointer-events-none" : ""
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={effective}
                                        onChange={() => toggleApiOverride(item.path, apiPath)}
                                        disabled={!pageOn || readOnly}
                                        className={`rounded border-strong text-amber-600 focus:ring-amber-500 ${
                                          overrideState === "granted" ? "ring-2 ring-amber-400" : ""
                                        } ${overrideState === "denied" ? "opacity-50" : ""}`}
                                      />
                                      <div className="flex-1 min-w-0 flex items-center gap-1.5">
                                        <span className={`font-mono text-[10px] ${
                                          effective ? "text-amber-700 dark:text-amber-300" : "text-tertiary"
                                        }`}>
                                          {apiPath}
                                        </span>
                                        {overrideState && (
                                          <span className={`text-[9px] font-bold px-1 py-px rounded ${
                                            overrideState === "granted"
                                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                              : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                          }`}>
                                            {overrideState === "granted" ? "ON" : "OFF"}
                                          </span>
                                        )}
                                        {sharedWith.length > 0 && (
                                          <span className="text-[9px] text-tertiary truncate" title={`Also used by: ${sharedWith.join(", ")}`}>
                                            (also {sharedWith.slice(0, 2).join(", ")}{sharedWith.length > 2 ? ` +${sharedWith.length - 2}` : ""})
                                          </span>
                                        )}
                                      </div>
                                    </label>
                                  )
                                })}
                              </div>
                            )}

                            {apis.length === 0 && (
                              <div className="px-4 py-2">
                                <p className="text-[10px] text-tertiary italic">No API endpoints required</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <p className="text-[10px] text-tertiary mt-2">Child routes are automatically allowed.</p>
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
            {saving ? "Saving\u2026" : "Save Changes"}
          </SubmitButton>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  )
}
