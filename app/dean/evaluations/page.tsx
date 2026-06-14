import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasRole } from "@/lib/utils/roles"
import { supabase } from "@/lib/db"
import { departmentRepository } from "@/lib/repositories/factory"
import Link from "next/link"

export default async function DeanEvaluationsPage() {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "DEAN"))
    redirect("/login")

  const userId = (session.user as Record<string, unknown>).id as string
  const dept = await departmentRepository.findByDeanId(userId)

  if (!dept) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <h1 className="text-xl font-bold text-primary">Department Evaluation Dashboard</h1>
        <p className="text-sm text-tertiary">You are not assigned to any department.</p>
      </div>
    )
  }

  const { data: facultyUsers } = await supabase
    .from("users")
    .select("id, name")
    .eq("departmentId", dept.id)
    .order("name")

  const facultyCount = facultyUsers?.length ?? 0
  const facultyIds = (facultyUsers || []).map((u) => u.id)

  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("evaluateeId, id")
    .eq("status", "SUBMITTED")
    .in("evaluateeId", facultyIds)

  const evalCount = evaluations?.length ?? 0
  const evaluatedFaculty = new Set((evaluations || []).map((e) => e.evaluateeId)).size

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-primary">Department Evaluation Dashboard</h1>
        <p className="text-sm text-tertiary mt-1">{dept.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-tertiary uppercase tracking-wider">Faculty Members</p>
          <p className="text-2xl font-bold text-primary mt-1">{facultyCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-tertiary uppercase tracking-wider">Evaluated</p>
          <p className="text-2xl font-bold text-primary mt-1">{evaluatedFaculty}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-tertiary uppercase tracking-wider">Total Submissions</p>
          <p className="text-2xl font-bold text-primary mt-1">{evalCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-primary mb-4">Quick Links</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/dean/evaluations/results" className="block rounded-lg border border-slate-200 p-4 hover:border-blue-200 hover:shadow-sm transition-all">
            <h4 className="text-sm font-bold text-primary">Evaluation Results</h4>
            <p className="text-xs text-tertiary mt-1">View detailed ratings per faculty</p>
          </Link>
          <Link href="/dean/evaluations/reports" className="block rounded-lg border border-slate-200 p-4 hover:border-blue-200 hover:shadow-sm transition-all">
            <h4 className="text-sm font-bold text-primary">Reports</h4>
            <p className="text-xs text-tertiary mt-1">Analytics and export tools</p>
          </Link>
        </div>
      </div>

      {facultyUsers && facultyUsers.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-primary">Faculty Roster</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {facultyUsers.map((u) => (
              <div key={u.id} className="px-5 py-3 flex items-center justify-between">
                <span className="text-sm text-primary">{u.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
