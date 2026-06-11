"use client"

import { useEffect } from "react"
import { useSidebar } from "@/lib/contexts/sidebar"

export default function Loading() {
  const { setExclusive } = useSidebar()

  useEffect(() => {
    setExclusive(true)
    return () => setExclusive(false)
  }, [setExclusive])

  return (
    <div className="min-h-dvh bg-surface-muted">
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 dark:bg-black/90 backdrop-blur-lg shadow-lg">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16">
          <div className="w-20 h-4 bg-slate-700/60 rounded-full animate-pulse" />
          <div className="space-y-1.5 text-right">
            <div className="h-3.5 w-48 bg-slate-700/60 rounded-full animate-pulse ml-auto" />
            <div className="h-2.5 w-32 bg-slate-700/40 rounded-full animate-pulse ml-auto" />
          </div>
        </div>
      </header>

      <div className="pt-20 sm:pt-22 pb-12 animate-pulse">
        <div className="md:hidden mx-auto max-w-5xl px-4 sm:px-8 mb-4">
          <div className="h-2 bg-surface-tertiary rounded-full" />
        </div>

        <div className="mx-auto max-w-5xl flex gap-0 px-4 sm:px-8">
          <div className="hidden md:block w-52 lg:w-60 shrink-0 -ml-4">
            <div className="sticky top-24 pl-4 pr-6 lg:pr-8 border-r border-default min-h-[calc(100dvh-10rem)]">
              <div className="flex flex-col gap-0 pt-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-surface-tertiary shrink-0" />
                      {i < 5 && <div className="w-0.5 h-6 bg-surface-tertiary" />}
                    </div>
                    <div className="pt-1.5 h-4 bg-surface-tertiary rounded w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-5 md:pl-8 lg:pl-12">
            <div className="mb-8 h-2.5 bg-surface-tertiary rounded-full" />
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-default">
                <div className="h-1.5 bg-surface-tertiary" />
                <div className="p-5 sm:p-7 space-y-4">
                  <div className="h-5 bg-surface-tertiary rounded w-1/3" />
                  {[1, 2].map((i) => (
                    <div key={i} className="space-y-3 pt-2">
                      <div className="h-4 bg-surface-tertiary rounded w-full" />
                      <div className="h-4 bg-surface-tertiary rounded w-3/4" />
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((j) => (
                          <div key={j} className="h-12 sm:h-14 bg-surface-tertiary rounded-2xl" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
