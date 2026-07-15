export const CATEGORY_NAMES: Record<string, string> = {
  "Professional Manner": "professionalManner",
  "Communication with Students": "communicationWithStudent",
  "Student Engagement": "studentEngagement",
  "Learning Materials": "learningMaterials",
  "Time Management": "timeManagement",
  "Experiential Learning Provided to Students": "experientialLearning",
  "Experiential Learning": "experientialLearning",
  "Respect the Uniqueness of the Students": "respectUniqueness",
  "Respect for Uniqueness": "respectUniqueness",
  "Assessment and Feedback": "assessmentAndFeedback",
}

export const CATEGORY_KEYS = [
  "professionalManner",
  "communicationWithStudent",
  "studentEngagement",
  "learningMaterials",
  "timeManagement",
  "experientialLearning",
  "respectUniqueness",
  "assessmentAndFeedback",
] as const

export type RubricKey = (typeof CATEGORY_KEYS)[number]

export const CATEGORY_LABELS: Record<RubricKey, string> = {
  professionalManner: "Professional Manner",
  communicationWithStudent: "Communication w/ Students",
  studentEngagement: "Student Engagement",
  learningMaterials: "Learning Materials",
  timeManagement: "Time Management",
  experientialLearning: "Experiential Learning",
  respectUniqueness: "Respect for Uniqueness",
  assessmentAndFeedback: "Assessment & Feedback",
}

export function getRemark(general: number | null): string | null {
  if (general === null) return null
  if (general >= 4.5) return "Outstanding"
  if (general >= 3.5) return "Very Satisfactory"
  if (general >= 2.5) return "Satisfactory"
  if (general >= 1.5) return "Unsatisfactory"
  return "Poor"
}

export interface RatingRow {
  rating: number
  rubric_items: { categoryId: string; rubric_categories: { name: string } }
}

export interface CategoryAverages {
  [categoryName: string]: number
}

export function computeCategoryAverages(ratings: RatingRow[]): CategoryAverages {
  const catRatings: Record<string, number[]> = {}
  for (const r of ratings) {
    const catName = r.rubric_items.rubric_categories.name
    if (!catRatings[catName]) catRatings[catName] = []
    catRatings[catName].push(r.rating)
  }
  const catAverages: CategoryAverages = {}
  for (const [cat, vals] of Object.entries(catRatings)) {
    catAverages[cat] = vals.reduce((a, b) => a + b, 0) / vals.length
  }
  return catAverages
}

export function computeGeneralRating(catAverages: CategoryAverages): number | null {
  const keys = Object.keys(catAverages)
  if (keys.length === 0) return null
  return Math.round(keys.reduce((sum, k) => sum + catAverages[k], 0) / keys.length * 100) / 100
}

export function mapCategoryAveragesToColumns(catAverages: CategoryAverages): Record<string, number | null> {
  const row: Record<string, number | null> = {
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
    if (col) row[col] = Math.round(avg * 100) / 100
  }
  return row
}

export function findHighestLowestRubrics(catAverages: Record<string, number | null>): {
  highest: { key: string; label: string; score: number }[]
  lowest: { key: string; label: string; score: number }[]
} {
  const entries = Object.entries(catAverages)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => ({ key: k, label: CATEGORY_LABELS[k as RubricKey] || k, score: v as number }))
  if (entries.length === 0) return { highest: [], lowest: [] }
  const maxScore = Math.max(...entries.map((e) => e.score))
  const minScore = Math.min(...entries.map((e) => e.score))
  return {
    highest: entries.filter((e) => e.score === maxScore),
    lowest: entries.filter((e) => e.score === minScore),
  }
}

export function computeSentimentScore(comments: { sentimentScore: number | null }[]): number | null {
  const scored = comments.filter((c) => c.sentimentScore !== null).map((c) => c.sentimentScore as number)
  if (scored.length === 0) return null
  return Math.round(scored.reduce((a, b) => a + b, 0) / scored.length * 100) / 100
}

export function getRemarkColor(remarks: string | null): string {
  switch (remarks) {
    case "Outstanding": return "bg-success-bg text-success-text"
    case "Very Satisfactory": return "bg-info-bg text-info-text"
    case "Satisfactory": return "bg-warning-bg text-warning-text"
    case "Unsatisfactory": return "bg-danger-bg text-danger-text"
    case "Poor": return "bg-danger-bg text-danger-text"
    default: return "bg-surface-tertiary text-tertiary"
  }
}

export function formatPeriodLabel(period: { name?: string; title?: string; semesterTitle?: string; id: string }): string {
  const base = period.name || period.title || period.id
  return period.semesterTitle ? `${base} — ${period.semesterTitle}` : base
}

export interface FlatSnapshotRow {
  id: string
  evaluation_period_id: string
  rubric_group_id: string
  rubric_group_name: string
  category_name: string
  category_display_order: number
  item_text: string
  item_display_order: number
  item_weight: number
}

export interface NestedRubricCategory {
  id: string
  name: string
  displayOrder: number
  items: { id: string; text: string; displayOrder: number; weight: number }[]
}

export function groupSnapshotRows(rows: FlatSnapshotRow[]): NestedRubricCategory[] {
  const catMap = new Map<string, NestedRubricCategory>()
  for (const row of rows) {
    const key = row.category_name
    if (!catMap.has(key)) {
      catMap.set(key, {
        id: `snap_${row.rubric_group_id}_${row.category_display_order}`,
        name: row.category_name,
        displayOrder: row.category_display_order,
        items: [],
      })
    }
    catMap.get(key)!.items.push({
      id: `snap_item_${row.rubric_group_id}_${row.category_display_order}_${row.item_display_order}`,
      text: row.item_text,
      displayOrder: row.item_display_order,
      weight: row.item_weight,
    })
  }
  return Array.from(catMap.values()).sort((a, b) => a.displayOrder - b.displayOrder)
}
