"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Skeleton from "@/components/ui/Skeleton"
import SubmitButton from "@/components/ui/SubmitButton"
import LockedTab from "@/components/ui/LockedTab"

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

function AdminAccessConfigPageInner() {
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

      {activeTab === "rbac" ? <RBACTab /> : <UserPermissionsTab />}
    </div>
  )
}

function RBACTab() {
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
  }

  useEffect(() => {
    loadGroups()
    Promise.resolve().then(() => setLoading(false))
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
          />
          <button
            onClick={handleAddGroup}
            disabled={creating || !newGroupName.trim()}
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 transition-colors shrink-0"
          >
            {creating ? "Adding\u2026" : "Add Group"}
          </button>
        </div>
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

const PAGE_ACCESS: Record<string, string[]> = {
  ADMIN: [
    "/", "/admin", "/admin/data-management", "/admin/users", "/admin/users/deleted",
    "/admin/access-config", "/admin/user-permissions", "/admin/departments", "/admin/reports",
    "/admin/reports/health", "/admin/reports/demand", "/admin/reports/responsiveness",
    "/admin/reports/backlog", "/admin/reports/evaluation-results",
    "/admin/etl-hub", "/admin/evaluations",
    "/admin/data/users", "/admin/data/academic-infrastructure",
    "/faq",
  ],
  DEAN: [
    "/", "/dean", "/dean/upload", "/dean/departments",
    "/dean/reports", "/dean/reports/evaluation-results",
    "/dean/evaluations", "/dean/evaluations/rubrics",
    "/dean/data/users", "/dean/data/academic-infrastructure",
    "/dean/etl-hub",
    "/faculty/meetings", "/faculty/availability", "/faculty/reports",
  ],
  FACULTY: [
    "/", "/faculty", "/faculty/meetings", "/faculty/availability", "/faculty/upload",
    "/faculty/evaluations", "/faculty/evaluations/results",
  ],
  STUDENT: [
    "/", "/student", "/student/book", "/student/meetings", "/student/history",
    "/student/evaluations",
  ],
  GUEST: [],
}

function cat(p: string): string {
  if (p === "/") return "General"
  if (p.startsWith("/api/")) return "API"
  if (p.startsWith("/admin")) return "Admin"
  if (p.startsWith("/student")) return "Student"
  if (p.startsWith("/faculty")) return "Faculty"
  if (p.startsWith("/dean")) return "Dean"
  if (p.startsWith("/faq")) return "Information"
  return "Other"
}

function lab(p: string): string {
  const m: Record<string, string> = {
    "/": "Dashboard (root)", "/admin": "Admin Dashboard", "/admin/users": "Manage Users",
    "/admin/access-config": "Access Configuration", "/admin/user-permissions": "User Permissions",
    "/admin/data-management": "Data Management", "/admin/data/academic-infrastructure": "Academic Infrastructure",
    "/admin/reports/health": "Health Report", "/admin/reports/demand": "Demand Report",
    "/admin/reports/responsiveness": "Responsiveness Report", "/admin/reports/backlog": "Backlog Report",
    "/admin/reports/evaluation-results": "Evaluation Results", "/admin/etl-hub": "ETL Hub",
    "/admin/evaluations": "Evaluations", "/admin/data/users": "Data Users",
    "/student": "Student Dashboard", "/student/book": "Book Consultation",
    "/student/meetings": "Student Consultations", "/student/history": "Consultation History",
    "/faculty": "Faculty Dashboard", "/faculty/meetings": "Faculty Meetings",
    "/faculty/availability": "Availability Settings", "/faculty/upload": "Import Students",
    "/faculty/reports": "Department Reports", "/faculty/evaluations/results": "Evaluation Results",
    "/dean": "Dean Dashboard", "/dean/upload": "Import Users", "/dean/departments": "Departments",
    "/dean/reports": "Reports", "/dean/reports/evaluation-results": "Evaluation Results",
    "/faq": "FAQ", "/403": "Forbidden",
    "/api/import/students": "Import Students (API)", "/api/import/faculties": "Import Faculties (API)",
    "/api/import/preview": "Import Preview (API)", "/api/admin/users": "Manage Users (API)",
    "/api/admin/departments": "Departments (API)", "/api/admin/faculty-subjects": "Faculty-Subject (API)",
    "/api/admin/student-enrollments": "Student Enrollments (API)",
    "/api/admin/student-enrollments/csv": "Bulk Import Students (API)",
    "/api/data/evaluation-mappings": "Evaluation Mappings (API)",
    "/api/admin/access-config": "Access Config (API)", "/api/admin/user-permissions": "User Permissions (API)",
  }
  return m[p] || p.split("/").filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" / ") || p
}

function prim(roles: string): string {
  if (!roles) return "GUEST"
  const p = ["ADMIN", "DEAN", "FACULTY", "STUDENT", "GUEST"]
  for (const r of p) { if (roles.split("|").includes(r)) return r }
  return "GUEST"
}

function UserPermissionsTab() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [, setCatalog] = useState<Catalog | null>(null)
  const [allPaths, setAllPaths] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sidebarFilter, setSidebarFilter] = useState("")
  const [pageTab, setPageTab] = useState<"pages" | "api">("pages")

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()).catch(() => ({ users: [] })),
      fetch("/api/admin/access-config").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/user-permissions/paths").then((r) => r.json()).catch(() => ({ paths: [] })),
    ])
      .then(([usersData, configData, pathsData]) => {
        setUsers(usersData.users ?? [])
        if (configData.catalog) setCatalog(configData.catalog)
        const s = new Set<string>()
        if (configData.catalog?.pages) {
          for (const items of Object.values(configData.catalog.pages) as CatalogItem[][]) {
            for (const item of items) s.add(item.path)
          }
        }
        for (const pages of Object.values(PAGE_ACCESS)) {
          for (const p of pages) s.add(p)
        }
        for (const p of (pathsData.paths ?? [])) s.add(p)
        setAllPaths(Array.from(s).sort())
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

  const togglePermission = (path: string) => {
    setPermissions((prev) => {
      const existing = prev.find((p) => p.resource_path === path)
      if (existing && existing.grants.includes("access")) return prev.filter((p) => p.resource_path !== path)
      const filtered = prev.filter((p) => p.resource_path !== path)
      return [...filtered, { resource_path: path, grants: ["access"], denies: [] }]
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

  const eff = (path: string): "granted" | "denied" | "none" => {
    const perm = permissions.find((p) => p.resource_path === path)
    if (perm?.denies.includes("access")) return "denied"
    if (perm?.grants.includes("access")) return "granted"
    if (selectedUser?.role) {
      const role = prim(selectedUser.role)
      const rolePages = PAGE_ACCESS[role]
      if (rolePages?.some((p) => path === p || path.startsWith(p + "/"))) return "granted"
    }
    return "none"
  }

  const groupedPaths = allPaths.reduce<Record<string, string[]>>((acc, p) => {
    const isApi = p.startsWith("/api/")
    if (pageTab === "api" && !isApi) return acc
    if (pageTab === "pages" && isApi) return acc
    const c = cat(p)
    if (!acc[c]) acc[c] = []
    if (!sidebarFilter || p.toLowerCase().includes(sidebarFilter.toLowerCase()) || lab(p).toLowerCase().includes(sidebarFilter.toLowerCase())) {
      acc[c].push(p)
    }
    return acc
  }, {})

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

        {!selectedUser && !search.trim() && (
          <p className="text-sm text-tertiary text-center py-8">Search for a user above, then toggle paths in the sidebar to grant or restrict access.</p>
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
                <strong>Priority:</strong> Checked paths are explicitly granted to this user (Layer&nbsp;1),
                overriding role-based access config (Layer&nbsp;2) and defaults (Layer&nbsp;3).
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-1 border-t border-default">
              {saved && <span className="text-xs font-semibold text-emerald-600">Saved</span>}
              <SubmitButton onClick={handleSave} variant="primary" className="text-xs font-semibold px-4 py-2 rounded-lg" disabled={saving}>
                {saving ? "Saving\u2026" : "Save Changes"}
              </SubmitButton>
            </div>
          </div>
        )}
      </div>

      <aside className="w-full lg:w-72 shrink-0 order-2 lg:order-1">
        <div className="card p-4 space-y-3">
          <div className="flex gap-1 p-1 bg-surface-tertiary rounded-xl">
            <button
              onClick={() => setPageTab("pages")}
              className={`shrink-0 text-xs font-semibold px-4 py-1.5 rounded-lg whitespace-nowrap transition-all duration-200 flex-1 ${
                pageTab === "pages"
                  ? "bg-surface text-amber-600 shadow-ios-sm"
                  : "text-tertiary hover:text-secondary"
              }`}
            >
              Pages
            </button>
            <button
              onClick={() => setPageTab("api")}
              className={`shrink-0 text-xs font-semibold px-4 py-1.5 rounded-lg whitespace-nowrap transition-all duration-200 flex-1 ${
                pageTab === "api"
                  ? "bg-surface text-amber-600 shadow-ios-sm"
                  : "text-tertiary hover:text-secondary"
              }`}
            >
              API
            </button>
          </div>
          <input type="text" value={sidebarFilter} onChange={(e) => setSidebarFilter(e.target.value)}
            placeholder="Search paths..." className="input text-xs w-full px-3 py-2 rounded-lg border border-strong" />
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto space-y-3">
            {Object.entries(groupedPaths).map(([category, paths]) => (
              <div key={category}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary mb-1">{category}</p>
                <div className="space-y-0.5">
                  {paths.map((path) => {
                    const perm = permissions.find((p) => p.resource_path === path)
                    const granted = perm?.grants.includes("access") ?? false
                    const effective = eff(path)
                    return (
                      <label key={path} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs hover:bg-surface-hover ${granted ? "bg-amber-50 dark:bg-amber-900/10" : ""}`}>
                        <input type="checkbox" checked={granted} onChange={() => togglePermission(path)}
                          disabled={!selectedUser} className="rounded border-strong text-gold-600 focus:ring-gold-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="block truncate">{lab(path)}</span>
                          <span className="block text-[10px] text-tertiary font-mono truncate" title={path}>{path}</span>
                        </div>
                        {selectedUser && (
                          <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-px rounded-full ${effective === "granted" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : effective === "denied" ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400" : "bg-surface text-tertiary"}`}>
                            {effective === "granted" ? "ON" : effective === "denied" ? "OFF" : "\u2014"}
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}

export default function AdminAccessConfigPage() {
  const [accessState, setAccessState] = useState<"loading" | "granted" | "locked">("loading")

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (!j.user) { setAccessState("locked"); return }
        const role = j.user.role ?? ""
        setAccessState(role.split("|").includes("ADMIN") ? "granted" : "locked")
      })
      .catch(() => setAccessState("locked"))
  }, [])

  if (accessState === "loading") {
    return (
      <div className="w-full pb-12">
        <Skeleton variant="card" />
      </div>
    )
  }

  if (accessState === "locked") {
    return (
      <div className="w-full pb-12">
        <LockedTab endpoint="/admin/access-config" />
      </div>
    )
  }

  return (
    <Suspense fallback={<Skeleton variant="card" />}>
      <AdminAccessConfigPageInner />
    </Suspense>
  )
}
