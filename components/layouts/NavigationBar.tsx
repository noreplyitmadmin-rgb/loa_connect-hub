"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useNavigation } from "./NavigationStack"
import { useEffect, useState, useCallback } from "react"

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

interface NavBarItem {
  label: string
  onClick: () => void
  icon: React.ReactNode
}

interface NavigationBarProps {
  title?: string
  rightItems?: NavBarItem[]
}

function getInitial(name: string) {
  return name?.charAt(0)?.toUpperCase() || "?"
}

export default function NavigationBar({ title, rightItems }: NavigationBarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { goBack } = useNavigation()
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    Promise.resolve().then(() => {
      setMounted(true)
      const stored = localStorage.getItem("theme")
      setDark(stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme:dark)").matches))
    })
  }, [])

  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark")
    else document.documentElement.classList.remove("dark")
  }, [dark])

  const toggleTheme = useCallback(() => {
    setDark((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add("dark")
        localStorage.setItem("theme", "dark")
      } else {
        document.documentElement.classList.remove("dark")
        localStorage.setItem("theme", "light")
      }
      return next
    })
  }, [])

  useEffect(() => {
    const el = document.querySelector("main")
    if (!el) return

    const handleScroll = () => {
      setScrolled(el.scrollTop > 20)
    }

    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [])

  if (!pathname) return null

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/activate" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/change-password") ||
    pathname.startsWith("/setup-password")

  if (isAuthPage) return null

  const segments = pathname.split("/").filter(Boolean)
  const currentLabel =
    title ||
    (segments.length > 0
      ? LABELS[segments[segments.length - 1]] ||
        segments[segments.length - 1].charAt(0).toUpperCase() +
          segments[segments.length - 1].slice(1)
      : "")

  const isRootScreen =
    segments.length === 1 &&
    ["admin", "faculty", "student", "dean", "faq"].includes(segments[0])

  const showBackButton = segments.length > 1
  const showLargeTitle = isRootScreen

  return (
    <>
      <div className="lg:hidden ios-blur bg-nav-bar border-b border-default sticky top-0 z-30">
        <div className="flex items-center px-4 pt-safe">
          {showBackButton && (
            <button
              onClick={goBack}
              className="flex items-center justify-center -ml-1.5 mr-1 min-h-[44px] min-w-[44px] text-gold-600 active:opacity-60 transition-opacity shrink-0"
              aria-label="Go back"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1
            className={`font-bold text-primary flex-1 min-w-0 transition-all duration-200 ${
              showLargeTitle && !scrolled
                ? "text-[32px] leading-tight tracking-tight py-3"
                : "text-lg leading-tight py-2"
            }`}
          >
            {currentLabel}
          </h1>
          {rightItems && rightItems.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              {rightItems.map((item, i) => (
                <button
                  key={i}
                  onClick={item.onClick}
                  className="flex items-center justify-center min-h-[44px] min-w-[44px] text-gold-600 active:opacity-60 transition-opacity"
                  aria-label={item.label}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <nav className="hidden lg:flex items-center justify-between text-xs text-tertiary px-6 py-3 border-b border-default bg-surface shrink-0">
        <div className="flex items-center gap-1 min-w-0">
          {segments.map((seg, index) => {
            const href = "/" + segments.slice(0, index + 1).join("/")
            const label = LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1)
            return (
              <span key={href} className="flex items-center gap-1 min-w-0">
                {index > 0 && (
                  <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <span className={href === pathname ? "text-secondary font-semibold truncate" : "truncate"}>{label}</span>
              </span>
            )
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("app:refresh"))}
            className="text-xs p-1.5 rounded-lg border border-default bg-surface-hover hover:bg-surface-dim transition-colors"
            title="Refresh page"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <div className="flex items-center gap-2 border-l border-default pl-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md shrink-0">
              {getInitial(session?.user?.name || "")}
            </div>
            <span className="font-medium text-secondary">{session?.user?.name || "User"}</span>
          </div>

          <Link
            href="/faq"
            className="text-xs p-1.5 rounded-lg border border-default bg-surface-hover hover:bg-surface-dim transition-colors"
            title="FAQ"
          >
            <svg className="w-3.5 h-3.5 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </Link>

          {mounted ? (
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="text-xs p-1.5 rounded-lg border border-default bg-surface-hover hover:bg-surface-dim transition-colors"
            >
              {dark ? (
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          ) : (
            <div className="w-9 h-9" />
          )}
        </div>
      </nav>
    </>
  )
}
