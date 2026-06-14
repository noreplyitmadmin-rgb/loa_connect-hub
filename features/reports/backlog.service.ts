import type { BacklogEntry, BacklogAgingBucket, BacklogSummary } from "@/lib/types"

export interface BacklogReportResult {
  entries: BacklogEntry[]
  agingBuckets: BacklogAgingBucket[]
  summary: BacklogSummary
  departmentName: string
  byFaculty: { facultyName: string; buckets: { label: string; count: number }[] }[]
}



export function computeByFaculty(entries: BacklogEntry[]) {
  const facultyMap = new Map<string, { facultyName: string; buckets: Map<string, number> }>()
  const bucketLabels = ["0 - 3 Days", "4 - 7 Days", "8 - 14 Days", "More Than 14 Days"]

  for (const entry of entries) {
    if (!facultyMap.has(entry.facultyId)) {
      facultyMap.set(entry.facultyId, {
        facultyName: entry.facultyName,
        buckets: new Map(bucketLabels.map((l) => [l, 0])),
      })
    }
    const faculty = facultyMap.get(entry.facultyId)!
    faculty.buckets.set(entry.agingBucket, (faculty.buckets.get(entry.agingBucket) || 0) + 1)
  }

  return Array.from(facultyMap.values()).map((f) => ({
    facultyName: f.facultyName,
    buckets: bucketLabels.map((label) => ({
      label,
      count: f.buckets.get(label) || 0,
    })),
  }))
}
