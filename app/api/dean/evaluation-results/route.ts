import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { supabase } from "@/lib/db"
import { departmentRepository, evaluationResultRepository } from "@/lib/repositories/factory"
import { findHighestLowestRubrics, getRemark } from "@/lib/evaluation-utils"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "DEAN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const evaluationPeriodId = searchParams.get("evaluationPeriodId") || searchParams.get("semesterId")
    const userId = (session.user as Record<string, unknown>).id as string
    if (!evaluationPeriodId) return NextResponse.json({ error: "periodId is required" }, { status: 400 })

    const dept = await departmentRepository.findByDeanId(userId)
    if (!dept) return NextResponse.json({ departments: [] })

    let results = await evaluationResultRepository.list(evaluationPeriodId, { departmentId: dept.id })
    if (results.length === 0) {
      await evaluationResultRepository.computeAll(evaluationPeriodId)
      results = await evaluationResultRepository.list(evaluationPeriodId, { departmentId: dept.id })
      if (results.length === 0) return NextResponse.json({ departments: [] })
    }

    const facIds = new Set(results.map((r) => r.facultyId))
    const { data: sentimentRows } = await supabase
      .from("evaluations")
      .select("evaluateeId, evaluation_comments(sentimentScore)")
      .eq("evaluation_period_id", evaluationPeriodId)
      .eq("status", "SUBMITTED")
      .eq("isDisabled", false)
      .not("facultySubjectId", "is", null)

    const sentByFaculty = new Map<string, number[]>()
    for (const row of sentimentRows ?? []) {
      const facId = row.evaluateeId as string
      if (!facIds.has(facId)) continue
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

    const catKeys = [
      "professionalManner", "communicationWithStudent", "studentEngagement",
      "learningMaterials", "timeManagement", "experientialLearning",
      "respectUniqueness", "assessmentAndFeedback",
    ] as const

    let facultyCount = 0
    let totalRespondents = 0
    const generalRatings: number[] = []
    const catSums: Record<string, number[]> = Object.fromEntries(catKeys.map((k) => [k, [] as number[]]))
    const sentimentScores: number[] = []
    const seenFacIds = new Set<string>()

    for (const row of results) {
      if (!seenFacIds.has(row.facultyId)) {
        seenFacIds.add(row.facultyId)
        facultyCount++
      }
      totalRespondents += row.totalRespondents
      if (row.generalRating !== null) generalRatings.push(row.generalRating)
      for (const key of catKeys) {
        const val = (row as unknown as Record<string, unknown>)[key]
        if (typeof val === "number") catSums[key].push(val)
      }
      const fs = avgSentByFaculty.get(row.facultyId)
      if (fs !== undefined) sentimentScores.push(fs)
    }

    const avgRating = generalRatings.length > 0
      ? Math.round(generalRatings.reduce((a, b) => a + b, 0) / generalRatings.length * 100) / 100
      : null

    const deptCatAverages: Record<string, number | null> = {}
    for (const key of catKeys) {
      const vals = catSums[key]
      deptCatAverages[key] = vals.length > 0
        ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100
        : null
    }

    const rubrics = findHighestLowestRubrics(deptCatAverages)
    const avgSentiment = sentimentScores.length > 0
      ? Math.round(sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length * 100) / 100
      : null

    return NextResponse.json({
      departments: [{
        departmentId: dept.id,
        departmentName: dept.name,
        departmentCode: dept.code ?? "",
        facultyCount,
        totalRespondents,
        avgRating,
        remarks: getRemark(avgRating),
        highestRubrics: rubrics.highest,
        lowestRubrics: rubrics.lowest,
        sentimentScore: avgSentiment,
      }],
    })
  } catch (e) {
    console.error("Dean evaluation results error:", e)
    return NextResponse.json({ error: "Failed to fetch evaluation results" }, { status: 500 })
  }
}
