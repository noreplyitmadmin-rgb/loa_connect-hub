import Link from "next/link"

export default function EvaluationsHubPage({ basePath = "/admin" }: { basePath?: string }) {
  return (
    <div className="w-full space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-primary">Evaluations</h1>
        <p className="text-sm text-tertiary mt-1">Faculty evaluation management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href={`${basePath}/evaluations/results`}
          className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-200 hover:shadow-sm transition-all"
        >
          <h3 className="text-sm font-bold text-primary">Evaluation Results</h3>
          <p className="text-xs text-tertiary mt-1">View computed faculty evaluation results</p>
        </Link>
        <Link
          href={`${basePath}/evaluations/rubrics`}
          className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-200 hover:shadow-sm transition-all"
        >
          <h3 className="text-sm font-bold text-primary">Rubric Editor</h3>
          <p className="text-xs text-tertiary mt-1">Manage evaluation categories and items</p>
        </Link>
        <Link
          href={`${basePath}/evaluations/reports`}
          className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-200 hover:shadow-sm transition-all"
        >
          <h3 className="text-sm font-bold text-primary">Reports</h3>
          <p className="text-xs text-tertiary mt-1">Analytics and sentiment analysis</p>
        </Link>
      </div>
    </div>
  )
}
