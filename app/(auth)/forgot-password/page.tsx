"use client"

import { useState, FormEvent, useEffect } from "react"
import Link from "next/link"

const RESEND_COOLDOWN = 60

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [state, setState] = useState<"idle" | "email-sent" | "activation-sent" | "not-found" | "not-activated">("idle")
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    setLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === "NOT_FOUND") setState("not-found")
        else if (data.code === "NOT_ACTIVATED") setState("not-activated")
        else setError(data.error || "Something went wrong")
        return
      }

      if (data.code === "ACTIVATION_SENT") {
        setState("activation-sent")
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

  if (state === "email-sent" || state === "activation-sent") {
    return (
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center mb-3 shadow-lg shadow-emerald-100">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 font-display tracking-tight">{state === "activation-sent" ? "Account Inactive" : "Check Your Email"}</h1>
          <p className="text-slate-400 mt-1.5 text-xs font-semibold uppercase tracking-wider">{state === "activation-sent" ? "Activation link sent" : "Reset link sent"}</p>
        </div>

      {state === "activation-sent" ? (
        <p className="text-sm text-slate-500 text-center">
          This account hasn&apos;t been activated yet. We sent an activation link to <span className="font-semibold text-slate-700">{email}</span>.
          Click the link to set your password and activate your account.
        </p>
      ) : (
        <p className="text-sm text-slate-500 text-center">
          We sent a password reset link to <span className="font-semibold text-slate-700">{email}</span>.
          Click the link to reset your password.
        </p>
      )}

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
        <h1 className="text-2xl font-extrabold text-slate-800 font-display tracking-tight">Forgot Password</h1>
        <p className="text-slate-400 mt-1.5 text-xs font-semibold uppercase tracking-wider">Enter your email to reset</p>
      </div>

      {state === "not-found" && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          No account found with this email. Contact your department administrator.
        </div>
      )}

      {state === "not-activated" && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
          This account hasn&apos;t been activated yet. We&apos;ve sent an activation link to your email. Please check your inbox.
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
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setState("idle") }}
            required
            className="input text-slate-800"
            placeholder="you@example.com"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full text-xs font-semibold py-2.5 mt-2">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending...
            </span>
          ) : "Send Reset Link"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-500 font-medium">
        Remember your password?{" "}
        <Link href="/login" className="text-gold-600 hover:text-gold-700 font-semibold transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
