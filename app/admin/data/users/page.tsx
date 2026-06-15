"use client"

import { useRef, useState, useMemo, useEffect } from "react"
import Skeleton from "@/components/ui/Skeleton"
import IosButton from "@/components/ui/IosButton"
import LockedTab from "@/components/ui/LockedTab"
import ErrorState from "@/components/ui/ErrorState"
import ErrorBoundary from "@/components/ui/ErrorBoundary"
import { useApiGet } from "@/lib/api/client"
import { hasRole } from "@/lib/utils/roles"
import type { UserData, DepartmentData } from "@/lib/types"

const PAGE_SIZES = [10, 25, 50]

const USER_TYPES = ["STUDENT", "FACULTY"]
const GRANTS = ["ADMIN", "DEAN"]

const typeColors: Record<string, string> = {
  FACULTY: "bg-emerald-100 text-emerald-700",
  STUDENT: "bg-blue-100 text-blue-700",
}
const grantColors: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  DEAN: "bg-amber-100 text-amber-700",
}

function getUserType(role: string): string {
  if (hasRole(role, "FACULTY")) return "FACULTY"
  if (hasRole(role, "STUDENT")) return "STUDENT"
  return "FACULTY"
}

function getGrant(role: string): string {
  for (const g of GRANTS) {
    if (hasRole(role, g)) return g
  }
  return ""
}

