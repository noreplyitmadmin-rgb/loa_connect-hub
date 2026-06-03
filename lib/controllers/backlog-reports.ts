import { reportsRepository, departmentRepository } from "@/lib/repositories/factory"
import type { BacklogEntry, BacklogAgingBucket, BacklogSummary } from "@/lib/types"

export interface BacklogReportResult {
  entries: BacklogEntry[]
  agingBuckets: BacklogAgingBucket[]
  summary: BacklogSummary
  departmentName: string
  byFaculty: { facultyName: string; buckets: { label: string; count: number }[] }[]
}

export async function getBacklogReportData(
  departmentId: string | null,
  filters?: { startDate?: string; endDate?: string; status?: string }
): Promise<BacklogReportResult> {
  if (departmentId) {
    const dept = await departmentRepository.findById(departmentId)
    const deptName = dept?.name || "Unknown Department"

    const { entries, agingBuckets, summary } = await reportsRepository.getDepartmentBacklog(departmentId, filters)
    const byFaculty = computeByFaculty(entries)

    return { entries, agingBuckets, summary, departmentName: deptName, byFaculty }
  }

  const departments = await departmentRepository.listAll()

  const allEntries: BacklogEntry[] = []
  const allBuckets: BacklogAgingBucket[] = []

  for (const dept of departments) {
    const { entries, agingBuckets } = await reportsRepository.getDepartmentBacklog(dept.id, filters)
    allEntries.push(...entries)
    allBuckets.push(...agingBuckets)
  }

  const bucketLabels = ["0 - 3 Days", "4 - 7 Days", "8 - 14 Days", "More Than 14 Days"]
  const mergedBuckets: BacklogAgingBucket[] = bucketLabels.map((label) => {
    const fromDays = allBuckets.find((b) => b.label === label)?.fromDays ?? 0
    const toDays = allBuckets.find((b) => b.label === label)?.toDays ?? null
    const count = allBuckets.filter((b) => b.label === label).reduce((s, b) => s + b.count, 0)
    return { label, fromDays, toDays, count }
  })

  const totalPending = allEntries.filter((e) => e.status === "PENDING").length
  const totalApproved = allEntries.filter((e) => e.status === "APPROVED").length

  const oldest = allEntries.length > 0
    ? allEntries.reduce((a, b) => (a.ageDays > b.ageDays ? a : b))
    : null

  const byFaculty = computeByFaculty(allEntries)

  return {
    entries: allEntries,
    agingBuckets: mergedBuckets,
    summary: {
      totalPending,
      totalApproved,
      totalUnresolved: allEntries.length,
      oldestDays: oldest?.ageDays || 0,
      oldestDate: oldest?.date || null,
      oldestFaculty: oldest?.facultyName || "",
      oldestStudent: oldest?.studentName || "",
    },
    departmentName: "All Departments",
    byFaculty,
  }
}

function computeByFaculty(entries: BacklogEntry[]) {
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
