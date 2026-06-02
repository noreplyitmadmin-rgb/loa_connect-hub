"use client"

import { SessionProvider } from "next-auth/react"
import { SWRConfig } from "swr"
import { fetcher } from "@/lib/api/client"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig value={{ fetcher, revalidateOnFocus: false }}>
        {children}
      </SWRConfig>
    </SessionProvider>
  )
}
