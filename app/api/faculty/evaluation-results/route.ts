import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/db"
import { evaluationResultRepository } from "@/lib/repositories/factory"

const CATEGORY_NAMES: Record<string, string> = {
  "Professional Manner": "professionalManner",
  "Communication with Students": "communicationWithStudent",
  "Student Engagement": "studentEngagement",
  "Learning Materials": "learningMaterials",
  "Time Management": "timeManagement",
  "Experiential Learning": "experientialLearning",
  "Respect for Uniqueness": "respectUniqueness",
  "Assessment and Feedback": "assessmentAndFeedback",
}

function getRemark(general: number | null): string | null {
  if (general === null) return null
  if (general >= 4.5) return "Outstanding"
  if (general >= 3.5) return "Very Satisfactory"
  if (general >= 2.5) return "Satisfactory"
  if (general >= 1.5) return "Unsatisfactory"
  return "Poor"
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get("periodId")
    const userId = (session.user as Record<string, unknown>).id as string
    if (!periodId) return NextResponse.json({ error: "periodId is required" }, { status: 400 })

    // Check visibility
    const visMap = await evaluationResultRepository.getVisibilityMap(periodId)
    if (!visMap.get(userId)) {
      return NextResponse.json({ results: [], facultyNames: {} })
    }

    // Get evaluations for this faculty
    const { data: evals, error: evErr } = await supabase
      .from("evaluations")
      .select("id")
      .eq("semesterId", periodId)
      .eq("evaluateeId", userId)
      .eq("status", "SUBMITTED")
    if (evErr) throw evErr

    if (!evals || evals.length === 0) {
      return NextResponse.json({ results: [], facultyNames: {} })
    }

    const evaluationIds = evals.map((e) => e.id)

    // Get ratings
    const { data: ratings, error: rErr } = await supabase
      .from("evaluation_ratings")
      .select("rating, rubric_items!inner(categoryId, rubric_categories!inner(name))")
      .in("evaluationId", evaluationIds)
    if (rErr) throw rErr

    // Compute category averages
    const catRatings: Record<string, number[]> = {}
    for (const r of (ratings || []) as unknown as Array<{
      rating: number
      rubric_items: { categoryId: string; rubric_categories: { name: string } }
    }>) {
      const catName = r.rubric_items.rubric_categories.name
      if (!catRatings[catName]) catRatings[catName] = []
      catRatings[catName].push(r.rating)
    }

    const catAverages: Record<string, number> = {}
    for (const [cat, vals] of Object.entries(catRatings)) {
      catAverages[cat] = vals.reduce((a, b) => a + b, 0) / vals.length
    }

    const general = Object.keys(catAverages).length > 0
      ? Object.values(catAverages).reduce((a, b) => a + b, 0) / Object.keys(catAverages).length
      : null

    const result: Record<string, unknown> = {
      id: `${periodId}_${userId}`,
      semesterId: periodId,
      facultyId: userId,
      departmentId: null,
      totalRespondents: evaluationIds.length,
      generalRating: general !== null ? Math.round(general * 100) / 100 : null,
      remarks: getRemark(general),
      professionalManner: null,
      communicationWithStudent: null,
      studentEngagement: null,
      learningMaterials: null,
      timeManagement: null,
      experientialLearning: null,
      respectUniqueness: null,
      assessmentAndFeedback: null,
    }

    for (const [catName, avg] of Object.entries(catAverages)) {
      const col = CATEGORY_NAMES[catName]
      if (col) {
        result[col] = Math.round(avg * 100) / 100
      }
    }

    // Get user's name
    const { data: user } = await supabase
      .from("users")
      .select("name")
      .eq("id", userId)
      .single()

    return NextResponse.json({
      results: [result],
      facultyNames: { [userId]: user?.name || userId },
    })
  } catch (e) {
    console.error("Faculty evaluation results error:", e)
    return NextResponse.json({ error: "Failed to fetch evaluation results" }, { status: 500 })
  }
}
