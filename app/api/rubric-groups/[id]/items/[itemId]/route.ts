import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { rubricRepository, rubricGroupRepository } from "@/lib/repositories/factory"

async function assertEditable(groupId: string) {
  const group = await rubricGroupRepository.findById(groupId)
  if (!group) throw new Error("__NOT_FOUND__")
  if (group.seed) throw new Error("This is the original rubric group and cannot be modified. Duplicate it to create your own version.")
  const locked = await rubricGroupRepository.isLocked(groupId)
  if (locked) throw new Error("Rubric group is locked (assigned to an active evaluation period). Duplicate it to make changes.")
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id, itemId } = await params
  try {
    await assertEditable(id)
    const body = await request.json()
    const item = await rubricRepository.updateItem(itemId, body)
    return NextResponse.json({ item })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    if (message === "__NOT_FOUND__") return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id, itemId } = await params
  try {
    await assertEditable(id)
    await rubricRepository.deleteItem(itemId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    if (message === "__NOT_FOUND__") return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
