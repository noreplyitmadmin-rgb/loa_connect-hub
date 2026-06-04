import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { data, error } = await supabase.from("rubric_items").insert({
    categoryId: body.categoryId,
    text: body.text,
    displayOrder: body.displayOrder,
    weight: body.weight ?? 1,
  }).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}
