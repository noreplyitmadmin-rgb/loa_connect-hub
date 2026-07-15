import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { rubricGroupRepository } from "@/lib/repositories/factory"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const groups = await rubricGroupRepository.list()
    return NextResponse.json({ groups })
  } catch {
    return NextResponse.json({ error: "Failed to fetch rubric groups" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const group = await rubricGroupRepository.create(body.name, body.description)
    return NextResponse.json({ group }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create rubric group" }, { status: 500 })
  }
}
