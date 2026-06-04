import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { supabase } from "@/lib/supabase"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; categoryId: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { categoryId } = await params
  const body = await request.json()
  const { data, error } = await supabase.from("rubric_categories").update(body).eq("id", categoryId).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ category: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; categoryId: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { categoryId } = await params
  const { error } = await supabase.from("rubric_categories").delete().eq("id", categoryId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
