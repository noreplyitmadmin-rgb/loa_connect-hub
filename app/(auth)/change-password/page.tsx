"use client"

import SubmitButton from "@/components/SubmitButton"
import { useState, FormEvent, use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface ChangePasswordProps {
  searchParams: Promise<{ token?: string }>
}

export default function ChangePasswordPage({ searchParams }: ChangePasswordProps) {
  const router = useRouter()
  const params = use(searchParams)
  const token = params.token

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [validating, setValidating] = useState(true)
  const [success, setSuccess] = useState(false)
  const [successName, setSuccessName] = useState("")

  useEffect(() => {
    if (!token) return
    fetch(`/api/auth/change-password/validate?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((d) => { throw new Error(d.error) })
      })
      .catch((err) => setError(err.message))
      .finally(() => setValidating(false))
  }, [token])

  if (!token) {
    return (
      <div className="w-full max-w-sm space-y-6">
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center">
          Invalid or missing activation token.
        </div>
        <p className="text-center">
          <Link href="/login" className="text-gold-600 hover:text-gold-700 font-semibold text-xs transition-colors">
            &larr; Back to login
          </Link>
        </p>
      </div>
    )
  }

  if (validating) {
    return (
      <div className="w-full max-w-sm flex items-center justify-center py-12">
        <svg className="animate-spin w-6 h-6 text-gold-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-sm space-y-6">
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center">
          {error}
        </div>
        <p className="text-center">
          <Link href="/forgot-password" className="text-gold-600 hover:text-gold-700 font-semibold text-xs transition-colors">
            Request a new reset link
          </Link>
        </p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="w-full max-w-sm space-y-6">
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-emerald-800 mb-1">Password Set!</h2>
          <p className="text-sm text-emerald-700">
            {successName ? `Welcome, ${successName}! ` : ""}Your password has been saved and a confirmation email has been sent to your inbox.
          </p>
          <p className="text-xs text-emerald-600 mt-3">
            If you did not authorize this change, contact your administrator immediately.
          </p>
        </div>
        <Link
          href="/login"
          className="block text-center w-full py-2.5 rounded-lg bg-gold-600 text-white text-sm font-semibold hover:bg-gold-700 transition-colors"
        >
          Go to Login
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError("")

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong")
        return
      }

      setSuccessName(data.name || "")
      setSuccess(true)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gold-600 flex items-center justify-center mb-3 shadow-lg shadow-gold-100">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800 font-display tracking-tight">Set Password</h1>
        <p className="text-slate-400 mt-1.5 text-xs font-semibold uppercase tracking-wider">Choose a secure password</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-slate-500 mb-1.5">
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input text-slate-800"
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-500 mb-1.5">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="input text-slate-800"
            placeholder="Re-enter your password"
          />
        </div>

        <SubmitButton type="submit" loading={loading} variant="primary" className="w-full py-2.5">
          {loading ? "Setting password..." : "Set Password"}
        </SubmitButton>
      </form>
    </div>
  )
}
