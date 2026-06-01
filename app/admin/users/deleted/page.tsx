"use client"

import { useState, useEffect } from "react"

interface DeletedUser {
  id: string
  name: string
  email: string
  role: string
  deletedAt: string | null
}

export default function DeletedUsersPage() {
  const [users, setUsers] = useState<DeletedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const doFetch = async () => {
    const res = await fetch("/api/admin/users/deleted")
    const data = await res.json()
    setUsers(data.users || [])
  }

  const fetchDeleted = async () => {
    setLoading(true)
    await doFetch()
    setLoading(false)
  }

  useEffect(() => {
    fetch("/api/admin/users/deleted")
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleRestore = async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}/restore`, { method: "POST" })
    if (res.ok) {
      fetchDeleted()
    } else {
      const data = await res.json()
      alert(data.error || "Failed to restore user")
    }
  }

  const handlePermanentDelete = async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
    if (res.ok) {
      setConfirmDelete(null)
      fetchDeleted()
    } else {
      const data = await res.json()
      alert(data.error || "Failed to delete user")
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading deleted users...</div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <h1 className="text-2xl font-bold text-slate-900">Deleted Users</h1>
      <p className="text-sm text-slate-500">Users that have been soft-deleted. You can restore them or permanently erase their records.</p>
      
      {users.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-8 shadow-sm text-center">
          <p className="text-sm text-slate-400">No deleted users found.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="desktop-only rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Deleted At</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">{user.name}</td>
                    <td className="px-4 py-4 text-slate-600 whitespace-nowrap">{user.email}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 text-red-700 border-red-200/50">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500 whitespace-nowrap text-xs">
                      {user.deletedAt ? new Date(user.deletedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "\u2014"}
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestore(user.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-xs font-semibold hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-200"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => setConfirmDelete(user.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200/50 text-xs font-semibold hover:bg-red-100 hover:border-red-300 transition-all duration-200"
                        >
                          Delete Permanently
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mobile-only space-y-3">
            {users.map((user) => (
              <div key={user.id} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 text-red-700 border-red-200/50">
                    {user.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Deleted: {user.deletedAt ? new Date(user.deletedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "\u2014"}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRestore(user.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-3 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/50 hover:bg-emerald-100 transition-all duration-200"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirmDelete(user.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-3 text-xs font-semibold rounded-xl bg-red-50 text-red-700 border border-red-200/50 hover:bg-red-100 transition-all duration-200"
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 border border-red-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Confirm Permanent Deletion</h3>
            <p className="text-sm text-slate-600 mb-4">
              This will permanently erase this user record. This action cannot be undone. The user&apos;s appointments and related data will be orphaned.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-3 sm:py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-all w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePermanentDelete(confirmDelete)}
                className="px-4 py-3 sm:py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all w-full sm:w-auto"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
