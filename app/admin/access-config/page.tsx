"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Skeleton from "@/components/ui/Skeleton"
import SubmitButton from "@/components/ui/SubmitButton"
import ErrorState from "@/components/ui/ErrorState"
import type { PageApiEntry } from "@/lib/page-api-map"

interface GroupAccess {
  groupName: string
  pages: string[]
}

interface CatalogItem {
  path: string
  label: string
  description: string
  section: string
}

interface Catalog {
  pages: Record<string, CatalogItem[]>
}

interface UserRow {
  id: string
  email: string
  name?: string
  role?: string
}

interface Permission {
  resource_path: string
  grants: string[]
  denies: string[]
}

const badgeColors: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  DEAN: "bg-amber-100 text-amber-700",
  FACULTY: "bg-emerald-100 text-emerald-700",
  STUDENT: "bg-blue-100 text-blue-700",
  GUEST: "bg-surface text-secondary",
}

const TABS = [
  { key: "rbac", label: "RBAC" },
  { key: "user-permissions", label: "User Permissions" },
]

function AdminAccessConfigPageInner({ readOnly }: { readOnly?: boolean }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get("tab") || "rbac"

  return (
    <div className="w-full space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-primary">Access Configuration</h1>
        <p className="text-xs text-tertiary mt-1">
          Manage role-based access and user-specific permission grants.
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-surface-tertiary rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              router.push(tab.key === "rbac" ? "/admin/access-config" : `/admin/access-config?tab=${tab.key}`)
            }}
            className={`shrink-0 text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-surface text-amber-600 shadow-ios-sm"
                : "text-tertiary hover:text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "rbac" ? <RBACTab readOnly={readOnly} /> : <UserPermissionsTab readOnly={readOnly} />}
    </div>
  )
}

function RBACTab({ readOnly }: { readOnly?: boolean }) {
  const [groups, setGroups] = useState<GroupAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [error, setError] = useState("")

  const loadGroups = () => {
    setError("")
    return fetch("/api/admin/access-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        if (data.groups) setGroups(data.groups)
      })
      .catch((err) => {
        setError(err.message || "Failed to load groups")
      })
  }

  useEffect(() => {
    loadGroups().finally(() => setLoading(false))
  }, [])

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
      <div className="space-y-4">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => { setLoading(true); loadGroups().finally(() => setLoading(false)) }} />
  }

  return (
    <div className="space-y-6">
      <div className="card p-4 space-y-3">
        <label className="text-xs font-semibold text-secondary">New Group</label>
        <div className="flex items-center gap-3">
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
            placeholder="e.g. COORDINATOR"
            className="input text-xs flex-1 min-w-0 px-3 py-2 rounded-lg border border-strong"
            disabled={readOnly}
          />
          <button
            onClick={handleAddGroup}
            disabled={creating || !newGroupName.trim() || readOnly}
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 transition-colors shrink-0"
          >
            {creating ? "Adding\u2026" : "Add Group"}
          </button>
        </div>
        {readOnly && <p className="text-[10px] text-tertiary">Only ADMIN can add or modify groups.</p>}
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-tertiary text-center py-8">No access groups found. Create one above.</p>
      )}

      <div className="space-y-3">
        {groups.map((group) => {
          const badgeColor = badgeColors[group.groupName] || "bg-surface text-secondary"
          return (
            <Link
              key={group.groupName}
              href={`/admin/access-config/${group.groupName}`}
              className="block card p-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${badgeColor}`}>
                    {group.groupName}
                  </span>
                  <span className="text-xs text-tertiary">Access Group</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-tertiary">
                  <span>{group.pages.length} pages</span>
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

function prim(roles: string): string {
  if (!roles) return "GUEST"
  const p = ["ADMIN", "DEAN", "FACULTY", "STUDENT", "GUEST"]
  for (const r of p) { if (roles.split("|").includes(r)) return r }
  return "GUEST"
}

