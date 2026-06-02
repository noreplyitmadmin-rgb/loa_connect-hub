"use client"

import SubmitButton from "@/components/SubmitButton"
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

    if (!email.toLowerCase().endsWith(REQUIRED_STUDENT_DOMAIN) && !email.toLowerCase().endsWith(REQUIRED_FACULTY_DOMAIN)) {
      setError(`Email must end with ${REQUIRED_STUDENT_DOMAIN} or ${REQUIRED_FACULTY_DOMAIN}`)
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, callbackUrl }),
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
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center mb-3 shadow-lg shadow-emerald-100">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 font-display tracking-tight">Check Your Email</h1>
          <p className="text-slate-400 mt-1.5 text-xs font-semibold uppercase tracking-wider">Activation link sent</p>
        </div>

        <p className="text-sm text-slate-500 text-center">
          We sent an activation link to <span className="font-semibold text-slate-700">{email}</span>.
          Click the link to set your password.
        </p>

        <p className="text-center text-xs text-slate-400">
          {cooldown > 0 ? (
            <>Resend available in <span className="font-semibold text-slate-600">{cooldown}s</span></>
          ) : (
            <>Didn&apos;t receive it?{" "}
              <button onClick={() => { setCooldown(RESEND_COOLDOWN); handleSubmit({ preventDefault: () => {} } as FormEvent) }} className="text-gold-600 hover:text-gold-700 font-semibold">
                Resend link
              </button>
            </>
          )}
        </p>
        <p className="text-center">
          <Link href="/login" className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors">
            &larr; Back to login
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gold-600 flex items-center justify-center mb-3 shadow-lg shadow-gold-100">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1119 9z" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800 font-display tracking-tight">Activate Account</h1>
        <p className="text-slate-400 mt-1.5 text-xs font-semibold uppercase tracking-wider">Enter your email to begin</p>
      </div>

      {state === "exists-activated" && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
          This account is already activated. Please{" "}
          <Link href="/login" className="underline font-semibold">log in</Link> or use{" "}
          <Link href="/forgot-password" className="underline font-semibold">Forgot Password</Link>.
        </div>
      )}

      {state === "not-found" && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          No account found with this email. Contact your department administrator.
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-slate-500 mb-1.5">
            Microsoft Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setState("idle") }}
            required
            className="input text-slate-800"
            placeholder={`user${REQUIRED_STUDENT_DOMAIN}`}
          />
        </div>

        <SubmitButton type="submit" loading={loading} variant="primary" className="w-full py-2.5">
          {loading ? "Checking..." : "Send Activation Link"}
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-xs text-slate-500 font-medium">
        Already activated?{" "}
        <Link href="/login" className="text-gold-600 hover:text-gold-700 font-semibold transition-colors">
          Sign in
        </Link>
      </p>
      <p className="text-center -mt-3">
        <Link href="/forgot-password" className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors">
          Forgot password?
        </Link>
      </p>
    </div>
  )
}
