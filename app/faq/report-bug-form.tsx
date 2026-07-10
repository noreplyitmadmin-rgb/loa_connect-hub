"use client"

import { useState, useRef } from "react"
import SubmitButton from "@/components/ui/SubmitButton"

export default function ReportBugForm() {
  const [url, setUrl] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("idle")
    setErrorMsg("")

    try {
      const res = await fetch("/api/bug-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, description }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to submit bug report")
      }

      setStatus("success")
      setUrl("")
      setDescription("")
      formRef.current?.reset()
    } catch (err) {
      setStatus("error")
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <div className="card bg-surface p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-primary">Report a Bug</h2>
        <p className="text-sm text-tertiary mt-1">Found something wrong? Let us know and we&apos;ll look into it.</p>
      </div>

      {status === "success" && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
          Bug report submitted successfully. Thank you!
        </div>
      )}

      {status === "error" && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {errorMsg}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="bug-url" className="block text-sm font-medium text-secondary mb-1.5">
            Page URL
          </label>
          <input
            id="bug-url"
            type="url"
            required
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="input w-full"
          />
        </div>

        <div>
          <label htmlFor="bug-description" className="block text-sm font-medium text-secondary mb-1.5">
            Description
          </label>
          <textarea
            id="bug-description"
            required
            rows={4}
            placeholder="What happened? What did you expect to happen?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input w-full resize-y"
          />
        </div>

        <div className="flex justify-end">
          <SubmitButton>Submit Report</SubmitButton>
        </div>
      </form>
    </div>
  )
}