function buildRoleStr(userType: string | null, grant: string): string {
  if (!userType) return grant || ""
  return grant ? `${userType}|${grant}` : userType
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [departments, setDepartments] = useState<DepartmentData[]>([])
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [roleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [deptFilter, setDeptFilter] = useState("all")
  const [excludeStudents, setExcludeStudents] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [roleMenuOpen, setRoleMenuOpen] = useState<string | null>(null)
  const [lockedEndpoint, setLockedEndpoint] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  // Edit modal state
  const [editUser, setEditUser] = useState<UserData | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editDept, setEditDept] = useState("")
  const [editUserType, setEditUserType] = useState("")
  const [editGrant, setEditGrant] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  // Create modal state
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createEmail, setCreateEmail] = useState("")
  const [createUserType, setCreateUserType] = useState("")
  const [createGrant, setCreateGrant] = useState("")
  const [createDept, setCreateDept] = useState("")
  const [createError, setCreateError] = useState("")
  const [createSaving, setCreateSaving] = useState(false)
  const [createSendInvite, setCreateSendInvite] = useState(true)
  const [createResult, setCreateResult] = useState<string | null>(null)

  const { data: adminData, isLoading, error: apiError } = useApiGet<{ users: UserData[]; departments: DepartmentData[] }>("/api/admin/users")

  useEffect(() => {
    Promise.resolve().then(() => {
      if (apiError) {
        if (apiError.message?.includes("Forbidden")) setLockedEndpoint("/api/admin/users")
        else setErrorMessage(apiError.message)
      }
    })
  }, [apiError])

  useEffect(() => {
    if (adminData?.users && !users.length) setUsers(adminData.users) // eslint-disable-line react-hooks/set-state-in-effect
    if (adminData?.departments && !departments.length) setDepartments(adminData.departments)
  }, [adminData, users.length, departments.length])

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0) // Reset to first page on new search
    }, 300)
    return () => clearTimeout(handler)
  }, [search])

  const pendingRef = useRef(false)

  const handleToggle = async (userId: string, currentStatus: boolean) => {
    if (pendingRef.current) return
    pendingRef.current = true
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isDisabled: !currentStatus }),
      })
      if (res.status === 403) { setLockedEndpoint("/api/admin/users"); return }
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isDisabled: !currentStatus } : u))
        )
      }
    } finally {
      pendingRef.current = false
    }
  }

  const handleRoleChange = async (userId: string, newRoles: string[]) => {
    setChangingRole(userId)
    const pipeRoles = newRoles.join("|")
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: pipeRoles }),
      })
      if (res.status === 403) { setLockedEndpoint("/api/admin/users"); return }
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: pipeRoles } : u))
        )
      }
    } finally {
      setChangingRole(null)
    }
  }

  const openEditModal = (u: UserData) => {
    setEditUser(u)
    setEditName(u.name)
    setEditEmail(u.email)
    setEditDept(u.departmentId || "")
    setEditUserType(getUserType(u.role))
    setEditGrant(getGrant(u.role))
  }

  const handleEditSave = async () => {
    if (!editUser) return
    setEditSaving(true)
    try {
      const body: Record<string, unknown> = { userId: editUser.id }
      if (editName !== editUser.name) body.name = editName
      if (editEmail !== editUser.email) body.email = editEmail
      if ((editDept || null) !== editUser.departmentId) body.departmentId = editDept || null
      const editRolesStr = buildRoleStr(editUserType, editGrant)
      if (editRolesStr !== editUser.role) body.role = editRolesStr

      if (Object.keys(body).length <= 1) {
        setEditUser(null)
        return
      }

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.status === 403) { setLockedEndpoint("/api/admin/users"); return }
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setUsers((prev) => prev.map((u) => (u.id === editUser.id ? data.user : u)))
        }
        setEditUser(null)
      } else {
        const text = await res.text()
        try {
          const data = JSON.parse(text)
          setErrorMessage(data.error || "Failed to update user")
        } catch {
          setErrorMessage("Failed to update user")
        }
      }
    } finally {
      setEditSaving(false)
    }
  }

  const handleResetOnboarding = async (userId: string) => {
    if (!confirm("Reset onboarding version to 0 for this user?")) return
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, onboardingVersion: 0 }),
      })
      if (res.status === 403) { setLockedEndpoint("/api/admin/users"); return }
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setUsers((prev) => prev.map((u) => (u.id === userId ? data.user : u)))
        }
      } else {
        const text = await res.text()
        try {
          const data = JSON.parse(text)
          setErrorMessage(data.error || "Failed to reset onboarding")
        } catch {
          setErrorMessage("Failed to reset onboarding")
        }
      }
    } catch { }
  }

  const handleCreateUser = async () => {
    setCreateError("")
    if (!createName.trim() || !createEmail.trim()) {
      setCreateError("Name and email are required")
      return
    }
    if (!createUserType) {
      setCreateError("Select a user type")
      return
    }
    const email = createEmail.trim().toLowerCase()
    if (createUserType === "FACULTY" && !email.endsWith("@lyceumalabang.edu.ph")) {
      setCreateError("Faculty email must end with @lyceumalabang.edu.ph")
      return
    }
    if (createUserType === "STUDENT" && !email.endsWith("@itmlyceumalabang.onmicrosoft.com")) {
      setCreateError("Student email must end with @itmlyceumalabang.onmicrosoft.com")
      return
    }
    setCreateSaving(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          email,
          role: buildRoleStr(createUserType, createGrant),
          departmentId: createDept || null,
        }),
      })
      if (res.status === 403) { setLockedEndpoint("/api/admin/users"); return }
      const data = await res.json()
      if (res.ok) {
        setUsers((prev) => [data.user, ...prev])
        setShowCreate(false)
        setCreateName("")
        setCreateEmail("")
        setCreateUserType("")
        setCreateGrant("")
        setCreateDept("")
        if (createSendInvite) {
          try {
            const inviteRes = await fetch("/api/auth/activate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            })
            if (inviteRes.status === 403) { setLockedEndpoint("/api/auth/activate"); return }
            if (inviteRes.ok) {
              setCreateResult("User created and invite sent.")
            } else {
              const inviteData = await inviteRes.json().catch(() => ({}))
              setCreateResult(`User created but invite failed: ${inviteData.error || "Unknown error"}`)
            }
          } catch {
            setCreateResult("User created but invite failed to send.")
          }
        } else {
          setCreateResult("User created.")
        }
      } else {
        setCreateError(data.error || "Failed to create user")
      }
    } finally {
      setCreateSaving(false)
    }
  }

  const deptMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const d of departments) map[d.id] = d.name
    return map
  }, [departments])

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && !hasRole(u.role, roleFilter)) return false
      if (excludeStudents && hasRole(u.role, "STUDENT")) return false
      if (statusFilter === "active" && u.isDisabled) return false
      if (statusFilter === "disabled" && !u.isDisabled) return false
      if (statusFilter === "activated" && !u.hasLoggedInBefore) return false
      if (statusFilter === "pending" && u.hasLoggedInBefore) return false
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase()
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      }

      
      return true
    })
  }, [users, roleFilter, statusFilter, debouncedSearch,excludeStudents])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const paginated = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize)

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Manage Users</h1>
        </div>
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <Skeleton variant="text" className="w-1/4 h-6" />
            <Skeleton variant="text" className="w-1/2" />
            <Skeleton variant="text" className="w-full" />
            <Skeleton variant="text" className="w-3/4" />
          </div>
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      </div>
    )
  }

  if (lockedEndpoint) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4">
        <LockedTab endpoint={lockedEndpoint} />
      </div>
    )
  }

  return (
    <ErrorBoundary>
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold text-primary">Manage Users</h1>
        <div className="flex items-center gap-3">
          <p className="text-xs text-tertiary">{filtered.length} user(s)</p>
          <IosButton onClick={() => setShowCreate(true)} variant="primary" className="text-xs font-semibold px-3 py-3 sm:py-1.5 rounded-lg">
            + Create User
          </IosButton>
        </div>
      </div>

      {errorMessage ? (
        <div className="px-4">
          <ErrorState message={errorMessage} onRetry={() => { setErrorMessage(""); window.location.reload() }} />
        </div>
      ) : (<>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0 w-full sm:w-auto sm:min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="input text-xs pl-9 w-full"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="input text-xs py-1.5 flex-1 sm:flex-none sm:w-auto min-w-0">
              <option value="all">All Depts</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input text-xs py-1.5 flex-1 sm:flex-none sm:w-auto min-w-0">
              <option value="all">All</option>
              <option value="disabled">Disabled</option>
              <option value="activated">Activated</option>
              <option value="pending">Pending</option>
            </select>
            <label className="flex items-center gap-1.5 text-[11px] shrink-0 cursor-pointer" title="Exclude students from view">
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={excludeStudents} onChange={(e) => setExcludeStudents(e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-5 rounded-full bg-gray-200 peer-checked:bg-[var(--color-brand-600)] transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white peer-checked:translate-x-4 transition-transform" />
              </div>
              Exclude Students
            </label>
          </div>
        </div>

      <div className="card bg-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-default bg-surface"><h3 className="text-sm font-bold text-primary">Users Directory</h3></div>

        {/* Empty state */}
        {paginated.length === 0 ? (
          <p className="text-sm text-tertiary text-center py-8">No users found.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="desktop-only overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-surface-dim text-left text-[10px] font-bold text-tertiary uppercase tracking-wider border-b border-default sticky top-0">
                    <th className="p-2">User</th>
                    <th className="p-2">User Type / Grants</th>
                    <th className="p-2">Department</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Registered</th>
                    <th className="p-2">Activated</th>
                    <th className="p-2">Last Login</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((u) => {
                    const userType = getUserType(u.role)
                    const grant = getGrant(u.role)
                    const isDefaultAdmin = u.email === "admin@lyceumalabang.ph" || u.id === "a0000000-0000-0000-0000-000000000001"

                    return (
                      <tr key={u.id} className="border-b border-default hover:bg-surface-hover">
                        <td className="p-2">
                          <p className="text-primary font-medium">{u.name}</p>
                          <p className="text-tertiary text-xs">{u.email}</p>
                        </td>
                        <td className="p-2 relative">
                          <button
                            onClick={() => !isDefaultAdmin && setRoleMenuOpen(roleMenuOpen === u.id ? null : u.id)}
                            disabled={changingRole === u.id || isDefaultAdmin}
                            className={`inline-flex items-center gap-1 text-xs font-semibold ${isDefaultAdmin ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            <span className={`px-2 py-0.5 rounded-full border-0 ${typeColors[userType] || "bg-surface text-secondary"}`}>
                              {userType}
                            </span>
                            {grant && (
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${grantColors[grant] || "bg-surface text-tertiary border border-default"}`}>
                                {grant}
                              </span>
                            )}
                          </button>
                          {roleMenuOpen === u.id && (
                            <div className="absolute top-full left-0 mt-1 z-50 bg-surface border border-default rounded-lg shadow-lg p-3 min-w-[180px] space-y-3">
                              <div>
                                <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1">User Type</p>
                                <div className="flex gap-2">
                                  {USER_TYPES.map(t => (
                                    <label key={t} className="flex items-center gap-1 text-xs cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`type-${u.id}`}
                                        checked={userType === t}
                                        onChange={() => {
                                          handleRoleChange(u.id, [t])
                                        }}
                                        className="text-gold-600 focus:ring-gold-500"
                                      />
                                      {t}
                                    </label>
                                  ))}
                                </div>
                              </div>
                              {userType === "FACULTY" && (
                                <div>
                                <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1">Grant</p>
                                <div className="flex gap-2">
                                  {["", ...GRANTS].map(g => (
                                    <label key={g || "default"} className="flex items-center gap-1 text-xs cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`grant-${u.id}`}
                                        checked={grant === g}
                                        onChange={() => {
                                          handleRoleChange(u.id, g ? [userType, g] : [userType])
                                        }}
                                        className="text-gold-600 focus:ring-gold-500"
                                      />
                                      {g || "Default"}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                            <IosButton
                              onClick={() => setRoleMenuOpen(null)}
                              variant="primary"
                            >
                              Done
                            </IosButton>
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-xs text-tertiary">
                        {u.departmentId ? deptMap[u.departmentId] || "—" : "—"}
                      </td>
                      <td className="p-2">
                        {u.isDisabled ? (
                          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Disabled</span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </td>
                      <td className="p-2 text-tertiary text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="p-2">
                        {u.hasLoggedInBefore ? (
                          <span className="text-xs text-emerald-600">Yes</span>
                        ) : (
                          <span className="text-xs text-amber-600">Pending</span>
                        )}
                      </td>
                      <td className="p-2 text-tertiary text-xs">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-2">
                        {isDefaultAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-lg bg-surface text-tertiary border border-default">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Default
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <IosButton onClick={() => openEditModal(u)} variant="plain" size="xs">Edit</IosButton>
                            {!isDefaultAdmin && (
                              <IosButton onClick={() => handleToggle(u.id, u.isDisabled)} variant="plain" size="xs" className={u.isDisabled ? "!text-green-600" : "!text-red-500"}>
                                {u.isDisabled ? "Enable" : "Disable"}
                              </IosButton>
                            )}
                            {!u.hasLoggedInBefore && !isDefaultAdmin && (
                              <IosButton onClick={() => handleResetOnboarding(u.id)} variant="plain" size="xs" className="!text-red-500">Reset</IosButton>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mobile-only space-y-2.5">
            {paginated.map((u) => {
              const userType = getUserType(u.role)
              const grant = getGrant(u.role)
              const isDefaultAdmin = u.email === "admin@lyceumalabang.ph" || u.id === "a0000000-0000-0000-0000-000000000001"

              return (
                <div key={u.id} className="rounded-xl border border-default bg-surface p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-primary truncate">{u.name}</p>
                      <p className="text-xs text-tertiary truncate">{u.email}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.isDisabled ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50"}`}>
                      {u.isDisabled ? "Disabled" : "Active"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${typeColors[userType] || "bg-surface text-secondary"}`}>
                      {userType}
                    </span>
                    {grant && (
                      <span className={`px-1.5 py-0.5 rounded-full font-semibold ${grantColors[grant] || "bg-surface text-tertiary border border-default"}`}>
                        {grant}
                      </span>
                    )}
                    {!isDefaultAdmin && (
                      <button
                        onClick={() => setRoleMenuOpen(roleMenuOpen === u.id ? null : u.id)}
                        disabled={changingRole === u.id}
                        className="ml-auto text-tertiary hover:text-secondary transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {roleMenuOpen === u.id && (
                    <div className="bg-surface-muted rounded-lg p-3 space-y-2.5 border border-default">
                      <div>
                        <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1.5">User Type</p>
                        <div className="flex gap-3">
                          {USER_TYPES.map(t => (
                            <label key={t} className="flex items-center gap-1 text-xs cursor-pointer">
                              <input
                                type="radio"
                                name={`type-m-${u.id}`}
                                checked={userType === t}
                                onChange={() => handleRoleChange(u.id, [t])}
                                className="text-gold-600 focus:ring-gold-500"
                              />
                              {t}
                            </label>
                          ))}
                        </div>
                      </div>
                      {userType === "FACULTY" && (
                        <div>
                          <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Grant</p>
                          <div className="flex gap-3 flex-wrap">
                            {["", ...GRANTS].map(g => (
                              <label key={g || "default"} className="flex items-center gap-1 text-xs cursor-pointer">
                                <input
                                  type="radio"
                                  name={`grant-m-${u.id}`}
                                  checked={grant === g}
                                  onChange={() => handleRoleChange(u.id, g ? [userType, g] : [userType])}
                                  className="text-gold-600 focus:ring-gold-500"
                                />
                                {g || "Default"}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      <IosButton
                        onClick={() => setRoleMenuOpen(null)}
                        variant="primary"
                      >
                        Done
                      </IosButton>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <div><span className="text-tertiary">Dept:</span> <span className="text-secondary">{u.departmentId ? deptMap[u.departmentId] || "—" : "—"}</span></div>
                    <div><span className="text-tertiary">Registered:</span> <span className="text-secondary">{new Date(u.createdAt).toLocaleDateString()}</span></div>
                    <div>
                      <span className="text-tertiary">Activated:</span>
                      <span className={`ml-0.5 ${u.hasLoggedInBefore ? "text-emerald-600" : "text-amber-600"}`}>
                        {u.hasLoggedInBefore ? "Yes" : "Pending"}
                      </span>
                    </div>
                    <div><span className="text-tertiary">Last login:</span> <span className="text-secondary">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "—"}</span></div>
                  </div>

                  <div className="flex gap-2 pt-0.5">
                    {isDefaultAdmin ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-lg bg-surface text-tertiary border border-default">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Default
                      </span>
                    ) : (
                      <>
                        <IosButton onClick={() => openEditModal(u)} variant="plain" size="xs" className="flex-1">Edit</IosButton>
                        <IosButton onClick={() => handleToggle(u.id, u.isDisabled)} variant="plain" size="xs" className={`flex-1 ${u.isDisabled ? "!text-green-600" : "!text-red-500"}`}>
                          {u.isDisabled ? "Enable" : "Disable"}
                        </IosButton>
                        {!u.hasLoggedInBefore && (
                          <IosButton onClick={() => handleResetOnboarding(u.id)} variant="plain" size="xs" className="flex-1 !text-red-500">Reset</IosButton>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-3 px-3 sm:px-6 pb-3 border-t border-default">
            <div className="flex items-center gap-2 text-xs text-tertiary">
              <span className="hidden sm:inline">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="input text-xs w-auto py-1"
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs text-tertiary w-full sm:w-auto justify-between sm:justify-normal">
              <span>{safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, filtered.length)} of {filtered.length}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="p-2 rounded border border-default bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="p-2 rounded border border-default bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      </div>

      {/* Result notification */}
      {createResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center justify-between">
          <span>{createResult}</span>
          <button onClick={() => setCreateResult(null)} className="ml-3 text-current opacity-60 hover:opacity-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => !editSaving && setEditUser(null)}>
          <div className="bg-surface rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-primary">Edit User</h2>
            <p className="text-xs text-tertiary">{editUser.email}</p>

            <label className="block text-xs font-medium text-secondary">Name</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input text-sm w-full" />

            <label className="block text-xs font-medium text-secondary">Email</label>
            <input
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="input text-sm w-full"
              disabled={editUser.email === "admin@lyceumalabang.ph"}
            />

            <label className="block text-xs font-medium text-secondary">Department</label>
            <select value={editDept} onChange={(e) => setEditDept(e.target.value)} className="input text-sm w-full">
              <option value="">— None —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <label className="block text-xs font-medium text-secondary">User Type</label>
            <div className="flex gap-3">
              {USER_TYPES.map(t => (
                <label key={t} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="edit-user-type"
                    checked={editUserType === t}
                    onChange={() => {
                      setEditUserType(t)
                      setEditGrant("")
                    }}
                    className="text-gold-600 focus:ring-gold-500"
                  />
                  {t}
                </label>
              ))}
            </div>

            {editUserType === "FACULTY" && (
              <>
                <label className="block text-xs font-medium text-secondary">Grant</label>
                <div className="flex gap-3">
                  {["", ...GRANTS].map(g => (
                    <label key={g || "default"} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="edit-grant"
                        checked={editGrant === g}
                        onChange={() => setEditGrant(g)}
                        className="text-gold-600 focus:ring-gold-500"
                      />
                      {g || "Default"}
                    </label>
                  ))}
                </div>
              </>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <button
                onClick={() => handleResetOnboarding(editUser.id)}
                className="text-xs font-semibold text-red-600 hover:text-red-700 underline self-start sm:self-auto"
              >
                Reset Onboarding
              </button>
              <div className="flex gap-2">
                <IosButton
                  onClick={() => setEditUser(null)}
                  disabled={editSaving}
                  variant="gray"
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </IosButton>
                <IosButton onClick={handleEditSave} variant="primary" className="text-xs font-semibold px-4 py-3 sm:py-2 rounded-lg flex-1 sm:flex-none" disabled={editSaving}>
                  {editSaving ? "Saving..." : "Save"}
                </IosButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create User Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => !createSaving && setShowCreate(false)}>
          <div className="bg-surface rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-primary">Create User</h2>

            <label className="block text-xs font-medium text-secondary">Name *</label>
            <input value={createName} onChange={(e) => setCreateName(e.target.value)} className="input text-sm w-full" placeholder="Full name" />

            <label className="block text-xs font-medium text-secondary">Email *</label>
            <input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} className="input text-sm w-full" placeholder="email@example.com" type="email" />

            <label className="block text-xs font-medium text-secondary">User Type *</label>
            <div className="flex gap-3">
              {USER_TYPES.map(t => (
                <label key={t} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="create-user-type"
                    checked={createUserType === t}
                    onChange={() => {
                      setCreateUserType(t)
                      setCreateGrant("")
                      setCreateError("")
                    }}
                    className="text-gold-600 focus:ring-gold-500"
                  />
                  {t}
                </label>
              ))}
            </div>

            {createUserType === "FACULTY" && (
              <>
                <label className="block text-xs font-medium text-secondary">Grant</label>
                <div className="flex gap-3">
                  {["", ...GRANTS].map(g => (
                    <label key={g || "default"} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="create-grant"
                        checked={createGrant === g}
                        onChange={() => setCreateGrant(g)}
                        className="text-gold-600 focus:ring-gold-500"
                      />
                      {g || "Default"}
                    </label>
                  ))}
                </div>
              </>
            )}

            {createUserType === "FACULTY" && (
              <p className="text-[10px] text-tertiary">Email must end with <span className="font-mono font-semibold">@lyceumalabang.edu.ph</span></p>
            )}
            {createUserType === "STUDENT" && (
              <p className="text-[10px] text-tertiary">Email must end with <span className="font-mono font-semibold">@itmlyceumalabang.onmicrosoft.com</span></p>
            )}

            <label className="block text-xs font-medium text-secondary">Department</label>
            <select value={createDept} onChange={(e) => setCreateDept(e.target.value)} className="input text-sm w-full">
              <option value="">— None —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={createSendInvite}
                onChange={(e) => setCreateSendInvite(e.target.checked)}
                className="rounded border-slate-300 text-gold-600 focus:ring-gold-500"
              />
              Send invite email to this user
            </label>

            {createError && <p className="text-xs text-red-600">{createError}</p>}

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <IosButton
                onClick={() => { setShowCreate(false); setCreateError(""); setCreateResult(null) }}
                disabled={createSaving}
                variant="gray"
                className="w-full sm:w-auto"
              >
                Cancel
              </IosButton>
              <IosButton onClick={handleCreateUser} variant="primary" className="text-xs font-semibold px-4 py-3 sm:py-2 rounded-lg w-full sm:w-auto" disabled={createSaving}>
                {createSaving ? "Creating..." : "Create"}
              </IosButton>
            </div>
          </div>
        </div>
      )}
    </>)}
    </div>
    </ErrorBoundary>
  )
}
