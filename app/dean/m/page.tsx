import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasRole } from "@/lib/utils/roles"

export default async function MobileDeanDashboard() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!hasRole((session.user as Record<string, unknown>).role as string, "DEAN")) redirect("/login")

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6 pb-24 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h1 className="text-lg font-bold text-slate-900 text-center">Dashboard is only available on desktop version</h1>
      <p className="text-sm text-slate-500 text-center leading-relaxed">
        Your device&apos;s browser identifies itself as a mobile device. If you are on a desktop computer, your browser may
        be emulating a mobile viewport via developer tools. To access the full dashboard, add <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">?desktop=1</code> to the URL or
        disable mobile device emulation in your browser.
      </p>
    </div>
  )
}
