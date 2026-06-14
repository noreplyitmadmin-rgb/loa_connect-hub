"use client"

import { useState, useEffect } from "react"
import Skeleton from "@/components/ui/Skeleton"
import LockedTab from "@/components/ui/LockedTab"
import { usePagination, Paginator } from "@/components/ui/Paginator"

interface DeletedUser {
  id: string
  name: string
  email: string
  role: string
  deletedAt: string | null
}

export default function DeletedUsersPage() {
  const [accessState, setAccessState] = useState<"loading" | "granted" | "locked">("loading")
  const [users, setUsers] = useState<DeletedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const { page, totalPages, pageSize, paginatedItems, setPage, setPageSize } = usePagination(users, 25)

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

  useEffect(() => {
    fetch("/api/admin/users/deleted")
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (accessState === "loading") {
    return (
      <div className="max-w-6xl mx-auto pb-12">
        <Skeleton variant="card" />
      </div>
    )
  }

  if (accessState === "locked") {
    return (
      <div className="max-w-6xl mx-auto pb-12">
        <LockedTab endpoint="/api/auth/me" />
      </div>
    )
  }

  const fetchDeleted = async () => {
    setLoading(true)
    const res = await fetch("/api/admin/users/deleted")
    const data = await res.json()
    setUsers(data.users || [])
    setLoading(false)
  }

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
    return <div className="p-8 text-center text-tertiary">Loading deleted users...</div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <h1 className="text-2xl font-bold text-primary">Deleted Users</h1>
      <p className="text-sm text-tertiary">Users that have been soft-deleted. You can restore them or permanently erase their records.</p>
      
      {users.length === 0 ? (
        <div className="rounded-2xl border border-default/70 bg-surface p-8 shadow-sm text-center">
          <p className="text-sm text-tertiary">No deleted users found.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="desktop-only rounded-2xl border border-default/70 bg-surface shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-default bg-surface/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-tertiary">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-tertiary">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-tertiary">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-tertiary">Deleted At</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-tertiary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.map((user) => (
                  <tr key={user.id} className="hover:bg-surface/80 transition-colors">
                    <td className="px-6 py-4 font-medium text-primary whitespace-nowrap">{user.name}</td>
                    <td className="px-4 py-4 text-secondary whitespace-nowrap">{user.email}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 text-red-700 border-red-200/50">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-tertiary whitespace-nowrap text-xs">
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
            {paginatedItems.map((user) => (
              <div key={user.id} className="rounded-2xl border border-default/70 bg-surface p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-primary truncate">{user.name}</p>
                    <p className="text-xs text-tertiary truncate">{user.email}</p>
                  </div>
                  <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 text-red-700 border-red-200/50">
                    {user.role}
                  </span>
                </div>
                <p className="text-xs text-tertiary">
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
          <Paginator page={page} totalPages={totalPages} pageSize={pageSize} totalItems={users.length} setPage={setPage} setPageSize={setPageSize} />
        </>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-surface rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 border border-red-200">
            <h3 className="text-lg font-bold text-primary mb-2">Confirm Permanent Deletion</h3>
            <p className="text-sm text-secondary mb-4">
              This will permanently erase this user record. This action cannot be undone. The user&apos;s appointments and related data will be orphaned.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-3 sm:py-2 rounded-xl bg-surface text-secondary text-sm font-semibold hover:bg-slate-200 transition-all w-full sm:w-auto"
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
