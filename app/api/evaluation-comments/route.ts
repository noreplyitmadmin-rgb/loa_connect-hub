import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as Record<string, unknown>).role as string
  if (!hasRole(role, "ADMIN") && !hasRole(role, "DEAN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const periodId = searchParams.get("periodId")
  const sentimentLabel = searchParams.get("sentimentLabel")

  let q = supabase.from("evaluation_comments").select("*, evaluation:evaluations!inner(*)")
  if (periodId) q = q.eq("evaluation.periodId", periodId)
  if (sentimentLabel) q = q.eq("sentimentLabel", sentimentLabel)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comments: data })
}
