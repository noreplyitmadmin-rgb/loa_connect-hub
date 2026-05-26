"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

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
}

export default function Breadcrumbs() {
  const pathname = usePathname()
  if (!pathname || pathname === "/login" || pathname === "/register" || pathname === "/activate" || pathname === "/forgot-password" || pathname.startsWith("/change-password") || pathname.startsWith("/setup-password")) return null

  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return null

  const items = segments.map((seg, i) => ({
    label: LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
    href: "/" + segments.slice(0, i + 1).join("/"),
  }))

  return (
    <nav className="flex items-center gap-1 text-xs text-slate-400 px-6 py-3 border-b border-slate-100 bg-white">
      {items.map((item) => (
        <span key={item.href} className="flex items-center gap-1">
          <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {item.href === pathname ? (
            <span className="text-slate-700 font-semibold">{item.label}</span>
          ) : (
            <Link href={item.href} className="hover:text-slate-600 transition-colors">
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
