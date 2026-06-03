import type { ReactNode } from "react"

interface ReportHeaderProps {
  title: string
  children?: ReactNode
}

export function ReportHeader({ title, children }: ReportHeaderProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {children}
    </div>
  )
}
