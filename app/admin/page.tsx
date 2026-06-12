import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { supabase } from "@/lib/db"
import { hasRole } from "@/lib/utils/roles"
import { getDatabaseSize, formatBytes, getStoragePercentage, getStorageColor } from "@/features/admin-data/database-size.service"
import { auditLogRepository } from "@/lib/repositories/factory"
import type { AuditLogData } from "@/lib/types"
import Link from "next/link"

interface StatCardProps {
  label: string
  value: string | number
  accent: string
  icon: string
}

function StatCard({ label, value, accent, icon }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-4 backdrop-blur-sm transition-all duration-300 hover:border-slate-700 hover:bg-slate-950/80 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-mono font-semibold tracking-widest uppercase text-slate-500">{label}</p>
          <p className={`mt-1.5 text-2xl font-bold font-mono tabular-nums ${accent}`}>{value}</p>
        </div>
        <span className="text-lg opacity-30 group-hover:opacity-60 transition-opacity">{icon}</span>
      </div>
      <div className={`absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-500 ${accent.replace("text-", "bg-").replace("font-mono ", "")} opacity-40`} style={{ width: "40%" }} />
    </div>
  )
}

function PulseDot() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  )
}

export default async function AdminDashboard() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) redirect("/login")

  const [dbSize, { logs: recentLogs }] = await Promise.all([
    getDatabaseSize(),
    auditLogRepository.list(8, 0),
  ])

  const storagePercent = getStoragePercentage(dbSize.estimatedTotalBytes)
  const storageColor = getStorageColor(storagePercent)

  const { count: userCount } = await supabase.from("users").select("*", { count: "exact", head: true }).is("deletedAt", null) || { count: 0 }
  const { count: facultyCount } = await supabase.from("userrole").select("*", { count: "exact", head: true }).eq("roleName", "FACULTY") || { count: 0 }
  const { count: studentCount } = await supabase.from("userrole").select("*", { count: "exact", head: true }).eq("roleName", "STUDENT") || { count: 0 }
  const { count: apptCount } = await supabase.from("appointments").select("*", { count: "exact", head: true }) || { count: 0 }
  const { count: pendingCount } = await supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "PENDING") || { count: 0 }
  const { count: deptCount } = await supabase.from("departments").select("*", { count: "exact", head: true }).eq("isDisabled", false) || { count: 0 }

  const userLabel = `SYSTEM USERS`
  const apptLabel = `APPOINTMENTS`
  const adminName = (session.user as Record<string, unknown>).name as string || "Admin"

  const quickActions = [
    { href: "/admin/data/users", label: "Manage Users", icon: "👤" },
    { href: "/admin/data/academic-infrastructure", label: "Academic Infrastructure", icon: "🏛" },
    { href: "/admin/audit-trail", label: "Audit Trail", icon: "📋" },
    { href: "/admin/evaluations", label: "Evaluation Hub", icon: "📊" },
    { href: "/admin/reports/health", label: "Reports", icon: "📈" },
    { href: "/admin/access-config", label: "Access Config", icon: "🔐" },
  ]

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-mono font-semibold tracking-[0.2em] uppercase text-slate-500 flex items-center gap-2">
            <PulseDot />
            SYSTEM ONLINE
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-100 tracking-tight">
            Console<span className="text-emerald-400">/</span>admin
          </h1>
        </div>
        <p className="text-xs font-mono text-slate-500 tabular-nums hidden sm:block">
          {new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label={userLabel} value={userCount ?? "—"} accent="text-emerald-400" icon="▣" />
        <StatCard label="FACULTY" value={facultyCount ?? "—"} accent="text-cyan-400" icon="◈" />
        <StatCard label="STUDENTS" value={studentCount ?? "—"} accent="text-violet-400" icon="◉" />
        <StatCard label={apptLabel} value={apptCount ?? "—"} accent="text-amber-400" icon="◈" />
        <StatCard label="PENDING" value={pendingCount ?? "—"} accent="text-rose-400" icon="◌" />
        <StatCard label="DEPARTMENTS" value={deptCount ?? "—"} accent="text-sky-400" icon="⊞" />
      </div>

      {/* Storage + Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storage */}
        <div className="lg:col-span-1 rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono font-semibold tracking-widest uppercase text-slate-500">Storage</p>
            <span className="text-xs font-mono text-slate-500">{formatBytes(dbSize.estimatedTotalBytes)} / 500 MB</span>
          </div>
          <div className="relative h-2 rounded-full bg-slate-900 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                storageColor === "emerald" ? "bg-gradient-to-r from-emerald-500 to-emerald-400" :
                storageColor === "amber" ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                "bg-gradient-to-r from-red-500 to-red-400"
              }`}
              style={{ width: `${storagePercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className={
              storageColor === "emerald" ? "text-emerald-400" :
              storageColor === "amber" ? "text-amber-400" : "text-red-400"
            }>
              {storagePercent}% utilized
            </span>
            <span className="text-slate-600">{formatBytes(dbSize.fileBytes)} in files</span>
          </div>
          {!dbSize.usedRpc && (
            <p className="text-[9px] font-mono text-slate-600 italic leading-relaxed">
              Install <code className="text-[9px] bg-slate-900 px-1 py-0.5 rounded text-slate-400">get_database_size</code> for live measurement.
            </p>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-mono font-semibold tracking-widest uppercase text-slate-500">Recent Activity</p>
            <Link href="/admin/audit-trail" className="text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors">
              view all →
            </Link>
          </div>
          <div className="space-y-1">
            {recentLogs.length === 0 ? (
              <p className="text-xs font-mono text-slate-600 py-4 text-center">No activity recorded yet.</p>
            ) : (
              recentLogs.map((log: AuditLogData) => (
                <div key={log.id} className="flex items-start gap-3 py-1.5 group hover:bg-slate-900/50 rounded px-1 -mx-1 transition-colors">
                  <span className="text-[9px] font-mono text-slate-600 tabular-nums shrink-0 w-12 text-right">
                    {new Date(log.createdAt).toLocaleString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className={`text-[10px] font-mono font-semibold shrink-0 ${
                    log.action === "LOGIN" ? "text-blue-400" :
                    log.action === "EMAIL_FAILED" ? "text-red-400" :
                    log.action === "EMAIL_SENT" ? "text-purple-400" :
                    log.action === "CREATE_USER" ? "text-emerald-400" :
                    log.action === "DISABLE_USER" || log.action === "DELETE_USER" ? "text-rose-400" :
                    log.action === "ENABLE_USER" ? "text-emerald-400" :
                    "text-slate-400"
                  }`}>
                    {log.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 truncate min-w-0">
                    {log.details || log.email || "—"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
        <p className="text-[10px] font-mono font-semibold tracking-widest uppercase text-slate-500 mb-4">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-3 text-xs font-mono text-slate-400 hover:border-slate-700 hover:text-slate-200 hover:bg-slate-900 transition-all duration-200"
            >
              <span className="text-sm">{action.icon}</span>
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-[9px] font-mono text-slate-700">
        <span>session: {adminName}</span>
        <span>loa connect hub v0.1</span>
      </div>
    </div>
  )
}
