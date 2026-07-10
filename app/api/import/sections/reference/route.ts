import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { requireAdmin } from "@/lib/route-guard"

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const [deptsRes, coursesRes, secRes] = await Promise.all([
    supabase.from("departments").select("id, code, name").order("code", { ascending: true }),
    supabase.from("department_courses").select("id, \"departmentId\", code, name"),
    supabase.from("sections").select("id, name, program, \"departmentCourseId\"").order("program", { ascending: true }).order("name", { ascending: true }),
  ])

  if (deptsRes.error) return NextResponse.json({ error: deptsRes.error.message }, { status: 500 })
  if (coursesRes.error) return NextResponse.json({ error: coursesRes.error.message }, { status: 500 })
  if (secRes.error) return NextResponse.json({ error: secRes.error.message }, { status: 500 })

  const deptsMap = new Map((deptsRes.data || []).map((d) => [d.id, d]))
  const enrichedCourses = (coursesRes.data || []).map((c) => ({
    ...c,
    department: deptsMap.get(c.departmentId) || null,
  }))

  return NextResponse.json({
    departments: deptsRes.data || [],
    departmentCourses: enrichedCourses,
    sections: secRes.data || [],
  })
}
