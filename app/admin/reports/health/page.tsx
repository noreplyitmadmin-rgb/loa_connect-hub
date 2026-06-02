import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAdminReportData } from "@/lib/controllers/admin-reports"
import { DepartmentHealthReport } from "@/components/reports/DepartmentHealthReport"

export default async function HealthReportPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  let data
  try {
    data = await getAdminReportData()
  } catch (err) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <h1 className="text-2xl font-bold text-slate-900">Department Consultation Health Report</h1>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-8 shadow-sm text-center">
          <p className="text-slate-500">{(err as Error).message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <DepartmentHealthReport departments={data.departments} />
    </div>
  )
}
