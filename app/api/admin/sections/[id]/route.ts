import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { requireAdmin } from "@/lib/route-guard"
import { logAuditEvent } from "@/lib/services/audit"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const session = await auth()

  const { id } = await params

  try {
    const body = await request.json()
    const { name, program, isDisabled } = body

    const { data: existing } = await supabase.from("sections").select("*").eq("id", id).single()
    if (!existing) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (program !== undefined) updateData.program = program
    if (isDisabled !== undefined) updateData.isDisabled = !!isDisabled

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("sections")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Section with this name and program already exists" }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const currentUserId = (session!.user as Record<string, unknown>).id as string
    await logAuditEvent({
      userId: currentUserId,
      action: "UPDATE_SECTION",
      details: `Updated section ${existing.name} (${existing.program}): ${Object.keys(updateData).join(", ")}`,
    })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
