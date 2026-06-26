"use client"

import { useRouter } from "next/navigation"

const roleConfig: Record<string, { label: string; href: string; gradient: string; description: string }> = {
  ADMIN: { label: "Dashboard - Admin", href: "/admin", gradient: "from-purple-600 to-indigo-600", description: "System administration and user management" },
  DEAN: { label: "Dashboard - Dean", href: "/dean", gradient: "from-amber-500 to-orange-600", description: "Department oversight and reports" },
  FACULTY: { label: "Dashboard - Faculty", href: "/faculty", gradient: "from-emerald-500 to-teal-600", description: "Consultations and meetings" },
  STUDENT: { label: "Dashboard - Student", href: "/student", gradient: "from-blue-500 to-cyan-600", description: "Book consultations and track appointments" },
}

export default function MultiRoleDashboard({ roles }: { roles: string[] }) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">Welcome</h1>
          <p className="text-sm text-tertiary mt-1">You have access to multiple dashboards. Choose one to continue.</p>
        </div>

        <div className="space-y-3">
          {roles.map((r) => {
            const config = roleConfig[r]
            if (!config) return null
            return (
              <button
                key={r}
                onClick={() => router.push(config.href)}
                className={`w-full p-5 rounded-xl bg-gradient-to-r ${config.gradient} text-white text-left shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}
              >
                <p className="text-lg font-bold">{config.label}</p>
                <p className="text-sm text-white/80 mt-0.5">{config.description}</p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
