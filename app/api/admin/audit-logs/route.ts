import { NextRequest, NextResponse } from "next/server"
import { auditLogRepository } from "@/lib/repositories/factory"
import { requireAdmin } from "@/lib/route-guard"

export async function GET(req: NextRequest) {
  const authErr = await requireAdmin(req)
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)

  if (searchParams.get("getActions") === "true") {
    const actions = await auditLogRepository.getDistinctActions()
    return NextResponse.json({ actions })
  }

  const page = Number(searchParams.get("page")) || 1
  const pageSize = Number(searchParams.get("pageSize")) || 25
  const offset = Math.max(0, (page - 1) * pageSize)
  const exportCsv = searchParams.get("export") === "csv"

  const filters = {
    action: searchParams.get("action") || undefined,
    email: searchParams.get("email") || undefined,
    dateFrom: searchParams.get("from") || undefined,
    dateTo: searchParams.get("to") || undefined,
  }
  const orderBy = searchParams.get("orderBy") || undefined
  const orderDir = (searchParams.get("orderDir") as "asc" | "desc") || undefined

  const { logs, total } = await auditLogRepository.list(pageSize, offset, filters, orderBy, orderDir)

  if (exportCsv) {
    const header = "Timestamp,Action,User,Details\n"
    const rows = logs
      .map((l) =>
        [
          new Date(l.createdAt).toISOString(),
          l.action,
          l.email || "",
          (l.details || "").replace(/"/g, '""'),
        ]
          .map((v) => `"${v}"`)
          .join(","),
      )
      .join("\n")
    return new NextResponse(header + rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  return NextResponse.json({ logs, total, page, pageSize })
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireAdmin(req)
  if (authErr) return authErr

  await auditLogRepository.clearAll()
  return NextResponse.json({ success: true })
}
