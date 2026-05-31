"use client"

import SubmitButton from "@/components/SubmitButton"
import { Suspense } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { useState, FormEvent } from "react"
import Link from "next/link"

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const error = searchParams.get("error")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    const callbackUrl = searchParams.get("callbackUrl") || "/"
    await signIn("credentials", { email, password, callbackUrl })
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-blk.png"
            alt="Lyceum of Alabang"
            className="h-10 object-contain"
          />
        </div>
        <h1 className="text-xl font-bold text-slate-800 font-display tracking-tight">Student Portal Sign In</h1>
        <p className="text-slate-500 mt-1 text-xs font-semibold uppercase tracking-wider">Academic e-Consultations</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Invalid email or password
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-500 transition-all"
            placeholder="you@itmlyceumalabang.onmicrosoft.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-500 transition-all"
            placeholder="******"
          />
        </div>

        <SubmitButton type="submit" loading={loading} variant="primary" className="w-full py-2.5">
          {loading ? "Signing in..." : "Sign In"}
        </SubmitButton>
      </form>

      <div className="text-center space-y-3">
        <Link href="/forgot-password" className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors">
          Forgot password?
        </Link>
        <p className="text-xs text-slate-500 font-medium">
          First time here?{" "}
          <Link href="/activate" className="text-gold-600 hover:text-gold-700 font-semibold transition-colors">
            Activate your account
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-sm flex items-center justify-center py-12">
        <svg className="animate-spin w-6 h-6 text-gold-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
