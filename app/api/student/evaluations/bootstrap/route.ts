import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { supabase } from "@/lib/supabase"
import { getEvaluationPeriods, getActiveEvaluationPeriod } from "@/features/admin-data/evaluation-periods.service"
import { getPendingEvaluations, getMyEvaluations } from "@/features/evaluations/evaluations.service"
import { rubricRepository } from "@/lib/repositories/factory"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as Record<string, unknown>).role as string
  const userId = (session.user as Record<string, unknown>).id as string

  if (!hasRole(role, "STUDENT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const periods = await getEvaluationPeriods()
    const activePeriod = await getActiveEvaluationPeriod()
    const activePeriodId = activePeriod?.id ?? null

    const [pending, evaluations, rubric] = await Promise.all([
      activePeriodId ? getPendingEvaluations(userId, activePeriodId) : Promise.resolve([]),
      activePeriodId ? getMyEvaluations(userId, activePeriodId) : Promise.resolve([]),
      activePeriodId
        ? rubricRepository.getCategoriesWithItems(activePeriodId).catch(() => null)
        : Promise.resolve(null),
    ])

    const pendingFacultyIds = [...new Set(pending.map((p) => p.evaluateeId))]
    const pendingSubjectIds = [...new Set(pending.map((p) => p.subjectId))]
    const [facultyRes, subjectRes] = await Promise.all([
      pendingFacultyIds.length > 0
        ? supabase.from("users").select("id, name, email").in("id", pendingFacultyIds)
        : { data: [] },
      pendingSubjectIds.length > 0
        ? supabase.from("subjects").select("id, code, name").in("id", pendingSubjectIds)
        : { data: [] },
    ])

    const facultyMap = new Map((facultyRes.data ?? []).map((u) => [u.id, u]))
    const subjectMap = new Map((subjectRes.data ?? []).map((s) => [s.id, s]))

    const enrichedPending = pending.map((p) => {
      const f = facultyMap.get(p.evaluateeId) as { name?: string; email?: string } | undefined
      const s = subjectMap.get(p.subjectId) as { code?: string; name?: string } | undefined
      return {
        evaluateeId: p.evaluateeId,
        evaluateeName: f?.name ?? "Unknown",
        evaluateeEmail: f?.email ?? "",
        facultySubjectId: p.facultySubjectId,
        subjectId: p.subjectId,
        subjectCode: s?.code ?? "",
        subjectName: s?.name ?? "",
      }
    })

    const evalFacultyIds = [...new Set(evaluations.map((e) => e.evaluateeId))]
    const evalFsIds = [
      ...new Set(evaluations.filter((e) => e.facultySubjectId).map((e) => e.facultySubjectId)),
    ]

    const [evalFacultyRes, fsRes] = await Promise.all([
      evalFacultyIds.length > 0
        ? supabase.from("users").select("id, name").in("id", evalFacultyIds)
        : { data: [] },
      evalFsIds.length > 0
        ? supabase.from("faculty_subjects").select("id, subject_id").in("id", evalFsIds)
        : { data: [] },
    ])

    const evalFacultyMap = new Map((evalFacultyRes.data ?? []).map((u) => [u.id, u]))
    const fsSubjectIdMap = new Map<string, string>()
    for (const fs of fsRes.data ?? []) {
      fsSubjectIdMap.set(fs.id, fs.subject_id as string)
    }

    const evalSubjectIds = [...new Set((fsRes.data ?? []).map((fs) => fs.subject_id as string))]
    const { data: evalSubjects } = evalSubjectIds.length > 0
      ? await supabase.from("subjects").select("id, code, name").in("id", evalSubjectIds)
      : { data: null }

    const evalSubjectMap = new Map((evalSubjects ?? []).map((s) => [s.id, s]))

    const enrichedEvaluations = evaluations.map((e) => {
      const subjectId = e.facultySubjectId ? (fsSubjectIdMap.get(e.facultySubjectId) ?? "") : ""
      const subj = subjectId ? (evalSubjectMap.get(subjectId) as { code?: string; name?: string } | undefined) : undefined
      const fac = evalFacultyMap.get(e.evaluateeId) as { name?: string } | undefined
      return {
        ...e,
        evaluateeName: fac?.name ?? "Unknown",
        subjectId,
        subjectCode: subj?.code ?? "",
        subjectName: subj?.name ?? "",
      }
    })

    return NextResponse.json({
      periods,
      activePeriodId,
      activePeriodName: activePeriod?.name ?? null,
      pending: enrichedPending,
      evaluations: enrichedEvaluations,
      rubric,
    })
  } catch {
    return NextResponse.json({ error: "Failed to load evaluation data" }, { status: 500 })
  }
}
