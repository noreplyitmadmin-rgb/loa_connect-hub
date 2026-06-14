import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasRole } from "@/lib/utils/roles"
import Link from "next/link"

export default async function DeanReportsHubPage() {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "DEAN"))
    redirect("/login")

  const cards = [
    { href: "#", title: "Export Results", desc: "Download department evaluation data", disabled: true },
    { href: "#", title: "Sentiment Summary", desc: "View comment sentiment trends", disabled: true },
    { href: "#", title: "Department Summary", desc: "Aggregated department performance", disabled: true },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-primary">Reports</h1>
        <p className="text-sm text-tertiary mt-1">Evaluation reports and analytics</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          c.disabled ? (
            <div key={c.title} className="block bg-white rounded-xl border border-slate-200 p-6 opacity-50 cursor-not-allowed">
              <h3 className="text-sm font-bold text-primary">{c.title}</h3>
              <p className="text-xs text-tertiary mt-1">{c.desc}</p>
            </div>
          ) : (
            <Link key={c.title} href={c.href} className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-200 hover:shadow-sm transition-all">
              <h3 className="text-sm font-bold text-primary">{c.title}</h3>
              <p className="text-xs text-tertiary mt-1">{c.desc}</p>
            </Link>
          )
        ))}
      </div>
    </div>
  )
}
