import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { requireAdmin } from "@/lib/route-guard"

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")

  if (type === "faculty") {
    const { data, error } = await supabase
      .from("faculty_subjects")
      .select(`
        id,
        "semesterId",
        faculty:faculty_id (id, name, email, "departmentId"),
        subject:subject_id (id, code, name),
        section:section_id (id, name, program)
      `)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const sectionIds = [...new Set((data || []).map((r: Record<string, unknown>) => (r.section as Record<string, unknown>)?.id).filter(Boolean))]
    let counts: Record<string, number> = {}
    if (sectionIds.length > 0) {
      const { data: countData } = await supabase
        .from("student_enrollments")
        .select("section_id")
        .in("section_id", sectionIds)
      if (countData) {
        counts = (countData as { section_id: string }[]).reduce<Record<string, number>>((acc, r) => {
          acc[r.section_id] = (acc[r.section_id] || 0) + 1
          return acc
        }, {})
      }
    }

    const enriched = (data || []).map((r: Record<string, unknown>) => ({
      ...r,
      student_count: counts[(r.section as Record<string, unknown>)?.id as string] || 0,
    }))

    return NextResponse.json({ data: enriched })
  }

  if (type === "student") {
    const { data, error } = await supabase
      .from("student_enrollments")
      .select(`
        id,
        "semesterId",
        student:student_id (id, name, email),
        section:section_id (id, name, program),
        faculty_subject:faculty_subject_id (
          id,
          faculty:faculty_id (id, name, email),
          subject:subject_id (id, code, name),
          section:section_id (id, name, program)
        )
      `)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const enriched = (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      faculty_subject_id: (r.faculty_subject as Record<string, unknown> | null)?.id ?? null,
    }))
    return NextResponse.json({ data: enriched })
  }

  if (type === "subjects") {
    const { data, error } = await supabase.from("subjects").select("*").order("code", { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (type === "sections") {
    const { data, error } = await supabase.from("sections").select("*").order("program", { ascending: true }).order("name", { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'Invalid type — use "faculty", "student", "subjects", or "sections"' }, { status: 400 })
}
