import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { studentCancelAppointment } from "@/lib/controllers/appointments"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const studentId = (session.user as any).id
  const { id } = await params

  try {
    const appointment = await studentCancelAppointment(id, studentId)
    return NextResponse.json({ appointment })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Action failed" },
      { status: 400 }
    )
  }
}
