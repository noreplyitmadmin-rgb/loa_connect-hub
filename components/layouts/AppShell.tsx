"use client"

import { usePathname } from "next/navigation"
import Sidebar from "./Sidebar"
import NavigationStack, { AnimatedPage } from "./NavigationStack"
import NavigationBar from "./NavigationBar"
import { useSidebar } from "@/lib/contexts/sidebar"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { collapsed, exclusive } = useSidebar()

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/activate" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/change-password") ||
    pathname.startsWith("/setup-password")

  if (isAuthPage || exclusive) {
    return <>{children}</>
  }

  return (
    <div className="flex dvh-screen overflow-x-hidden bg-surface-muted">
      <Sidebar />
      <NavigationStack>
        <div className={`flex-1 flex flex-col overflow-hidden min-w-0 transition-all duration-200 ${collapsed ? "lg:ml-16" : "lg:ml-64"}`}>
          <NavigationBar />
          <AnimatedPage className="overflow-hidden">
            <main className="flex-1 overflow-y-auto pb-24 lg:pb-6 px-4 sm:px-6 pt-4 sm:pt-6">
              {children}
            </main>
          </AnimatedPage>
        </div>
      </NavigationStack>
    </div>
  )
}
