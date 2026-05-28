import Link from "next/link"

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <h1 className="text-6xl font-bold text-slate-300">403</h1>
        <p className="text-lg font-semibold text-slate-900 mt-4">Access Denied</p>
        <p className="text-sm text-slate-500 mt-2">
          You don&apos;t have permission to access this page.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 text-sm font-semibold text-gold-600 hover:text-gold-700 underline"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
