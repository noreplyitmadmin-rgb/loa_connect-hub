import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { requireAdminOrDean } from "@/lib/route-guard"
import { logAuditEvent } from "@/lib/services/audit"

export async function GET(request: NextRequest) {
  const authErr = await requireAdminOrDean(request)
  if (authErr) return authErr

  const [coursesRes, deptsRes] = await Promise.all([
    supabase
      .from("department_courses")
      .select("*")
      .order("departmentId", { ascending: true })
      .order("code", { ascending: true }),
    supabase
      .from("departments")
      .select("id, name, code")
  ])

  if (coursesRes.error) return NextResponse.json({ error: coursesRes.error.message }, { status: 500 })
  if (deptsRes.error) return NextResponse.json({ error: deptsRes.error.message }, { status: 500 })

  const deptsMap = new Map((deptsRes.data || []).map((d: Record<string, unknown>) => [d.id, d]))
  const joinedData = (coursesRes.data || []).map((c: Record<string, unknown>) => ({
    ...c,
    department: deptsMap.get(c.departmentId) || null
  }))

  return NextResponse.json(joinedData)
}

export async function POST(request: NextRequest) {
  const authErr = await requireAdminOrDean(request)
  if (authErr) return authErr

  const session = await auth()

  const body = await request.json()
  const { departmentId, name, code } = body

  if (!departmentId || !name || !code) {
    return NextResponse.json({ error: "departmentId, name, and code are required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("department_courses")
    .insert({ departmentId, name, code })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Course code already exists for this department" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: deptData } = await supabase
    .from("departments")
    .select("name, code")
    .eq("id", departmentId)
    .single()

  const responseData = {
    ...data,
    department: deptData || null
  }

  const currentUserId = (session!.user as Record<string, unknown>).id as string
  await logAuditEvent({
    userId: currentUserId,
    action: "CREATE_DEPARTMENT_COURSE",
    details: `Created course ${code} — ${name} for department ${departmentId}`,
  })

  return NextResponse.json(responseData)
}
