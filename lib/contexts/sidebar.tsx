"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface SidebarContextValue {
  collapsed: boolean
  toggle: () => void
  exclusive: boolean
  setExclusive: (value: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
  exclusive: false,
  setExclusive: () => {},
})

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [exclusive, setExclusive] = useState(false)
  const toggle = useCallback(() => setCollapsed((prev) => !prev), [])
  return (
    <SidebarContext.Provider value={{ collapsed, toggle, exclusive, setExclusive }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
