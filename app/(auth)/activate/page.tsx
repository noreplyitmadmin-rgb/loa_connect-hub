"use client"

import SubmitButton from "@/components/ui/SubmitButton"
import { useState, FormEvent, useEffect, use } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"

const REQUIRED_STUDENT_DOMAIN = "@itmlyceumalabang.onmicrosoft.com"
const REQUIRED_FACULTY_DOMAIN = "@lyceumalabang.edu.ph"
const RESEND_COOLDOWN = 60 // seconds

export default function ActivatePage(props: { searchParams?: Promise<{ callbackUrl?: string; token?: string }> }) {
  const searchParams = props.searchParams ? use(props.searchParams) : undefined
  const token = searchParams?.token
  const callbackUrl = searchParams?.callbackUrl || ""

  if (token) {
    const dest = `/change-password?token=${encodeURIComponent(token)}${callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`
    redirect(dest)
  }

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [state, setState] = useState<"idle" | "exists-activated" | "email-sent" | "not-found">("idle")
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError("")

    const trimmed = email.trim()
    if (!trimmed.toLowerCase().endsWith(REQUIRED_STUDENT_DOMAIN) && !trimmed.toLowerCase().endsWith(REQUIRED_FACULTY_DOMAIN)) {
      setError(`Email must end with ${REQUIRED_STUDENT_DOMAIN} or ${REQUIRED_FACULTY_DOMAIN}`)
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, callbackUrl }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === "NOT_FOUND") setState("not-found")
        else if (data.code === "ALREADY_ACTIVATED") setState("exists-activated")
        else setError(data.error || "Something went wrong")
        return
      }

      setCooldown(RESEND_COOLDOWN)
      setState("email-sent")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (state === "email-sent") {
    return (
      <div className="min-h-dvh flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center mb-6 shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-[28px] font-bold text-primary tracking-tight leading-tight">Check Your Email</h1>
            <p className="text-sm text-tertiary mt-2 leading-relaxed">
              We sent an activation link to <span className="font-semibold text-secondary">{email}</span>.
              Click the link to set your password.
            </p>

            <p className="text-sm text-tertiary mt-6">
              {cooldown > 0 ? (
                <>Resend available in <span className="font-semibold text-secondary">{cooldown}s</span></>
              ) : (
                <>Didn&apos;t receive it?{" "}
                  <button onClick={() => { setCooldown(RESEND_COOLDOWN); handleSubmit({ preventDefault: () => {} } as FormEvent) }} className="btn-ios-plain text-sm font-semibold">
                    Resend link
                  </button>
                </>
              )}
            </p>
            <div className="mt-8">
              <Link href="/login" className="btn-ios-plain text-sm font-semibold">
                &larr; Back to login
              </Link>
            </div>
          </div>
        </div>
        <div className="px-6 pb-8 text-center">
          <p className="text-xs text-tertiary">Lyceum of Alabang</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1119 9z" />
              </svg>
            </div>
          </div>

          <h1 className="text-[34px] font-bold text-primary text-center tracking-tight leading-tight">Activate Account</h1>
          <p className="text-base text-tertiary text-center mt-1">Enter your email to begin</p>

          {state === "exists-activated" && (
            <div className="mt-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
              This account is already activated. Please{" "}
              <Link href="/login" className="underline font-semibold">log in</Link> or use{" "}
              <Link href="/forgot-password" className="underline font-semibold">Forgot Password</Link>.
            </div>
          )}

          {state === "not-found" && (
            <div className="mt-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              No account found with this email. Contact your department administrator.
            </div>
          )}

          {error && (
            <div className="mt-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8">
            <div className="ios-table-section">
              <div className="ios-table-row !min-h-[48px] !p-0">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setState("idle") }}
                  required
                  autoComplete="email"
                  placeholder="Email Address"
                  inputMode="email"
                  enterKeyHint="done"
                  className="w-full h-full px-4 py-3 text-[16px] text-primary bg-transparent placeholder-tertiary outline-none border-none"
                />
              </div>
            </div>

            <SubmitButton type="submit" loading={loading} variant="ios-primary" className="w-full py-3 mt-6 text-base font-semibold">
              {loading ? "Checking..." : "Send Activation Link"}
            </SubmitButton>
          </form>

          <div className="text-center mt-6 space-y-4">
            <p className="text-sm text-tertiary font-medium">
              Already activated?{" "}
              <Link href="/login" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">
                Sign in
              </Link>
            </p>
            <Link href="/forgot-password" className="btn-ios-plain text-sm font-semibold">
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
      <div className="px-6 pb-8 text-center">
        <p className="text-xs text-tertiary">Lyceum of Alabang</p>
      </div>
    </div>
  )
}
