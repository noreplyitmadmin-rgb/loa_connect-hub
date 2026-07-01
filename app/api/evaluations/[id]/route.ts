import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { getEvaluation } from "@/features/evaluations/evaluations.service"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = (session.user as Record<string, unknown>).id as string
  const { id } = await params
  try {
    const evaluation = await getEvaluation(id)
    if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (evaluation.evaluatorId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const [facultyRes, fsRes] = await Promise.all([
      supabase.from("users").select("name").eq("id", evaluation.evaluateeId).single(),
      evaluation.facultySubjectId
        ? supabase.from("faculty_subjects").select("subject_id").eq("id", evaluation.facultySubjectId).single()
        : Promise.resolve({ data: null }),
    ])

    let subjectCode = ""
    let subjectName = ""
    if (fsRes.data?.subject_id) {
      const { data: subj } = await supabase
        .from("subjects")
        .select("code, name")
        .eq("id", fsRes.data.subject_id)
        .single()
      if (subj) {
        subjectCode = subj.code
        subjectName = subj.name
      }
    }

    return NextResponse.json({
      evaluation: {
        ...evaluation,
        evaluateeName: (facultyRes.data as { name: string } | null)?.name || "Unknown",
        subjectId: fsRes.data?.subject_id || "",
        subjectCode,
        subjectName,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch evaluation" }, { status: 500 })
  }
}
