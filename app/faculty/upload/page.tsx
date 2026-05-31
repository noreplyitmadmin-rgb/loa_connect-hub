"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import SubmitButton from "@/components/SubmitButton"

interface ImportRow {
  name: string
  email: string
  role: string
  course: string | null
}

interface ImportResult {
  created: ImportRow[]
  skipped: { row: number; email: string; reason: string }[]
  errors: { row: number; email?: string; message: string }[]
  parseErrors: { row: number; message: string }[]
}

interface AllowedCourse {
  code: string
  name: string
}

export default function FacultyUploadPage() {
  const { data: session } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [allowedCourses, setAllowedCourses] = useState<AllowedCourse[]>([])
  const [deptName, setDeptName] = useState("")

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch("/api/admin/department-courses")
        if (!res.ok) return
        const allCourses: { code: string; name: string; departmentId: string; department: { name: string } }[] = await res.json()
        const userId = (session?.user as Record<string, unknown>)?.id as string
        const usersRes = await fetch("/api/admin/users")
        if (!usersRes.ok) return
        const usersData = await usersRes.json()
        const myDept = (usersData.departments || []).find((d: Record<string, unknown>) => d.deanId === userId)
        if (myDept) {
          setDeptName(myDept.name)
          setAllowedCourses(allCourses.filter((c) => c.departmentId === myDept.id))
        } else {
          const user = usersData.users?.find((u: Record<string, unknown>) => u.id === userId)
          if (user?.departmentId) {
            setAllowedCourses(allCourses.filter((c) => c.departmentId === user.departmentId))
          }
        }
      } catch { /* ignore */ }
    }
    if (session) fetchCourses()
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError("")
    setResult(null)

    const file = fileRef.current?.files?.[0]
    if (!file) { setError("Please select a CSV file"); return }

    const formData = new FormData()
    formData.append("file", file)

    setLoading(true)
    try {
      const res = await fetch("/api/import/students", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Upload failed"); return }
      setResult(data)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import Students</h1>
        <p className="text-sm text-slate-500 mt-1">Upload a CSV file to create student accounts.</p>
      </div>

      {allowedCourses.length > 0 && (
        <div className="card p-4 bg-blue-50 border border-blue-200 space-y-2">
          <p className="text-xs font-semibold text-blue-700">Allowed Courses for {deptName || "Your Department"}</p>
          <div className="flex flex-wrap gap-2">
            {allowedCourses.map((c) => (
              <span key={c.code} className="text-xs font-mono font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {c.code}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-blue-500">Course codes are limited to 10 characters. Only courses listed above are valid.</p>
        </div>
      )}

      <div className="card p-6 bg-white space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">CSV Template</h2>
          <a
            href="/api/import/students"
            download="import_students_template.csv"
            className="text-xs font-semibold text-gold-600 hover:text-gold-800 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Template
          </a>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 text-xs font-mono text-slate-600 leading-relaxed">
          name, microsoft email, course<br />
          Alice Student, alice.student@itmlyceumalabang.onmicrosoft.com, BSIT<br />
          Bob Martinez, bob.martinez@itmlyceumalabang.onmicrosoft.com, BSCS
        </div>
        <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
          <li><strong>Header row required</strong> — must match: <code className="bg-slate-100 px-1 rounded">name, microsoft email, course</code></li>
          <li>All imported users are created with <strong>STUDENT</strong> role</li>
          <li><strong>Course</strong> is optional but must be one of the allowed courses listed above if provided</li>
          <li>Course codes are <strong>limited to 10 characters</strong></li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 bg-white space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">CSV File</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gold-50 file:text-gold-700 hover:file:bg-gold-100"
          />
        </div>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        <SubmitButton type="submit" loading={loading} variant="primary">
          Upload & Import
        </SubmitButton>
      </form>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4 bg-white text-center">
              <p className="text-2xl font-bold text-emerald-600">{result.created.length}</p>
              <p className="text-xs font-semibold text-slate-500">Created</p>
            </div>
            <div className="card p-4 bg-white text-center">
              <p className="text-2xl font-bold text-amber-600">{result.skipped.length}</p>
              <p className="text-xs font-semibold text-slate-500">Skipped</p>
            </div>
            <div className="card p-4 bg-white text-center">
              <p className="text-2xl font-bold text-red-600">{result.errors.length + result.parseErrors.length}</p>
              <p className="text-xs font-semibold text-slate-500">Errors</p>
            </div>
          </div>

          {result.created.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700">Created Students</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Email</th>
                      <th className="pb-2 pr-4">Course</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.created.map((u) => (
                      <tr key={u.email} className="border-b border-slate-100">
                        <td className="py-2 pr-4 text-slate-800">{u.name}</td>
                        <td className="py-2 pr-4 text-slate-600 text-xs">{u.email}</td>
                        <td className="py-2 pr-4 text-slate-500 text-xs">{u.course || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {result.skipped.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700">Skipped</h3>
              <div className="text-xs text-slate-500 space-y-1">
                {result.skipped.map((s) => (
                  <p key={`skip-${s.row}`}>Row {s.row}: {s.email} — {s.reason}</p>
                ))}
              </div>
            </section>
          )}

          {(result.parseErrors.length > 0 || result.errors.length > 0) && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700">Errors</h3>
              <div className="text-xs text-red-600 space-y-1">
                {result.parseErrors.map((e) => (
                  <p key={`parse-${e.row}`}>Row {e.row}: {e.message}</p>
                ))}
                {result.errors.map((e, idx) => (
                  <p key={`err-${idx}`}>Row {e.row}: {e.email ? `${e.email} — ` : ""}{e.message}</p>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
