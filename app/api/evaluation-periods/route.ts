import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { getSemesters, createSemester} from "@/lib/controllers/semesters"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const periods = await getSemesters()
    return NextResponse.json({ periods })
  } catch {
    return NextResponse.json({ error: "Failed to fetch evaluation periods" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const period = await createSemester(body)
    return NextResponse.json({ period }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create evaluation period" }, { status: 500 })
  }
}