function UserPermissionsTab({ readOnly }: { readOnly?: boolean }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [pageApiMap, setPageApiMap] = useState<Record<string, PageApiEntry> | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sidebarFilter, setSidebarFilter] = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()).catch(() => ({ users: [] })),
      fetch("/api/admin/access-config").then((r) => r.json()).catch(() => ({})),
    ])
      .then(([usersData, configData]) => {
        setUsers(usersData.users ?? [])
        if (configData.catalog) setCatalog(configData.catalog)
        if (configData.pageApiMap) setPageApiMap(configData.pageApiMap)
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredUsers = search.trim()
    ? users.filter((u) => (u.name || "").toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    : []

  const loadPermissions = useCallback(async (userId: string) => {
    const perms = await fetch(`/api/admin/user-permissions/${userId}`).then((r) => r.json())
    setPermissions(Array.isArray(perms) ? perms : [])
  }, [])

  const handleSelectUser = (user: UserRow) => { setSelectedUser(user); loadPermissions(user.id); setSaved(false) }

  const isSelectedUserAdmin = selectedUser ? prim(selectedUser.role ?? "") === "ADMIN" : false

  const togglePermission = (path: string) => {
    if (isSelectedUserAdmin && path.startsWith("/admin")) return
    setPermissions((prev) => {
      const existing = prev.find((p) => p.resource_path === path)
      if (!existing) {
        return [...prev, { resource_path: path, grants: ["access"], denies: [] }]
      }
      if (existing.grants.includes("access")) {
        return prev.map((p) =>
          p.resource_path === path ? { ...p, grants: [], denies: ["access"] } : p
        )
      }
      return prev.filter((p) => p.resource_path !== path)
    })
  }

  const handleSave = async () => {
    if (!selectedUser) return
    setSaving(true); setSaved(false)
    try {
      const res = await fetch(`/api/admin/user-permissions/${selectedUser.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(permissions),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
      else { const d = await res.json(); alert(d.error || "Failed to save") }
    } finally { setSaving(false) }
  }

  const permState = (path: string): "granted" | "denied" | "inherit" => {
    const isAdminUser = selectedUser ? prim(selectedUser.role ?? "") === "ADMIN" : false
    if (isAdminUser && path.startsWith("/admin")) return "granted"
    const perm = permissions.find((p) => p.resource_path === path)
    if (perm?.denies.includes("access")) return "denied"
    if (perm?.grants.includes("access")) return "granted"
    return "inherit"
  }

  const isApiPath = (p: string) => p.startsWith("/api/")

  interface TreeNode {
    path: string
    label: string
    children: TreeNode[]
  }

  interface TreeRow {
    path: string
    label: string
    depth: number
    isLast: boolean
    connectors: boolean[]
  }

  const buildTree = (items: CatalogItem[]): TreeNode[] => {
    const map = new Map<string, TreeNode>()
    const sorted = [...items].sort((a, b) => {
      const aDepth = a.path.split("/").length
      const bDepth = b.path.split("/").length
      if (aDepth !== bDepth) return aDepth - bDepth
      return a.path.localeCompare(b.path)
    })
    const roots: TreeNode[] = []
    for (const item of sorted) {
      const node: TreeNode = { path: item.path, label: item.label, children: [] }
      map.set(item.path, node)
      const slashIdx = item.path.lastIndexOf("/")
      const parentPath = slashIdx > 0 ? item.path.substring(0, slashIdx) : ""
      const parent = map.get(parentPath)
      if (parent) {
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    }
    return roots
  }

  const flattenTree = (nodes: TreeNode[], conn: boolean[] = []): TreeRow[] => {
    const rows: TreeRow[] = []
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const isLast = i === nodes.length - 1
      rows.push({ path: node.path, label: node.label, depth: conn.length, isLast, connectors: conn })
      if (node.children.length > 0) {
        rows.push(...flattenTree(node.children, [...conn, !isLast]))
      }
    }
    return rows
  }

  if (loading) {
    return <div className="space-y-4"><Skeleton variant="card" /></div>
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0 space-y-6 order-1 lg:order-2">
        <div className="card p-4">
          <label className="text-xs font-semibold text-secondary">Search user</label>
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); if (selectedUser) { setSelectedUser(null); setPermissions([]); setSaved(false) } }}
            placeholder="Search by name or email..." className="input text-xs w-full mt-1 px-3 py-2 rounded-lg border border-strong" />
        </div>

        {readOnly && (
          <p className="text-[10px] text-tertiary text-center">View-only mode. Only ADMIN can modify permissions.</p>
        )}

        {!selectedUser && !search.trim() && (
          <p className="text-sm text-tertiary text-center py-8">Search for a user above, then toggle paths to grant or restrict access.</p>
        )}

        {!selectedUser && search.trim() && filteredUsers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-tertiary font-semibold">{filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} found</p>
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <button key={user.id} onClick={() => handleSelectUser(user)}
                  className="w-full text-left card p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{user.name || user.email}</span>
                      {user.name && <span className="text-xs text-tertiary ml-2">{user.email}</span>}
                    </div>
                    <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!selectedUser && search.trim() && filteredUsers.length === 0 && (
          <p className="text-sm text-tertiary text-center py-8">No users found matching &ldquo;{search}&rdquo;</p>
        )}

        {selectedUser && (
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <button onClick={() => { setSelectedUser(null); setPermissions([]); setSaved(false) }} className="text-xs text-gold-600 hover:underline">&larr; Back to search</button>
                <h3 className="text-sm font-semibold mt-2">{selectedUser.name || selectedUser.email}</h3>
                {selectedUser.name && <p className="text-xs text-tertiary">{selectedUser.email}</p>}
              </div>
            </div>
            <div>
              <p className="text-xs text-tertiary">
                <strong>Priority:</strong> Toggling a path explicitly overrides the user&apos;s role-based access.
                <strong> Inherit</strong> = use role config, <strong>Granted</strong> = force allow, <strong>Revoked</strong> = force deny.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-1 border-t border-default">
              {saved && <span className="text-xs font-semibold text-emerald-600">Saved</span>}
              <SubmitButton onClick={handleSave} variant="primary" className="text-xs font-semibold px-4 py-2 rounded-lg" disabled={saving || readOnly}>
                {saving ? "Saving\u2026" : "Save Changes"}
              </SubmitButton>
            </div>
          </div>
        )}
      </div>

      <aside className="w-full lg:w-96 shrink-0 order-2 lg:order-1">
        <div className="card p-4 space-y-3">
          <input type="text" value={sidebarFilter} onChange={(e) => setSidebarFilter(e.target.value)}
            placeholder="Search pages..." className="input text-xs w-full px-3 py-2 rounded-lg border border-strong" />
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto space-y-4">
            {catalog && (() => {
              const bySection = new Map<string, CatalogItem[]>()
              for (const items of Object.values(catalog.pages)) {
                for (const item of items) {
                  if (isApiPath(item.path)) continue
                  const section = item.section || "Other"
                  if (!bySection.has(section)) bySection.set(section, [])
                  bySection.get(section)!.push(item)
                }
              }
              const sectionOrder = ["Root", "Dashboard", "Data", "Reports", "Evaluations", "Hidden"]
              const sectionColors: Record<string, string> = {
                Root: "text-slate-500", Dashboard: "text-purple-500", Data: "text-blue-500",
                Reports: "text-amber-500", Evaluations: "text-emerald-500", Hidden: "text-red-400",
              }
              return sectionOrder.flatMap((section) => {
                const items = bySection.get(section)
                if (!items) return []
                const filtered = items.filter((item) => {
                  if (!sidebarFilter.trim()) return true
                  const q = sidebarFilter.toLowerCase()
                  const entry = pageApiMap?.[item.path]
                  const labelMatch = entry?.label.toLowerCase().includes(q)
                  const pathMatch = item.path.toLowerCase().includes(q)
                  const apiMatch = entry?.apis.some((a) => a.toLowerCase().includes(q))
                  return labelMatch || pathMatch || apiMatch
                })
                if (filtered.length === 0) return []
                return (
                  <div key={section}>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${sectionColors[section] || "text-tertiary"} mb-1`}>{section}</p>
                    <div className="space-y-0.5">
                      {(() => {
                        const tree = buildTree(filtered)
                        const rows = flattenTree(tree)
                        return rows.map((row) => {
                          const ps = permState(row.path)
                          const isAdminLocked = isSelectedUserAdmin && row.path.startsWith("/admin")
                          const entry = pageApiMap?.[row.path]
                          const apis = entry?.apis ?? []
                          return (
                            <div key={row.path}>
                              <div className="flex items-center gap-1.5 py-0.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                {row.depth > 0 && (
                                  <span className="text-[10px] text-slate-300 dark:text-slate-600 font-mono shrink-0 whitespace-pre select-none">
                                    {row.connectors.map((c) => c ? "│   " : "    ").join("")}
                                    {row.isLast ? "└── " : "├── "}
                                  </span>
                                )}
                                <button
                                  disabled={!selectedUser || isAdminLocked || readOnly}
                                  onClick={() => togglePermission(row.path)}
                                  className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold transition-colors ${
                                    ps === "granted" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 ring-1 ring-emerald-500/40" :
                                    ps === "denied" ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 ring-1 ring-red-500/40" :
                                    "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                                  }`}
                                  title={isAdminLocked ? "Always granted for ADMIN role" : `Click to change (${ps})`}
                                >
                                  {ps.toUpperCase()}
                                </button>
                                <span className="text-[11px] font-medium text-primary flex-1 min-w-0 truncate ml-1">{entry?.label ?? row.path}</span>
                              </div>
                              {apis.length > 0 && (
                                <div className="ml-9 space-y-0.5">
                                  {apis.map((apiPath) => {
                                    const aps = permState(apiPath)
                                    const isApiLocked = isSelectedUserAdmin && apiPath.startsWith("/admin")
                                    return (
                                      <div key={apiPath} className="flex items-center gap-1.5 py-0.5">
                                        <button
                                          disabled={!selectedUser || isApiLocked || readOnly}
                                          onClick={() => togglePermission(apiPath)}
                                          className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-px rounded-full text-[8px] font-bold transition-colors ${
                                            aps === "granted" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 ring-1 ring-emerald-500/40" :
                                            aps === "denied" ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 ring-1 ring-red-500/40" :
                                            "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                                          }`}
                                        >
                                          {aps.toUpperCase()}
                                        </button>
                                        <span className="text-[10px] text-tertiary font-mono truncate">{apiPath}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      </aside>
    </div>
  )
}

export default function AdminAccessConfigPage() {
  const [accessState, setAccessState] = useState<"loading" | "granted" | "readonly">("loading")

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (!j.user) { setAccessState("readonly"); return }
        const role = j.user.role ?? ""
        setAccessState(role.split("|").includes("ADMIN") ? "granted" : "readonly")
      })
      .catch(() => setAccessState("readonly"))
  }, [])

  if (accessState === "loading") {
    return (
      <div className="w-full pb-12">
        <Skeleton variant="card" />
      </div>
    )
  }

  return (
    <Suspense fallback={<Skeleton variant="card" />}>
      <AdminAccessConfigPageInner readOnly={accessState === "readonly"} />
    </Suspense>
  )
}
