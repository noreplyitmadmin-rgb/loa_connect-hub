import { reportsRepository, departmentRepository } from "@/lib/repositories/factory"
import type { BacklogEntry, BacklogAgingBucket } from "@/lib/types"
import { computeByFaculty } from "./backlog.service"
import type { BacklogReportResult } from "./backlog.service"

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
