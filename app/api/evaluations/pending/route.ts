import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { supabase } from "@/lib/supabase"
import { getActiveSemester } from "@/features/admin-data/semesters.service"
import { getPendingEvaluations } from "@/features/evaluations/evaluations.service"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as Record<string, unknown>).role as string
  const userId = (session.user as Record<string, unknown>).id as string

  if (!hasRole(role, "STUDENT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const activeSemester = await getActiveSemester()
    if (!activeSemester) {
      return NextResponse.json({ error: "No active semester" }, { status: 400 })
    }
    const pending = await getPendingEvaluations(userId, activeSemester.id)
    const facultyIds = pending.map((p) => p.evaluateeId)

    const { data: facultyUsers } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", facultyIds)
    const facultyMap = new Map((facultyUsers || []).map((u) => [u.id, u]))

    const result = pending.map((p) => {
      const f = facultyMap.get(p.evaluateeId)
      return {
        evaluateeId: p.evaluateeId,
        evaluateeName: f?.name || "Unknown",
        evaluateeEmail: f?.email || "",
      }
    })

    return NextResponse.json({ pending: result })
  } catch {
    return NextResponse.json({ error: "Failed to fetch pending evaluations" }, { status: 500 })
  }
}
