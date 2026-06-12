import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasRole } from "@/lib/utils/roles"
import Link from "next/link"

export default async function AdminEvaluationsHubPage() {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN"))
    redirect("/login")

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-primary">Evaluations</h1>
        <p className="text-sm text-tertiary mt-1">Faculty evaluation management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Link
          href="/admin/evaluations/results"
          className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-200 hover:shadow-sm transition-all"
        >
          <h3 className="text-sm font-bold text-primary">Evaluation Results</h3>
          <p className="text-xs text-tertiary mt-1">View computed faculty evaluation results</p>
        </Link>
      </div>
    </div>
  )
}
