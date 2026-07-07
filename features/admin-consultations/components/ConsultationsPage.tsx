import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAllConsultations, getDepartments } from "@/features/admin-consultations/consultations.service"
import ConsultationsTable from "./ConsultationsTable"

export default async function ConsultationsPage(props: {
  searchParams?: Promise<{ departmentId?: string; status?: string; upcoming?: string; search?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const searchParams = await props.searchParams
  const departments = await getDepartments()

  const consultations = await getAllConsultations({
    departmentId: searchParams?.departmentId || undefined,
    status: searchParams?.status || undefined,
    upcoming: searchParams?.upcoming === "true" || undefined,
    search: searchParams?.search || undefined,
  })

  return (
    <div className="w-full space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Consultations</h1>
        <p className="text-sm text-tertiary mt-1">
          View all consultations and internal meetings across departments.
        </p>
      </div>

      <ConsultationsTable consultations={consultations} departments={departments} />
    </div>
  )
}
