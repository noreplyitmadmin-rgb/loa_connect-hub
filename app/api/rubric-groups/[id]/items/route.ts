import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { rubricRepository, rubricGroupRepository } from "@/lib/repositories/factory"

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
    const item = await rubricRepository.createItem({
      categoryId: body.categoryId,
      text: body.text,
      displayOrder: body.displayOrder,
      weight: body.weight ?? 1,
    })
    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
