import { NextResponse } from "next/server"
import { getSemesters, createSemester } from "@/features/admin-data/semesters.service"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { logAuditEvent } from "@/lib/services/audit"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const semesters = await getSemesters({})
    return NextResponse.json({ data: semesters }, { status: 200 })
  } catch (error) {
    console.error("Error fetching semesters", error)
    return NextResponse.json({ error: "Failed to fetch semesters" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || !hasRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden: Administrator role required to create semesters." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { title } = body
    
    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 })
    }

    const semester = await createSemester({ title })

    const currentUserId = (session!.user as Record<string, unknown>).id as string
    await logAuditEvent({
      userId: currentUserId,
      action: "CREATE_SEMESTER",
      details: `Created semester: ${title}`,
    })

    return NextResponse.json({ data: semester }, { status: 201 })
  } catch (error) {
    console.error("Error creating semester", error)
    return NextResponse.json({ error: (error as Error).message || "Failed to create semester." }, { status: 500 })
  }
}
