"use client"

import { usePathname } from "next/navigation"
import Sidebar from "./Sidebar"
import NavigationStack, { AnimatedPage } from "./NavigationStack"
import NavigationBar from "./NavigationBar"
import { useSidebar } from "@/lib/contexts/sidebar"
import { usePageTitle } from "@/lib/contexts/page-title"
import { BuildVersion } from "@/components/ui/BuildVersion"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { collapsed, exclusive } = useSidebar()
  const { title } = usePageTitle()

  const isStandalonePage =
    pathname.startsWith("/change-password") ||
    pathname.startsWith("/setup-password") ||
    pathname.startsWith("/evaluate")

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/activate" ||
    pathname === "/forgot-password"

  const hidden = isAuthPage || isStandalonePage || exclusive

  return (
    <div className="flex dvh-screen overflow-x-hidden bg-surface-muted">
      <div className={hidden ? "hidden" : ""}>
        <Sidebar />
      </div>
      <NavigationStack>
        <div className={`flex-1 flex flex-col overflow-hidden min-w-0 transition-all duration-200 ${hidden ? "lg:ml-0 duration-0" : collapsed ? "lg:ml-16" : "lg:ml-64"}`}>
          <div className={hidden ? "hidden" : ""}>
            <NavigationBar title={title} />
          </div>
          <AnimatedPage className={hidden ? "" : "overflow-hidden"}>
            <main className={`flex-1 overflow-y-auto ${hidden ? "" : "pb-24 lg:pb-6 px-4 sm:px-6 pt-4 sm:pt-6"}`}>
              {children}
            </main>
          </AnimatedPage>
        </div>
      </NavigationStack>
      <BuildVersion />
    </div>
  )
}
