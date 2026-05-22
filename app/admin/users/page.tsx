"use client"

import { useEffect, useState } from "react"

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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("activated")
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.users) setUsers(data.users)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleStatus = async (userId: string, currentStatus: boolean) => {
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
  }

  const filtered = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false
    if (statusFilter === "activated" && !u.hasLoggedInBefore) return false
    if (statusFilter === "pending" && u.hasLoggedInBefore) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    }
    return true
  })

  const roleColors: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-700",
    DEAN: "bg-amber-100 text-amber-700",
    FACULTY: "bg-emerald-100 text-emerald-700",
    STUDENT: "bg-blue-100 text-blue-700",
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Manage Users</h1>
        <p className="text-xs text-slate-500">{filtered.length} user(s)</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
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
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input text-xs w-auto py-1.5"
        >
          <option value="all">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="DEAN">Dean</option>
          <option value="FACULTY">Faculty</option>
          <option value="STUDENT">Student</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input text-xs w-auto py-1.5"
        >
          <option value="activated">Activated</option>
          <option value="pending">Pending</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pr-4">User</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Registered</th>
                <th className="pb-3 pr-4">Activated</th>
                <th className="pb-3 pr-4">Last Login</th>
                <th className="pb-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4">
                    <p className="text-slate-800 font-medium">{u.name}</p>
                    <p className="text-slate-400 text-xs">{u.email}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleColors[u.role] || "bg-slate-100 text-slate-600"}`}>
                      {u.role}
                    </span>
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
                    <button
                      onClick={() => toggleStatus(u.id, u.isDisabled)}
                      className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${
                        u.isDisabled
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                    >
                      {u.isDisabled ? "Enable" : "Disable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
