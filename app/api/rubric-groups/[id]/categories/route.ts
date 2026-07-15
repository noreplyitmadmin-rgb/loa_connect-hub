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
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await params
  try {
    const body = await request.json()
    if (!body.categoryId) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 })
    }
    await rubricRepository.deleteCategory(body.categoryId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
