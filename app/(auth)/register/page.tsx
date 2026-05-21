"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"STUDENT" | "FACULTY">("STUDENT")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Registration failed")
      } else {
        router.push("/login")
      }
    } catch {
      setError("An error occurred during registration")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-3 shadow-lg shadow-indigo-100">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800 font-display tracking-tight">Create account</h1>
        <p className="text-slate-400 mt-1.5 text-xs font-semibold uppercase tracking-wider">Join Academic e-Consultations</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-xs font-semibold text-slate-500 mb-1.5">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="input text-slate-800"
            placeholder="John Doe"
          />
        </div>

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
            minLength={6}
            className="input text-slate-800"
            placeholder="\u2022\u2022\u2022\u2022\u2022\u2022 (at least 6 characters)"
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-xs font-semibold text-slate-500 mb-1.5">
            Account Role
          </label>
          <div className="relative">
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "STUDENT" | "FACULTY")}
              className="input appearance-none bg-white text-slate-800 text-sm pr-10 py-2.5"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236366f1' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 0.75rem center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "1.25rem",
              }}
            >
              <option value="STUDENT">Student</option>
              <option value="FACULTY">Faculty Consultant</option>
            </select>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full text-xs font-semibold py-2.5 mt-2">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={2} fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating account...
            </span>
          ) : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-500 font-medium">
        Already have an account?{" "}
        <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
