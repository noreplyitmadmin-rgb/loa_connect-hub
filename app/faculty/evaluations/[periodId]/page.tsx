import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasRole } from "@/lib/utils/roles"
import { getStudentBreakdownsForFaculty } from "@/features/evaluation-results/evaluation-results.repository"
import Link from "next/link"
import { notFound } from "next/navigation"

const CATEGORIES: { key: string; label: string }[] = [
  { key: "professionalManner", label: "Professional Manner" },
  { key: "communicationWithStudent", label: "Communication w/ Students" },
  { key: "studentEngagement", label: "Student Engagement" },
  { key: "learningMaterials", label: "Learning Materials" },
  { key: "timeManagement", label: "Time Management" },
  { key: "experientialLearning", label: "Experiential Learning" },
  { key: "respectUniqueness", label: "Respect for Uniqueness" },
  { key: "assessmentAndFeedback", label: "Assessment & Feedback" },
]

function formatRating(val: number | null): string {
  return val !== null ? val.toFixed(2) : "—"
}

export default async function FacultyEvalPeriodDetailPage({
  params,
}: {
  params: Promise<{ periodId: string }>
}) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "FACULTY"))
    redirect("/login")

  const { periodId } = await params
  const userId = (session.user as Record<string, unknown>).id as string

  const breakdowns = await getStudentBreakdownsForFaculty(periodId, userId)

  if (!breakdowns || breakdowns.length === 0) {
    notFound()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">Student Breakdown</h1>
          <p className="text-sm text-tertiary mt-1">{breakdowns.length} student response{breakdowns.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/faculty/evaluations" className="text-sm text-blue-600 hover:underline">
          Back to results
        </Link>
      </div>

      {breakdowns.map((b, i) => {
        const scores = CATEGORIES.map((c) => ({
          label: c.label,
          val: (b as unknown as Record<string, number | null>)[c.key] ?? null,
        }))
        const general = b.generalRating

        return (
          <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary">Student #{i + 1}</h3>
              <span className="text-sm font-bold text-primary">
                General: {formatRating(general)}
              </span>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {scores.map((s) => (
                <div key={s.label} className="flex items-center justify-between py-1">
                  <span className="text-xs text-tertiary">{s.label}</span>
                  <span className="text-xs font-semibold text-primary">{formatRating(s.val)}</span>
                </div>
              ))}
            </div>
            {b.comment && (
              <div className="px-5 py-3 border-t border-slate-100">
                <p className="text-xs text-tertiary font-semibold mb-1">Comment</p>
                <p className="text-sm text-primary whitespace-pre-wrap">{b.comment}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
