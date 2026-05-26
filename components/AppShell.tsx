"use client"

import { usePathname } from "next/navigation"
import Sidebar from "./Sidebar"
import Breadcrumbs from "./Breadcrumbs"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/activate" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/change-password") ||
    pathname.startsWith("/setup-password")

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Breadcrumbs />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
