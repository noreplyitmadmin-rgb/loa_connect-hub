import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { userRepository } from "@/lib/repositories/factory"
import { auditLogRepository } from "@/lib/repositories/factory"
import { hasRole } from "@/lib/utils/roles"

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
  if (!hasRole((session.user as any).role, "ADMIN")) redirect("/login")

  const [users, auditLogs] = await Promise.all([
    getUsers(),
    getAuditLogs(),
  ])

  const adminCount = users.filter((u: any) => hasRole(u.role, "ADMIN")).length
  const deanCount = users.filter((u: any) => hasRole(u.role, "DEAN")).length
  const facultyCount = users.filter((u: any) => hasRole(u.role, "FACULTY")).length
  const studentCount = users.filter((u: any) => hasRole(u.role, "STUDENT")).length
  const pendingCount = users.filter((u: any) => !u.hasLoggedInBefore).length
  const disabledCount = users.filter((u: any) => u.isDisabled).length

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

      {/* All Platform Users */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">All Platform Users ({users.length})</h2>
        <div className="card overflow-hidden bg-white">
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
              {users.map((user: any) => (
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
      </section>

      {/* Audit Trail */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Audit Trail</h2>
        <div className="card overflow-hidden bg-white">
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
                {auditLogs.map((log: any) => (
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
      </section>
    </div>
  )
}
