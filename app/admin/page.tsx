import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { auditLogRepository } from "@/lib/repositories/factory"
import { hasRole } from "@/lib/utils/roles"
import { getDatabaseSize, formatBytes, getStoragePercentage, getStorageColor } from "@/lib/controllers/database-size"
import type { AuditLogData } from "@/lib/types"
import Link from "next/link"

async function getAuditLogs(page = 1, pageSize = 25) {
  const offset = Math.max(0, (page - 1) * pageSize)
  return auditLogRepository.list(pageSize, offset)
}

export default async function AdminDashboard({ searchParams }: { searchParams?: { page?: string } }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) redirect("/login")

  const page = Number(searchParams?.page) || 1
  const pageSize = 25

  const [auditLogs, dbSize] = await Promise.all([
    getAuditLogs(page, pageSize),
    getDatabaseSize(),
  ])

  const storagePercent = getStoragePercentage(dbSize.estimatedTotalBytes)
  const storageColor = getStorageColor(storagePercent)

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Database Storage */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Database Storage</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {dbSize.usedRpc ? "Live" : "Estimated"} &middot; Free tier: 500 MB
            </p>
          </div>
          <span className="text-sm font-bold text-slate-700 tabular-nums">
            {formatBytes(dbSize.estimatedTotalBytes)}
            <span className="text-slate-400 font-medium"> / 500 MB</span>
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              storageColor === "emerald"
                ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                : storageColor === "amber"
                ? "bg-gradient-to-r from-amber-400 to-amber-500"
                : "bg-gradient-to-r from-red-400 to-red-500"
            }`}
            style={{ width: `${storagePercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className={`text-xs font-semibold ${
            storageColor === "emerald" ? "text-emerald-600" :
            storageColor === "amber" ? "text-amber-600" : "text-red-600"
          }`}>
            {storagePercent}% used
          </span>
          <span className="text-xs text-slate-400">
            {formatBytes(dbSize.fileBytes)} in file attachments
          </span>
        </div>
        {!dbSize.usedRpc && (
          <p className="text-[10px] text-slate-400 mt-2 italic">
            Install the <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded">get_database_size</code> Postgres function for accurate live measurement.
          </p>
        )}
      </div>

      {/* Audit Trail */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Audit Trail</h2>

        {/* Desktop table */}
        <div className="desktop-only card overflow-x-auto bg-white">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-400">No audit logs yet.</p>
              <p className="text-xs text-slate-300 mt-1">Activity will be recorded here once users start interacting with the system.</p>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log: AuditLogData) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap text-xs text-slate-500 font-medium tabular-nums">
                        {new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-xs">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          log.action === "LOGIN" ? "bg-blue-50 text-blue-700 border-blue-200/50" :
                          log.action === "DISABLE_USER" ? "bg-red-50 text-red-700 border-red-200/50" :
                          log.action === "ENABLE_USER" ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" :
                          log.action === "CREATE_USER" ? "bg-green-50 text-green-700 border-green-200/50" :
                          log.action === "PASSWORD_RESET" ? "bg-amber-50 text-amber-700 border-amber-200/50" :
                          log.action === "EMAIL_SENT" ? "bg-purple-50 text-purple-700 border-purple-200/50" :
                          log.action === "EMAIL_FAILED" ? "bg-red-50 text-red-700 border-red-200/50" :
                          "bg-slate-50 text-slate-700 border-slate-200/50"
                        }`}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-xs text-slate-600 font-medium">
                        {log.email || "\u2014"}
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-500 max-w-xs truncate">
                        {log.details || "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
                <p className="text-xs text-slate-500">
                  Page <span className="font-semibold">{page}</span> • {auditLogs.length} entries
                </p>
                <div className="flex items-center gap-2">
                  {page > 1 && (
                    <Link href={`/admin?page=${page - 1}`} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded border border-slate-200 transition-colors">
                      ← Previous
                    </Link>
                  )}
                  <Link href={`/admin?page=${page + 1}`} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded border border-slate-200 transition-colors">
                    Next →
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Mobile cards */}
        <div className="mobile-only space-y-3">
          {auditLogs.length === 0 ? (
            <div className="card p-8 text-center bg-white">
              <p className="text-sm text-slate-400">No audit logs yet.</p>
            </div>
          ) : (
            <>
              {auditLogs.map((log: AuditLogData) => (
                <div key={log.id} className="card p-4 bg-white space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      log.action === "LOGIN" ? "bg-blue-50 text-blue-700 border-blue-200/50" :
                      log.action === "DISABLE_USER" ? "bg-red-50 text-red-700 border-red-200/50" :
                      log.action === "ENABLE_USER" ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" :
                      log.action === "CREATE_USER" ? "bg-green-50 text-green-700 border-green-200/50" :
                      log.action === "PASSWORD_RESET" ? "bg-amber-50 text-amber-700 border-amber-200/50" :
                      log.action === "EMAIL_SENT" ? "bg-purple-50 text-purple-700 border-purple-200/50" :
                      log.action === "EMAIL_FAILED" ? "bg-red-50 text-red-700 border-red-200/50" :
                      "bg-slate-50 text-slate-700 border-slate-200/50"
                    }`}>
                      {log.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-slate-400 tabular-nums">
                      {new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-slate-600">{log.email || "\u2014"}</span>
                  </div>
                  {log.details && (
                    <p className="text-xs text-slate-500 leading-relaxed">{log.details}</p>
                  )}
                </div>
              ))}

              {/* Mobile Pagination */}
              <div className="flex items-center justify-between gap-2">
                {page > 1 && (
                  <Link href={`/admin?page=${page - 1}`} className="flex-1 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded border border-slate-200 transition-colors text-center">
                    ← Previous
                  </Link>
                )}
                <p className="text-xs text-slate-500 whitespace-nowrap">
                  Page <span className="font-semibold">{page}</span>
                </p>
                <Link href={`/admin?page=${page + 1}`} className="flex-1 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded border border-slate-200 transition-colors text-center">
                  Next →
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
