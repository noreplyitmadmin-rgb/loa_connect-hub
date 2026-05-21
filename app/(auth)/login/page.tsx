"use client"

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
  const [msLoading, setMsLoading] = useState(false)
  const error = searchParams.get("error")

  const testAccounts = [
    { label: "Admin", email: "admin@econsult.com" },
    { label: "Faculty 1", email: "faculty1@econsult.com" },
    { label: "Faculty 2", email: "faculty2@econsult.com" },
    { label: "Student", email: "student@econsult.com" },
  ]

  const fillAccount = (accountEmail: string) => {
    setEmail(accountEmail)
    setPassword("password123")
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await signIn("credentials", { email, password, callbackUrl: "/" })
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-3 shadow-lg shadow-indigo-100">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800 font-display tracking-tight">Welcome back</h1>
        <p className="text-slate-400 mt-1.5 text-xs font-semibold uppercase tracking-wider">Academic e-Consultations</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Invalid email credentials or password
        </div>
      )}

      {process.env.NEXT_PUBLIC_FEATURE_TEAMS === "true" && (
        <>
          <button
            onClick={() => { setMsLoading(true); signIn("azure-ad", { callbackUrl: "/" }) }}
            disabled={msLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-slate-700 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            {msLoading ? "Connecting to Microsoft..." : "Sign in with Microsoft Office 365"}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">or continue with email</span>
            </div>
          </div>
        </>
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
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input text-slate-800"
            placeholder="john.doe@university.edu"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-slate-500 mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input text-slate-800"
            placeholder="\u2022\u2022\u2022\u2022\u2022\u2022"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full text-xs font-semibold py-2.5 mt-2">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Signing in...
            </span>
          ) : "Sign in to Portal"}
        </button>
      </form>

      <div className="pt-4 border-t border-slate-100">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick fill test account</p>
        <div className="grid grid-cols-2 gap-2">
          {testAccounts.map((acct) => (
            <button
              key={acct.email}
              type="button"
              onClick={() => fillAccount(acct.email)}
              className="px-2 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 text-[11px] font-medium text-slate-600 transition-colors"
            >
              {acct.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-500 font-medium">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
          Create one now
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-sm flex items-center justify-center py-12">
        <svg className="animate-spin w-6 h-6 text-indigo-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
