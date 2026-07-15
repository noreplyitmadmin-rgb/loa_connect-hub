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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  try {
    await assertEditable(id)
    const body = await request.json()
    const { supabase } = await import("@/lib/db")
    const { data, error } = await supabase
      .from("rubric_categories")
      .insert({ rubric_group_id: id, name: body.name, displayOrder: body.displayOrder })
      .select("*")
      .single()
    if (error) throw error
    return NextResponse.json({ category: data }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    if (message === "__NOT_FOUND__") return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  try {
    await assertEditable(id)
    const body = await request.json()
    if (!body.categoryId) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 })
    }
    await rubricRepository.deleteCategory(body.categoryId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    if (message === "__NOT_FOUND__") return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
