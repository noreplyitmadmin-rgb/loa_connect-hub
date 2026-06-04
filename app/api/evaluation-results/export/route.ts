import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { evaluationResultRepository } from "@/lib/repositories/factory"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as Record<string, unknown>).role as string
  if (!hasRole(role, "ADMIN") && !hasRole(role, "DEAN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const periodId = searchParams.get("periodId")
  const format = searchParams.get("format") || "csv"

  if (!periodId) return NextResponse.json({ error: "periodId is required" }, { status: 400 })

  try {
    const results = await evaluationResultRepository.list(periodId)
    if (format === "csv") {
      const header = "Faculty ID,General Rating,Respondents,Remarks"
      const rows = results.map((r) => `${r.facultyId},${r.generalRating ?? ""},${r.totalRespondents},${r.remarks ?? ""}`)
      const csv = [header, ...rows].join("\n")
      return new NextResponse(csv, {
        headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=evaluation-results.csv" },
      })
    }
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ error: "Failed to export results" }, { status: 500 })
  }
}
