import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { rubricGroupRepository } from "@/lib/repositories/factory"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const group = await rubricGroupRepository.findById(id)
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ group })
  } catch {
    return NextResponse.json({ error: "Failed to fetch rubric group" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  try {
    const group = await rubricGroupRepository.findById(id)
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (group.seed) {
      return NextResponse.json({ error: "This is the original rubric group and cannot be edited. Duplicate it to create your own version." }, { status: 409 })
    }
    const locked = await rubricGroupRepository.isLocked(id)
    if (locked) {
      return NextResponse.json({ error: "Rubric group is locked (assigned to an active evaluation period). Duplicate it to make changes." }, { status: 409 })
    }
    const body = await request.json()
    const updated = await rubricGroupRepository.update(id, { name: body.name, description: body.description })
    return NextResponse.json({ group: updated })
  } catch {
    return NextResponse.json({ error: "Failed to update rubric group" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  try {
    const group = await rubricGroupRepository.findById(id)
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (group.seed) {
      return NextResponse.json({ error: "This is the original rubric group and cannot be deleted." }, { status: 409 })
    }
    const locked = await rubricGroupRepository.isLocked(id)
    if (locked) {
      return NextResponse.json({ error: "Rubric group is locked (assigned to an active evaluation period)." }, { status: 409 })
    }
    const { supabase } = await import("@/lib/db")
    const { error } = await supabase.from("rubric_groups").delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete rubric group" }, { status: 500 })
  }
}
