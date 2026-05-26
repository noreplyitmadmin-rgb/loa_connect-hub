"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import Skeleton from "@/components/Skeleton"
import SubmitButton from "@/components/SubmitButton"

interface User {
  id: string
  name: string
  email: string
  role: string
  departmentId: string | null
  isDisabled: boolean
  hasLoggedInBefore: boolean
  lastLoginAt: string | null
  createdAt: string
}

interface Department {
  id: string
  name: string
  code: string
}

const PAGE_SIZES = [10, 25, 50]
const VALID_ROLES = ["STUDENT", "FACULTY", "DEAN", "ADMIN", "GUEST"]

const roleColors: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  DEAN: "bg-amber-100 text-amber-700",
  FACULTY: "bg-emerald-100 text-emerald-700",
  STUDENT: "bg-blue-100 text-blue-700",
  GUEST: "bg-slate-100 text-slate-600",
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [deptFilter, setDeptFilter] = useState("all")
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [changingRole, setChangingRole] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.users) setUsers(data.users)
        if (data.departments) setDepartments(data.departments)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isDisabled: !currentStatus } : u))
        )
      }
    } finally {
      pendingRef.current = false
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setChangingRole(userId)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      })
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        )
      }
    } finally {
      setChangingRole(null)
    }
  }

  const deptMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const d of departments) map[d.id] = d.name
    return map
  }, [departments])

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false
      if (deptFilter !== "all" && u.departmentId !== deptFilter) return false
      if (statusFilter === "active" && u.isDisabled) return false
      if (statusFilter === "disabled" && !u.isDisabled) return false
      if (statusFilter === "activated" && !u.hasLoggedInBefore) return false
      if (statusFilter === "pending" && u.hasLoggedInBefore) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      }
      return true
    })
  }, [users, roleFilter, deptFilter, statusFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const paginated = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize)

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [roleFilter, deptFilter, statusFilter, search, pageSize])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Manage Users</h1>
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

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Manage Users</h1>
        <p className="text-xs text-slate-500">{filtered.length} user(s)</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input text-xs w-auto py-1.5">
          <option value="all">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="DEAN">Dean</option>
          <option value="FACULTY">Faculty</option>
          <option value="STUDENT">Student</option>
          <option value="GUEST">Guest</option>
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="input text-xs w-auto py-1.5">
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input text-xs w-auto py-1.5">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="activated">Activated</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Empty state */}
      {paginated.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No users found.</p>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Department</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Registered</th>
                  <th className="pb-3 pr-4">Activated</th>
                  <th className="pb-3 pr-4">Last Login</th>
                  <th className="pb-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4">
                      <p className="text-slate-800 font-medium">{u.name}</p>
                      <p className="text-slate-400 text-xs">{u.email}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={changingRole === u.id}
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer ${roleColors[u.role] || "bg-slate-100 text-slate-600"}`}
                      >
                        {VALID_ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-500">
                      {u.departmentId ? deptMap[u.departmentId] || "—" : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      {u.isDisabled ? (
                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Disabled</span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 pr-4">
                      {u.hasLoggedInBefore ? (
                        <span className="text-xs text-emerald-600">Yes</span>
                      ) : (
                        <span className="text-xs text-amber-600">Pending</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-500 text-xs">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <SubmitButton
                        onClick={() => handleToggle(u.id, u.isDisabled)}
                        variant={u.isDisabled ? "primary" : "danger"}
                        className="text-xs font-semibold px-3 py-1 rounded-lg"
                      >
                        {u.isDisabled ? "Enable" : "Disable"}
                      </SubmitButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Rows per page:</span>
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
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, filtered.length)} of {filtered.length}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
  )
}
