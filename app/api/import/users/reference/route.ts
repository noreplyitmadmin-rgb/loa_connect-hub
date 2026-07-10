import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { requireAdmin } from "@/lib/route-guard"

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const [usersRes, deptsRes, dcRes] = await Promise.all([
    supabase.from("users").select("id, email"),
    supabase.from("departments").select("id, code"),
    supabase.from("department_courses").select("id, \"departmentId\", code, name"),
  ])

  if (usersRes.error) return NextResponse.json({ error: usersRes.error.message }, { status: 500 })
  if (deptsRes.error) return NextResponse.json({ error: deptsRes.error.message }, { status: 500 })
  if (dcRes.error) return NextResponse.json({ error: dcRes.error.message }, { status: 500 })

  const deptsMap = new Map((deptsRes.data || []).map((d) => [d.id, d]))
  const enrichedCourses = (dcRes.data || []).map((c) => ({
    ...c,
    department: deptsMap.get(c.departmentId) || null,
  }))

  return NextResponse.json({
    users: (usersRes.data || []).map((u) => ({ id: u.id, email: u.email.toLowerCase() })),
    departments: deptsRes.data || [],
    departmentCourses: enrichedCourses,
  })
}
