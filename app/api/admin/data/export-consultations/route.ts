import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { exportAndClearConsultations } from "@/lib/controllers/admin-data"
import { logAuditEvent } from "@/lib/services/audit"

export async function POST() {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || !hasRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const currentUserId = (session!.user as Record<string, unknown>).id as string

  try {
    const data = await exportAndClearConsultations()
    const count = data.appointments.length

    await logAuditEvent({
      userId: currentUserId,
      action: "CLEAR_CONSULTATIONS",
      details: `Exported and cleared ${count} consultation records with ${data.files.length} file(s), ${data.attendees.length} attendee(s), and ${data.timeSlots.length} time slot(s)`,
    })

    const json = JSON.stringify(data, null, 2)

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="consultations-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
