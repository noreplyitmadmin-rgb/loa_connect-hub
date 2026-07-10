import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/route-guard"
import { supabase } from "@/lib/db"
import { findHighestLowestRubrics, getRemark } from "@/lib/evaluation-utils"
import { evaluationResultRepository } from "@/lib/repositories/factory"

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get("semesterId")
    if (!semesterId) return NextResponse.json({ error: "periodId is required" }, { status: 400 })

    let results = await evaluationResultRepository.list(semesterId)
    if (results.length === 0) {
      await evaluationResultRepository.computeAll(semesterId)
      results = await evaluationResultRepository.list(semesterId)
      if (results.length === 0) return NextResponse.json({ departments: [] })
    }

    const { data: sentimentRows } = await supabase
      .from("evaluations")
      .select("evaluateeId, evaluation_comments(sentimentScore)")
      .eq("semesterId", semesterId)
      .eq("status", "SUBMITTED")
      .eq("isDisabled", false)
      .not("facultySubjectId", "is", null)

    const sentByFaculty = new Map<string, number[]>()
    for (const row of sentimentRows ?? []) {
      const facId = row.evaluateeId as string
      const comments = (row as unknown as { evaluation_comments: { sentimentScore: number | null }[] }).evaluation_comments ?? []
      for (const c of comments) {
        if (c.sentimentScore !== null) {
          if (!sentByFaculty.has(facId)) sentByFaculty.set(facId, [])
          sentByFaculty.get(facId)!.push(c.sentimentScore)
        }
      }
    }
    const avgSentByFaculty = new Map<string, number>()
    for (const [facId, scores] of sentByFaculty) {
      avgSentByFaculty.set(facId, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100)
    }

    const deptIds = [...new Set(results.map((r) => r.departmentId).filter(Boolean))]
    const { data: deptRows } = await supabase
      .from("departments")
      .select("id, name, code")
      .in("id", deptIds)
    const deptMap = new Map((deptRows ?? []).map((d) => [d.id, d]))

    const catKeys = [
      "professionalManner", "communicationWithStudent", "studentEngagement",
      "learningMaterials", "timeManagement", "experientialLearning",
      "respectUniqueness", "assessmentAndFeedback",
    ] as const

    const deptGroups = new Map<string, {
      departmentId: string
      facultyIds: Set<string>
      totalRespondents: number
      generalRatings: number[]
      catSums: Record<string, number[]>
      sentimentScores: number[]
    }>()

    for (const row of results) {
      const deptId = row.departmentId ?? "__unknown__"
      if (!deptGroups.has(deptId)) {
        deptGroups.set(deptId, {
          departmentId: deptId,
          facultyIds: new Set(),
          totalRespondents: 0,
          generalRatings: [],
          catSums: Object.fromEntries(catKeys.map((k) => [k, [] as number[]])),
          sentimentScores: [],
        })
      }
      const g = deptGroups.get(deptId)!
      g.facultyIds.add(row.facultyId)
      g.totalRespondents += row.totalRespondents
      if (row.generalRating !== null) g.generalRatings.push(row.generalRating)
      for (const key of catKeys) {
        const val = (row as unknown as Record<string, unknown>)[key]
        if (typeof val === "number") g.catSums[key].push(val)
      }
      const fs = avgSentByFaculty.get(row.facultyId)
      if (fs !== undefined) g.sentimentScores.push(fs)
    }

    const departments = Array.from(deptGroups.values()).map((g) => {
      const avgRating = g.generalRatings.length > 0
        ? Math.round(g.generalRatings.reduce((a, b) => a + b, 0) / g.generalRatings.length * 100) / 100
        : null

      const deptCatAverages: Record<string, number | null> = {}
      for (const key of catKeys) {
        const vals = g.catSums[key]
        deptCatAverages[key] = vals.length > 0
          ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100
          : null
      }

      const rubrics = findHighestLowestRubrics(deptCatAverages)
      const avgSentiment = g.sentimentScores.length > 0
        ? Math.round(g.sentimentScores.reduce((a, b) => a + b, 0) / g.sentimentScores.length * 100) / 100
        : null

      const dept = deptMap.get(g.departmentId)

      return {
        departmentId: g.departmentId,
        departmentName: dept?.name ?? (g.departmentId === "__unknown__" ? "Unassigned" : "Unknown"),
        departmentCode: dept?.code ?? "",
        facultyCount: g.facultyIds.size,
        totalRespondents: g.totalRespondents,
        avgRating,
        remarks: getRemark(avgRating),
        highestRubrics: rubrics.highest,
        lowestRubrics: rubrics.lowest,
        sentimentScore: avgSentiment,
      }
    })

    return NextResponse.json({ departments })
  } catch (e) {
    console.error("Admin evaluation results error:", e)
    return NextResponse.json({ error: "Failed to fetch evaluation results" }, { status: 500 })
  }
}
