"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

const LABELS: Record<string, string> = {
  admin: "Admin",
  dean: "Dean",
  faculty: "Faculty",
  student: "Student",
  login: "Login",
  register: "Register",
  availability: "Availability",
  meetings: "Meetings",
  upload: "Import Users",
  "graph-users": "Entra ID Users",
  users: "Users",
  new: "New",
  responsiveness: "TAT Report",
  distribution: "Faculty Consultation Load",
  coverage: "Consultation Reach",
  backlog: "Faculty Response Monitor",
  health: "General Report",
  demand: "Demand Trend",
}

export default function Breadcrumbs() {
  const pathname = usePathname()
  const router = useRouter()
  if (!pathname || pathname === "/login" || pathname === "/register" || pathname === "/activate" || pathname === "/forgot-password" || pathname.startsWith("/change-password") || pathname.startsWith("/setup-password")) return null

  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return null

  const items = segments.map((seg, i) => ({
    label: LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
    href: "/" + segments.slice(0, i + 1).join("/"),
  }))

  const currentLabel = items[items.length - 1]?.label || ""

  return (
    <>
      {/* Mobile: back button + current page */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 px-4 py-3 border-b border-slate-100 bg-white lg:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors shrink-0 -ml-1 p-1 min-h-[44px] min-w-[44px]"
          aria-label="Go back"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-slate-700 font-semibold truncate min-w-0">{currentLabel}</span>
      </nav>
      {/* Desktop: full breadcrumb trail */}
      <nav className="hidden lg:flex items-center gap-1 text-xs text-slate-400 px-6 py-3 border-b border-slate-100 bg-white">
        {items.map((item, index) => (
          <span key={item.href} className="flex items-center gap-1 min-w-0">
            {index > 0 && (
              <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
            {item.href === pathname ? (
              <span className="text-slate-700 font-semibold truncate">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-slate-600 transition-colors truncate">
                {item.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </>
  )
}
