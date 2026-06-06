"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { useApiGet } from "@/lib/api/client"
import { getPrimaryRole } from "@/lib/utils/roles"
import { useSidebar } from "@/lib/contexts/sidebar"

interface NavItem {
  href?: string
  label: string
  icon?: string
  badge?: boolean
  children?: NavItem[]
}

const reportChildren: NavItem[] = [
  { href: "/admin/reports/health", label: "General Report", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/admin/reports/distribution", label: "Distribution Report", icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" },
]

const evaluationChildren: NavItem[] = [
  { href: "/student/evaluations", label: "My Evaluations", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { href: "/faculty/evaluations/results", label: "My Results", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { href: "/dean/evaluations/results", label: "Department Results", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { href: "/admin/evaluations", label: "Evaluation Hub", icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" },
  { href: "/admin/evaluations/periods", label: "Periods", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/admin/evaluations/results", label: "All Results", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
]

const dataChildren: NavItem[] = [
  { href: "/admin/data/users", label: "Manage Users", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { href: "/admin/data/departments", label: "Departments", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { href: "/admin/data/subjects", label: "Subjects", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/admin/data/sections", label: "Sections", icon: "M4 6h16M4 12h16M4 18h7" },
  { href: "/admin/data/faculty-mappings", label: "Faculty-Subject", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { href: "/admin/data/student-enrollments", label: "Student Enrollments", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { href: "/admin/data/users/deleted", label: "Deleted Users", icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" },
  { href: "/admin/data-management", label: "Export & Delete", icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" },
]

const hiddenHrefs = new Set(["/admin/reports", "/faculty/reports", "/admin/evaluations", "/student/evaluations", "/admin/evaluations/periods", "/admin/evaluations/results", "/dean/evaluations/results", "/faculty/evaluations/results", "/admin/data-management"])
const reportHrefs = new Set(reportChildren.map((c) => c.href!))
const evaluationHrefs = new Set(evaluationChildren.map((c) => c.href!))
const dataHrefs = new Set(dataChildren.map((c) => c.href!))

export default function Sidebar() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set())
  const [popoverGroup, setPopoverGroup] = useState<string | null>(null)

  const { data: accessData } = useApiGet<{ pages: string[] }>(
    session ? "/api/auth/access" : null
  )
  const allowedPages = accessData?.pages ?? null

  const toggleGroup = useCallback((name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => setPopoverGroup(null))
  }, [pathname])

  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!popoverGroup) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverGroup(null)
      }
    }
    document.addEventListener("mousedown", handler, true)
    return () => document.removeEventListener("mousedown", handler, true)
  }, [popoverGroup])

  const role = session ? (session.user as Record<string, unknown>)?.role as string : null
  const primaryRole = role ? getPrimaryRole(role) : null
  const dashHref = primaryRole ? `/${primaryRole.toLowerCase()}` : "/"

  const ALL_NAV_ITEMS = useMemo<(NavItem & { group?: string })[]>(() => [
    { href: dashHref, label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { href: "/student/meetings", label: "Consultations", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { href: "/student/history", label: "History", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
    { href: "/faculty/meetings", label: "Meetings", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { href: "/faculty/availability", label: "Availability Rules", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
    { href: "/faculty/reports", label: "Department Reports", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { href: "/dean/upload", label: "Import Users", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" },
    { href: "/dean/departments", label: "My Department", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
    { href: "/faculty/upload", label: "Import Students", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" },
    { href: "/admin/access-config", label: "Access Config", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" },
    { href: "/admin/etl-hub", label: "ETL Hub", icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" },
  ], [dashHref])

  const flatItems = useMemo(() =>
    ALL_NAV_ITEMS.filter(
      (item) => (item.href === dashHref || (allowedPages && allowedPages.includes(item.href!))) && !reportHrefs.has(item.href!) && !evaluationHrefs.has(item.href!) && !dataHrefs.has(item.href!) && !hiddenHrefs.has(item.href!)
    ),
    [ALL_NAV_ITEMS, allowedPages, dashHref]
  )

  const isInReports = pathname.startsWith("/admin/reports") || pathname.startsWith("/faculty/reports")
  const reportsVisible = reportChildren.some((c) => c.href === dashHref || (allowedPages && allowedPages.includes(c.href!)))
  const reportsOpen = expandedGroups.has("reports") || isInReports

  const isInEvaluations = pathname.startsWith("/admin/evaluations") || pathname.startsWith("/dean/evaluations") || pathname.startsWith("/faculty/evaluations") || pathname.startsWith("/student/evaluations")
  const evaluationsVisible = evaluationChildren.some((c) => c.href === dashHref || (allowedPages && allowedPages.includes(c.href!)))
  const evaluationsOpen = expandedGroups.has("evaluations") || isInEvaluations

  const isInData = pathname.startsWith("/admin/data")
  const dataVisible = dataChildren.some((c) => c.href === dashHref || (allowedPages && allowedPages.includes(c.href!)))
  const dataOpen = expandedGroups.has("data") || isInData

  const tabItems = useMemo(() => {
    const items = flatItems.slice(0, 4)
    if (dataVisible) {
      items.push({ href: "#data", label: "Data", icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" })
    }
    if (reportsVisible) {
      items.push({ href: "#reports", label: "Reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" })
    }
    if (evaluationsVisible) {
      items.push({ href: "#evaluations", label: "Evaluations", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" })
    }
    return items
  }, [flatItems, dataVisible, reportsVisible, evaluationsVisible])

  if (status === "loading" || !session || !allowedPages) {
    return (
      <>
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 h-14 ios-blur bg-tab-bar border-t border-default animate-pulse" />
        <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 border-r border-slate-800 flex-col animate-pulse">
          <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-slate-800" />
            <div className="space-y-1.5">
              <div className="h-3 w-24 rounded bg-slate-800" />
              <div className="h-2 w-16 rounded bg-slate-800" />
            </div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <div className="px-3 mb-3">
              <div className="h-2 w-16 rounded bg-slate-800" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 min-h-[44px] rounded-lg">
                <div className="w-4 h-4 rounded bg-slate-800 shrink-0" />
                <div className="h-3.5 w-28 rounded bg-slate-800" />
              </div>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-800 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-24 rounded bg-slate-800" />
                <div className="h-2.5 w-14 rounded bg-slate-800" />
              </div>
            </div>
          </div>
        </aside>
      </>
    )
  }

  if (!role || !primaryRole) return null

  const isActiveTab = (href: string) => {
    if (href === "#reports") return isInReports
    if (href === "#evaluations") return isInEvaluations
    if (href === "#data") return isInData
    return pathname === href
  }

  return (
    <>
      {/* MOBILE: iOS 18+ Tab Bar */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 ios-blur bg-tab-bar border-t border-default pb-safe">
        <nav className="flex items-center justify-around h-14 px-1 max-w-lg mx-auto">
          {tabItems.map((item) => {
            const active = isActiveTab(item.href!)
            return (
              <Link
                key={item.href}
                href={item.href === "#reports" ? "/admin/reports/health" : item.href === "#evaluations" ? "/student/evaluations" : item.href === "#data" ? "/admin/data/users" : item.href!}
                className={`relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1 ios-tab-item ${
                  active ? "text-gold-600" : "text-tertiary"
                }`}
              >
                <div className="relative flex items-center justify-center w-6 h-6">
                  <svg
                    className="w-6 h-6 ios-tab-icon"
                    viewBox="0 0 24 24"
                    fill={active ? "currentColor" : "none"}
                    fillOpacity={active ? "0.2" : "1"}
                    stroke="currentColor"
                    strokeWidth={active ? 2 : 1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon!} />
                  </svg>
                  {item.badge && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-1.5 border-white dark:border-black" />
                  )}
                </div>
                <span className={`text-[10px] leading-none transition-all duration-300 ${
                  active ? "font-semibold scale-100" : "font-medium scale-95 opacity-70"
                }`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* DESKTOP: Sidebar */}
      <aside className={`hidden lg:flex fixed inset-y-0 left-0 z-40 bg-slate-950 border-r border-slate-800 flex-col transition-all duration-200 ${collapsed ? "w-16" : "w-64"}`}>
        <div className={`flex items-center h-16 border-b border-slate-800 shrink-0 ${collapsed ? "justify-center" : "gap-3 px-6"}`}>
          <div className="w-9 h-9 rounded-xl bg-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/20 shrink-0">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-white tracking-tight">e-Consultation</span>
              <p className="text-[10px] text-tertiary font-medium">Academic Portal</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {!collapsed && <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-tertiary mb-2">Main Menu</p>}

          {flatItems.map((link) => (
            <Link
              key={link.href}
              href={link.href!}
              className={`flex items-center min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-gold-600/10 text-gold-400 border border-gold-500/20"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent"
              } ${collapsed ? "justify-center px-0" : "gap-3 px-3"}`}
              title={collapsed ? link.label : undefined}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={link.icon!} />
              </svg>
              {!collapsed && link.label}
            </Link>
          ))}

          {dataVisible && !collapsed && (
            <div>
              <button
                onClick={() => toggleGroup("data")}
                className={`w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                  isInData
                    ? "bg-gold-600/10 text-gold-400 border border-gold-500/20"
                    : "text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent"
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                <span className="flex-1 text-left">Data Management</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${dataOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dataOpen && (
                <div className="ml-3 mt-1 space-y-0.5 border-l border-slate-800 pl-2">
                  {dataChildren
                    .filter((c) => (c.href === dashHref || (allowedPages && allowedPages.includes(c.href!))) && !hiddenHrefs.has(c.href!))
                    .map((child) => (
                      <Link
                        key={child.href}
                        href={child.href!}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          pathname === child.href
                            ? "bg-gold-600/10 text-gold-400 border border-gold-500/20"
                            : "text-tertiary hover:bg-slate-800/50 hover:text-white border border-transparent"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={child.icon!} />
                        </svg>
                        {child.label}
                      </Link>
                    ))}
                </div>
              )}
            </div>
          )}

          {dataVisible && collapsed && (
            <button
              type="button"
              onClick={() => setPopoverGroup(popoverGroup === "data" ? null : "data")}
              className={`flex items-center justify-center w-full min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                isInData || popoverGroup === "data"
                  ? "bg-gold-600/10 text-gold-400 border border-gold-500/20"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent"
              }`}
              title="Data Management"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </button>
          )}

          {reportsVisible && !collapsed && (
            <div>
              <button
                onClick={() => toggleGroup("reports")}
                className={`w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                  isInReports
                    ? "bg-gold-600/10 text-gold-400 border border-gold-500/20"
                    : "text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent"
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="flex-1 text-left">Reports</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${reportsOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {reportsOpen && (
                <div className="ml-3 mt-1 space-y-0.5 border-l border-slate-800 pl-2">
                  {reportChildren
                    .filter((c) => (c.href === dashHref || (allowedPages && allowedPages.includes(c.href!))) && !hiddenHrefs.has(c.href!))
                    .map((child) => (
                      <Link
                        key={child.href}
                        href={child.href!}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          pathname === child.href
                            ? "bg-gold-600/10 text-gold-400 border border-gold-500/20"
                            : "text-tertiary hover:bg-slate-800/50 hover:text-white border border-transparent"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={child.icon!} />
                        </svg>
                        {child.label}
                      </Link>
                    ))}
                </div>
              )}
            </div>
          )}

          {reportsVisible && collapsed && (
            <button
              type="button"
              onClick={() => setPopoverGroup(popoverGroup === "reports" ? null : "reports")}
              className={`flex items-center justify-center w-full min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                isInReports || popoverGroup === "reports"
                  ? "bg-gold-600/10 text-gold-400 border border-gold-500/20"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent"
              }`}
              title="Reports"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}

          {evaluationsVisible && !collapsed && (
            <div>
              <button
                onClick={() => toggleGroup("evaluations")}
                className={`w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                  isInEvaluations
                    ? "bg-gold-600/10 text-gold-400 border border-gold-500/20"
                    : "text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent"
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span className="flex-1 text-left">Evaluations</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${evaluationsOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {evaluationsOpen && (
                <div className="ml-3 mt-1 space-y-0.5 border-l border-slate-800 pl-2">
                  {evaluationChildren
                    .filter((c) => (c.href === dashHref || (allowedPages && allowedPages.includes(c.href!))) && !hiddenHrefs.has(c.href!))
                    .map((child) => (
                      <Link
                        key={child.href}
                        href={child.href!}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          pathname === child.href
                            ? "bg-gold-600/10 text-gold-400 border border-gold-500/20"
                            : "text-tertiary hover:bg-slate-800/50 hover:text-white border border-transparent"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={child.icon!} />
                        </svg>
                        {child.label}
                      </Link>
                    ))}
                </div>
              )}
            </div>
          )}

          {evaluationsVisible && collapsed && (
            <button
              type="button"
              onClick={() => setPopoverGroup(popoverGroup === "evaluations" ? null : "evaluations")}
              className={`flex items-center justify-center w-full min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                isInEvaluations || popoverGroup === "evaluations"
                  ? "bg-gold-600/10 text-gold-400 border border-gold-500/20"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent"
              }`}
              title="Evaluations"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </button>
          )}
        </nav>

        {collapsed && popoverGroup && (
          <div
            ref={popoverRef}
            className="fixed left-16 top-24 z-50 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl py-2 min-w-48"
          >
            <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-tertiary">
              {popoverGroup === "data" ? "Data Management" : popoverGroup === "reports" ? "Reports" : "Evaluations"}
            </p>
            {(popoverGroup === "data" ? dataChildren : popoverGroup === "reports" ? reportChildren : evaluationChildren)
              .filter((c) => (c.href === dashHref || (allowedPages && allowedPages.includes(c.href!))) && !hiddenHrefs.has(c.href!))
              .map((child) => (
                <Link
                  key={child.href}
                  href={child.href!}
                  onClick={() => setPopoverGroup(null)}
                  className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors ${
                    pathname === child.href
                      ? "bg-gold-600/10 text-gold-400"
                      : "text-tertiary hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={child.icon!} />
                  </svg>
                  {child.label}
                </Link>
              ))}
          </div>
        )}

        <div className={`border-t border-slate-800 shrink-0 space-y-1 ${collapsed ? "p-2" : "p-4"}`}>
          <button
            type="button"
            onClick={toggle}
            className={`flex items-center min-h-[44px] rounded-lg text-xs font-medium text-tertiary hover:text-white hover:bg-slate-800/50 transition-colors border border-slate-800 ${
              collapsed ? "justify-center w-full p-0" : "justify-center gap-2 px-3 w-full"
            }`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {collapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              )}
            </svg>
            {!collapsed && "Collapse"}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={`flex items-center min-h-[44px] rounded-lg text-xs font-medium text-tertiary hover:text-white hover:bg-slate-800/50 transition-colors border border-slate-800 ${
              collapsed ? "justify-center w-full p-0" : "justify-center gap-2 px-3 w-full"
            }`}
            title={collapsed ? "Sign out" : undefined}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>
    </>
  )
}
