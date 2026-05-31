import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { exportAndDeleteStudents } from "@/lib/controllers/admin-data"
import { logAuditEvent } from "@/lib/services/audit"

export async function POST() {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || !hasRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const currentUserId = (session!.user as Record<string, unknown>).id as string

  try {
    const data = await exportAndDeleteStudents()
    const count = data.students.length

    await logAuditEvent({
      userId: currentUserId,
      action: "DELETE_STUDENTS",
      details: `Exported and deleted ${count} student records; ${data.orphanedAppointmentIds.length} appointments orphaned`,
    })

    const json = JSON.stringify(data, null, 2)

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="students-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
