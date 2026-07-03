"use client"

import { useEffect, useCallback, useState } from "react"

interface Props {
  isOpen: boolean
  title?: string
  initialReason?: string
  onClose: () => void
  onConfirm: (reason: string) => void
  confirmLabel?: string
}

export default function ReasonModal({ isOpen, title = "Confirm action", initialReason = "", onClose, onConfirm, confirmLabel = "Confirm" }: Props) {
  const [reason, setReason] = useState(initialReason)

  useEffect(() => {
    if (isOpen) setReason(initialReason)
  }, [isOpen, initialReason])

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKey)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleKey)
      document.body.style.overflow = ""
    }
  }, [isOpen, handleKey])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface rounded-2xl shadow-ios-xl animate-fade-in overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <p className="text-base font-semibold text-primary">{title}</p>
          <p className="text-xs text-tertiary mt-2">Please provide a reason for this action (optional).</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full h-28 mt-3 p-3 rounded-lg border border-default bg-transparent text-sm text-secondary focus:outline-none"
            placeholder="Reason (optional)"
          />
        </div>
        <div className="flex border-t border-default">
          <button onClick={onClose} className="flex-1 py-3.5 text-sm font-semibold text-tertiary text-center transition-colors hover:bg-surface-hover active:bg-surface-tertiary min-h-[44px] border-r border-default">Cancel</button>
          <button onClick={() => { onConfirm(reason); onClose() }} className="flex-1 py-3.5 text-sm font-semibold text-center transition-colors hover:bg-surface-hover active:bg-surface-tertiary min-h-[44px] text-red-600">{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
