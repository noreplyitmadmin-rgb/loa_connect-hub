import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { requireAdmin } from "@/lib/route-guard"

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const [subjectsRes, sectionsRes, usersRes] = await Promise.all([
    supabase.from("subjects").select("id, code").order("code", { ascending: true }),
    supabase.from("sections").select("id, name, program").order("program", { ascending: true }).order("name", { ascending: true }),
    supabase.from("users").select("id, email"),
  ])

  if (subjectsRes.error) return NextResponse.json({ error: subjectsRes.error.message }, { status: 500 })
  if (sectionsRes.error) return NextResponse.json({ error: sectionsRes.error.message }, { status: 500 })
  if (usersRes.error) return NextResponse.json({ error: usersRes.error.message }, { status: 500 })

  const { data: roles } = await supabase
    .from("userrole")
    .select("\"userId\", \"roleName\"")
    .in("\"userId\"", usersRes.data.map((u) => u.id))

  const roleMap: Record<string, string> = {}
  if (roles) {
    for (const r of roles) {
      const uid = r.userId
      if (!roleMap[uid]) roleMap[uid] = r.roleName
      else if (!roleMap[uid].includes(r.roleName)) roleMap[uid] += "|" + r.roleName
    }
  }

  const enrichedUsers = usersRes.data.map((u) => ({
    id: u.id,
    email: u.email.toLowerCase(),
    role: roleMap[u.id] || null,
  }))

  return NextResponse.json({
    subjects: subjectsRes.data || [],
    sections: sectionsRes.data || [],
    users: enrichedUsers,
  })
}
