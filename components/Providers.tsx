"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { SessionProvider } from "next-auth/react"
import { SWRConfig } from "swr"
import { fetcher } from "@/lib/api/client"
import { SidebarProvider } from "@/lib/contexts/sidebar"

function RefreshListener({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    const handler = () => router.refresh()
    window.addEventListener("app:refresh", handler)
    return () => window.removeEventListener("app:refresh", handler)
  }, [router])
  return <>{children}</>
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig value={{ fetcher, revalidateOnFocus: false }}>
        <SidebarProvider>
          <RefreshListener>
            {children}
          </RefreshListener>
        </SidebarProvider>
      </SWRConfig>
    </SessionProvider>
  )
}
