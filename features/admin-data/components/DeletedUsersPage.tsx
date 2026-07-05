"use client"

import { useState, useEffect } from "react"
import Skeleton from "@/components/ui/Skeleton"
import { usePagination, Paginator } from "@/components/ui/Paginator"

interface DeletedUser {
  id: string
  name: string
  email: string
  role: string
  deletedAt: string | null
}

interface RelatedData {
  summary: { table: string; count: number; label: string }[]
  related: Record<string, unknown[]>
}

export default function DeletedUsersPage() {
  const [users, setUsers] = useState<DeletedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewUser, setReviewUser] = useState<DeletedUser | null>(null)
  const [relatedData, setRelatedData] = useState<RelatedData | null>(null)
  const [fetchingRelated, setFetchingRelated] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { page, totalPages, pageSize, paginatedItems, setPage, setPageSize } = usePagination(users, 25)

  useEffect(() => {
    fetch("/api/admin/users/deleted")
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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

  const handleHardDelete = async () => {
    if (!reviewUser) return
    setDeleting(true)
    const res = await fetch(`/api/admin/users/${reviewUser.id}`, { method: "DELETE" })
    if (res.ok) {
      setReviewUser(null)
      setRelatedData(null)
      fetchDeleted()
    } else {
      const data = await res.json()
      alert(data.error || "Failed to delete user")
    }
    setDeleting(false)
  }

  const openReview = async (user: DeletedUser) => {
    setReviewUser(user)
    setFetchingRelated(true)
    setRelatedData(null)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/related-data`)
      const data = await res.json()
      setRelatedData(data)
    } catch {
      setRelatedData(null)
    }
    setFetchingRelated(false)
  }

  const closeReview = () => {
    setReviewUser(null)
    setRelatedData(null)
  }

  if (loading) {
    return (
      <div className="w-full pb-12">
        <Skeleton variant="card" />
      </div>
    )
  }

  const totalRelated = relatedData?.summary.reduce((acc, s) => acc + s.count, 0) ?? 0

  return (
    <div className="w-full space-y-6 pb-12">
      <h1 className="text-2xl font-bold text-primary">Deleted Users</h1>
      <p className="text-sm text-tertiary">Users that have been soft-deleted. You can restore them or permanently erase their records.</p>

      {users.length === 0 ? (
        <div className="rounded-2xl border border-default/70 bg-surface p-8 shadow-sm text-center">
          <p className="text-sm text-tertiary">No deleted users found.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="desktop-only tbl-container tbl">
            <table>
              <thead>
                <tr >
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Deleted At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((user) => (
                  <tr key={user.id} >
                    <td className="font-medium text-primary whitespace-nowrap">{user.name}</td>
                    <td className="text-secondary whitespace-nowrap">{user.email}</td>
                    <td className="whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 text-red-700 border-red-200/50">
                        {user.role}
                      </span>
                    </td>
                    <td className="text-tertiary whitespace-nowrap text-xs">
                      {user.deletedAt ? new Date(user.deletedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "\u2014"}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestore(user.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-xs font-semibold hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-200"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => openReview(user)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200/50 text-xs font-semibold hover:bg-red-100 hover:border-red-300 transition-all duration-200"
                        >
                          Hard Delete
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
                    onClick={() => openReview(user)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-3 text-xs font-semibold rounded-xl bg-red-50 text-red-700 border border-red-200/50 hover:bg-red-100 transition-all duration-200"
                  >
                    Hard Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Paginator page={page} totalPages={totalPages} pageSize={pageSize} totalItems={users.length} setPage={setPage} setPageSize={setPageSize} />
        </>
      )}

      {reviewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-surface rounded-2xl shadow-xl p-6 max-w-lg w-full mx-4 border border-red-200 max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold text-primary mb-1">
              Hard Delete: {reviewUser.name}
            </h3>
            <p className="text-xs text-tertiary mb-4">{reviewUser.email}</p>

            {fetchingRelated ? (
              <div className="flex-1 flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : relatedData ? (
              <div className="flex-1 overflow-y-auto space-y-3 min-h-0 mb-4">
                <p className="text-sm font-semibold text-red-700">
                  This will permanently erase <span className="font-bold">{totalRelated}</span> associated record{totalRelated !== 1 ? "s" : ""} across the following tables:
                </p>

                {relatedData.summary.map((s) => (
                  <div key={s.table}>
                    <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-red-50 border border-red-100">
                      <span className="text-sm font-medium text-red-800">{s.label}</span>
                      <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{s.count}</span>
                    </div>
                    {s.count > 0 && relatedData.related[s.table] && relatedData.related[s.table].length > 0 && (
                      <div className="ml-3 mt-1 space-y-0.5">
                        {relatedData.related[s.table].slice(0, 10).map((row: Record<string, unknown>, i) => (
                          <div key={i} className="text-[11px] text-red-600 pl-3 border-l-2 border-red-200 py-0.5">
                            {JSON.stringify(row).length > 120
                              ? JSON.stringify(row).slice(0, 120) + "..."
                              : JSON.stringify(row)}
                          </div>
                        ))}
                        {s.count > 10 && (
                          <div className="text-[11px] text-red-400 pl-3 italic">
                            ...and {s.count - 10} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-800 font-medium">
                    This action cannot be undone. All associated data listed above will be cascade-deleted from the database.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center py-8">
                <p className="text-sm text-red-500">Failed to load related data. Try again.</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-end pt-3 border-t border-default">
              <button
                onClick={closeReview}
                className="px-4 py-3 sm:py-2 rounded-xl bg-surface text-secondary text-sm font-semibold hover:bg-slate-200 transition-all w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleHardDelete}
                disabled={deleting || fetchingRelated || !relatedData}
                className="px-4 py-3 sm:py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : `Hard Delete (${totalRelated} records)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
