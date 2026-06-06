import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasRole } from "@/lib/utils/roles"
import { getSemesters } from "@/lib/controllers/semesters"
import Link from "next/link"

export default async function AdminEvaluationPeriodsPage() {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN"))
    redirect("/login")

  const periods = await getSemesters()

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">Evaluation Periods</h1>
          <p className="text-sm text-tertiary mt-1">Manage evaluation cycles</p>
        </div>
        <Link
          href="/admin/evaluations/periods/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          New Period
        </Link>
      </div>

      <div className="space-y-3">
        {periods.length === 0 ? (
          <p className="text-sm text-tertiary text-center py-12">No evaluation periods yet.</p>
        ) : (
          periods.map((p) => (
            <Link
              key={p.id}
              href={`/admin/evaluations/periods/${p.id}`}
              className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-primary">{p.title}</h3>
                 
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-tertiary">
                    {p.evalStartDate} – {p.evalEndDate}
                  </span>
                  {p.isActive && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
