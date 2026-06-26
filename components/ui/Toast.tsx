"use client"

import { useEffect, useState, useCallback } from "react"

interface ToastData {
  id: number
  message: string
  path?: string
  method?: string
}

let toastId = 0

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-white/90 text-blue-700",
  POST: "bg-white/90 text-emerald-700",
  PATCH: "bg-white/90 text-amber-700",
  PUT: "bg-white/90 text-amber-700",
  DELETE: "bg-white/90 text-red-700",
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; path?: string; method?: string }>).detail
      const id = ++toastId
      setToasts((prev) => [...prev, { id, message: detail.message, path: detail.path, method: detail.method }])
      setTimeout(() => remove(id), 5000)
    }
    window.addEventListener("app:toast", handler)
    return () => window.removeEventListener("app:toast", handler)
  }, [remove])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-red-600 text-white text-xs rounded-lg shadow-lg px-4 py-3 flex items-start gap-3 animate-in slide-in-from-right"
        >
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {t.method && (
                <span className={`text-[10px] font-bold px-1 py-px rounded ${METHOD_COLORS[t.method] || "bg-white/10 text-white/70"}`}>
                  {t.method}
                </span>
              )}
              <span className="font-semibold">{t.message}</span>
            </div>
            {t.path && <p className="text-[10px] opacity-80 font-mono truncate">{t.path}</p>}
          </div>
          <button onClick={() => remove(t.id)} className="text-white/60 hover:text-white shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
