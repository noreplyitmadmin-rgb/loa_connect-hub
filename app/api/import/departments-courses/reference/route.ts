import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { requireAdmin } from "@/lib/route-guard"

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const [deptsRes, coursesRes] = await Promise.all([
    supabase.from("departments").select("id, code").order("code", { ascending: true }),
    supabase.from("department_courses").select("id, \"departmentId\", code").order("code", { ascending: true }),
  ])

  if (deptsRes.error) return NextResponse.json({ error: deptsRes.error.message }, { status: 500 })
  if (coursesRes.error) return NextResponse.json({ error: coursesRes.error.message }, { status: 500 })

  return NextResponse.json({
    departments: deptsRes.data || [],
    departmentCourses: coursesRes.data || [],
  })
}
