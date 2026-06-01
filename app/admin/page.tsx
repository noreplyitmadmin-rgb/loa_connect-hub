import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { userRepository } from "@/lib/repositories/factory"
import { auditLogRepository } from "@/lib/repositories/factory"
import { hasRole } from "@/lib/utils/roles"
import { getDatabaseSize, formatBytes, getStoragePercentage, getStorageColor } from "@/lib/controllers/database-size"
import type { UserData, AuditLogData } from "@/lib/repositories/interfaces"

async function getUsers() {
  const users = await userRepository.listAll()
  return users
}

async function getAuditLogs() {
  return auditLogRepository.list(50)
}

export default async function AdminDashboard() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) redirect("/login")

  const [users, auditLogs, dbSize] = await Promise.all([
    getUsers(),
    getAuditLogs(),
    getDatabaseSize(),
  ])

  const storagePercent = getStoragePercentage(dbSize.estimatedTotalBytes)
  const storageColor = getStorageColor(storagePercent)

  const adminCount = users.filter((u: UserData) => hasRole(u.role, "ADMIN")).length
  const deanCount = users.filter((u: UserData) => hasRole(u.role, "DEAN")).length
  const facultyCount = users.filter((u: UserData) => hasRole(u.role, "FACULTY")).length
  const studentCount = users.filter((u: UserData) => hasRole(u.role, "STUDENT")).length
  const pendingCount = users.filter((u: UserData) => !u.hasLoggedInBefore).length
  const disabledCount = users.filter((u: UserData) => u.isDisabled).length

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="card p-4 bg-white">
          <p className="text-2xl font-bold text-slate-900">{adminCount}</p>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Admins</p>
        </div>
        <div className="card p-4 bg-white">
          <p className="text-2xl font-bold text-slate-900">{deanCount}</p>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Deans</p>
        </div>
        <div className="card p-4 bg-white">
          <p className="text-2xl font-bold text-slate-900">{facultyCount}</p>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Faculty</p>
        </div>
        <div className="card p-4 bg-white">
          <p className="text-2xl font-bold text-slate-900">{studentCount}</p>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Students</p>
        </div>
        <div className="card p-4 bg-white">
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Pending Activation</p>
        </div>
        <div className="card p-4 bg-white">
          <p className="text-2xl font-bold text-red-600">{disabledCount}</p>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Disabled</p>
        </div>
      </div>

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

      {/* All Platform Users */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">All Platform Users ({users.length})</h2>

        {/* Desktop table */}
        <div className="desktop-only card overflow-hidden bg-white">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Account Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Role</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Registration Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user: UserData) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      hasRole(user.role, "ADMIN") ? "bg-purple-50 text-purple-700 border-purple-200/50" :
                      hasRole(user.role, "DEAN") ? "bg-amber-50 text-amber-700 border-amber-200/50" :
                      hasRole(user.role, "FACULTY") ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" :
                      "bg-blue-50 text-blue-700 border-blue-200/50"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {user.isDisabled ? (
                      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Disabled</span>
                    ) : user.hasLoggedInBefore ? (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-medium">
                    {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-only space-y-3">
          {users.map((user: UserData) => (
            <div key={user.id} className="card p-4 bg-white space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  hasRole(user.role, "ADMIN") ? "bg-purple-50 text-purple-700 border-purple-200/50" :
                  hasRole(user.role, "DEAN") ? "bg-amber-50 text-amber-700 border-amber-200/50" :
                  hasRole(user.role, "FACULTY") ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" :
                  "bg-blue-50 text-blue-700 border-blue-200/50"
                }`}>
                  {user.role}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {user.isDisabled ? (
                  <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Disabled</span>
                ) : user.hasLoggedInBefore ? (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
                ) : (
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pending</span>
                )}
                <span className="text-xs text-slate-400">
                  {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

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
          )}
        </div>

        {/* Mobile cards */}
        <div className="mobile-only space-y-3">
          {auditLogs.length === 0 ? (
            <div className="card p-8 text-center bg-white">
              <p className="text-sm text-slate-400">No audit logs yet.</p>
            </div>
          ) : (
            auditLogs.map((log: AuditLogData) => (
              <div key={log.id} className="card p-4 bg-white space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    log.action === "LOGIN" ? "bg-blue-50 text-blue-700 border-blue-200/50" :
                    log.action === "DISABLE_USER" ? "bg-red-50 text-red-700 border-red-200/50" :
                    log.action === "ENABLE_USER" ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" :
                    log.action === "CREATE_USER" ? "bg-green-50 text-green-700 border-green-200/50" :
                    log.action === "PASSWORD_RESET" ? "bg-amber-50 text-amber-700 border-amber-200/50" :
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
            ))
          )}
        </div>
      </section>
    </div>
  )
}
