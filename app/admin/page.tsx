import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getDatabaseSize, formatBytes, getStoragePercentage } from "@/features/admin-data/database-size.service"
import { auditLogRepository, userRepository, departmentRepository } from "@/lib/repositories/factory"
import type { AuditLogData } from "@/lib/types"
import Link from "next/link"
import Skeleton, { SkeletonMetricGrid } from "@/components/ui/Skeleton"

interface StatCardProps {
  label: string
  value: string | number
  icon: string
  color: string
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-surface shadow-sm p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-lg ${color}`}>{icon}</span>
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
      </div>
      <p className="text-sm text-tertiary font-medium">{label}</p>
    </div>
  )
}

async function StatsGridSection() {
  const [userCount, facultyCount, studentCount, deptCount] = await Promise.all([
    userRepository.countActive(),
    userRepository.countByRole("FACULTY"),
    userRepository.countByRole("STUDENT"),
    departmentRepository.countActive(),
  ])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <StatCard label="System Users" value={userCount} icon="👥" color="text-gold-600" />
      <StatCard label="Faculty" value={facultyCount} icon="👨‍🏫" color="text-blue-600" />
      <StatCard label="Students" value={studentCount} icon="🎓" color="text-violet-600" />
      <StatCard label="Departments" value={deptCount} icon="🏛" color="text-sky-600" />
    </div>
  )
}

async function StorageSection() {
  const dbSize = await getDatabaseSize()
  const storagePercent = getStoragePercentage(dbSize.estimatedTotalBytes)

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-surface shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-primary">Database Storage</h2>
        <span className="text-xs text-tertiary">{formatBytes(dbSize.estimatedTotalBytes)} / 500 MB</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            storagePercent > 80 ? "bg-red-500" : storagePercent > 60 ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${storagePercent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-secondary">
        <span>{storagePercent}% utilized</span>
        <span>{formatBytes(dbSize.fileBytes)} in files</span>
      </div>
      {!dbSize.usedRpc && (
        <p className="text-xs text-tertiary italic">
          Install <code className="bg-gold-50 text-gold-700 px-1 py-0.5 rounded text-xs font-mono">get_database_size</code> for live measurement.
        </p>
      )}
    </div>
  )
}

async function ActivitySection() {
  const { logs: recentLogs } = await auditLogRepository.list(8, 0)

  return (
    <div className="lg:col-span-2 rounded-2xl border border-slate-200/70 bg-surface shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-primary">Recent Activity</h2>
        <Link href="/admin/system/audit-trail" className="text-xs text-gold-600 hover:text-gold-700 font-medium">
          View all →
        </Link>
      </div>
      <div className="space-y-1">
        {recentLogs.length === 0 ? (
          <p className="text-sm text-tertiary py-4 text-center">No activity recorded yet.</p>
        ) : (
          recentLogs.map((log: AuditLogData) => (
            <div key={log.id} className="flex items-start gap-3 py-2 group hover:bg-gold-50 rounded-lg px-2 -mx-2 transition-colors">
              <span className="text-xs text-tertiary tabular-nums shrink-0 w-14 text-right">
                {new Date(log.createdAt).toLocaleString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className={`text-xs font-semibold shrink-0 ${log.action === "LOGIN" ? "text-blue-600" :
                log.action === "EMAIL_FAILED" ? "text-red-600" :
                log.action === "EMAIL_SENT" ? "text-purple-600" :
                log.action === "CREATE_USER" ? "text-emerald-600" :
                (log.action === "DISABLE_USER" || log.action === "DELETE_USER") ? "text-rose-600" :
                log.action === "ENABLE_USER" ? "text-emerald-600" :
                "text-secondary"
              }`}>
                {log.action.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-tertiary truncate min-w-0">
                {log.details || log.email || "—"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default async function AdminDashboard() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="w-full pb-12 space-y-8">
      <h1 className="text-2xl font-bold text-primary">Dashboard</h1>

      <Suspense fallback={<SkeletonMetricGrid count={4} />}>
        <StatsGridSection />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Suspense fallback={<div className="rounded-2xl border border-slate-200/70 bg-surface shadow-sm p-5 space-y-4"><Skeleton variant="card" /><Skeleton variant="text" /><Skeleton variant="text" className="w-3/4" /></div>}>
          <StorageSection />
        </Suspense>
        <Suspense fallback={<div className="lg:col-span-2 rounded-2xl border border-slate-200/70 bg-surface shadow-sm p-5 space-y-3"><Skeleton variant="text" className="w-1/4" /><Skeleton variant="text" count={5} /></div>}>
          <ActivitySection />
        </Suspense>
      </div>

      <p className="text-xs text-tertiary border-t border-slate-200/70 pt-4">
        Signed in as {(session.user as Record<string, unknown>).name as string || "Admin"}
      </p>
    </div>
  )
}
