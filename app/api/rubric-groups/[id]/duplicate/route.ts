import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { rubricGroupRepository } from "@/lib/repositories/factory"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  try {
    const locked = await rubricGroupRepository.isLocked(id)
    if (locked) {
      return NextResponse.json({ error: "Rubric group is locked. Duplicate it to make changes." }, { status: 409 })
    }
    const body = await request.json()
    const newGroup = await rubricGroupRepository.duplicate(id, body.name)
    return NextResponse.json({ group: newGroup }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to duplicate rubric group" }, { status: 500 })
  }
}
