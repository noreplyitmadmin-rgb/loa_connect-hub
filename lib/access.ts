import { getPrimaryRole } from "@/lib/utils/roles"

interface GroupAccessEntry {
  pages: string[]
}

const DEFAULT_CONFIG: Record<string, GroupAccessEntry> = {
  ADMIN: {
    pages: ["/", "/admin", "/admin/data-management", "/admin/users", "/admin/users/deleted", "/admin/access-config", "/admin/user-permissions", "/admin/departments", "/admin/data/users", "/admin/data/academic-infrastructure", "/admin/reports", "/admin/reports/health", "/admin/reports/demand", "/admin/reports/responsiveness", "/admin/reports/backlog", "/admin/evaluations", "/admin/evaluations/results", "/admin/audit-trail"],
  },
  DEAN: {
    pages: ["/", "/dean", "/dean/upload", "/dean/departments", "/dean/reports", "/dean/evaluations", "/dean/evaluations/results", "/faculty/meetings", "/faculty/availability", "/faculty/reports"],
  },
  FACULTY: {
    pages: ["/", "/faculty", "/faculty/meetings", "/faculty/availability", "/faculty/upload", "/faculty/evaluations", "/faculty/evaluations/results"],
  },
  STUDENT: {
    pages: ["/", "/student", "/student/book", "/student/meetings", "/student/history", "/student/evaluations", "/evaluate"],
  },
  GUEST: {
    pages: [],
  },
}

const CACHE_TTL = 60_000
const CACHE_KEY = "__group_access_cache__"

interface CacheData {
  data: Record<string, GroupAccessEntry>
  ts: number
}

function getCache(): CacheData | null {
  return (globalThis as Record<string, unknown>)[CACHE_KEY] as CacheData | null
}

function setCache(data: Record<string, GroupAccessEntry>) {
  ;(globalThis as Record<string, unknown>)[CACHE_KEY] = { data, ts: Date.now() }
}

export function clearAccessConfigCache() {
  delete (globalThis as Record<string, unknown>)[CACHE_KEY]
}

export async function loadAccessConfig(): Promise<Record<string, GroupAccessEntry>> {
  const cached = getCache()
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data
  }

  try {
    const { supabase } = await import("@/lib/supabase")
    const { data, error } = await supabase.from("group_access").select("*")
    if (error) throw error

    const map: Record<string, GroupAccessEntry> = { ...DEFAULT_CONFIG }
    for (const row of data || []) {
      map[row.groupName] = { pages: row.pages || [] }
    }

    setCache(map)
    return map
  } catch (err) {
    console.error("[access] Failed to load from DB, using defaults:", (err as { message?: string })?.message)
    if (cached) return cached.data
    return DEFAULT_CONFIG
  }
}

export function userGroup(role: string): string {
  return getPrimaryRole(role)
}

export async function hasPageAccess(role: string, path: string): Promise<boolean> {
  if (path === "/faq" || path.startsWith("/faq/") || path === "/403" || path === "/admin/etl-hub" || path.startsWith("/admin/etl-hub/") || path === "/student/evaluations/thank-you") return true
  const config = await loadAccessConfig()
  const entry = config[userGroup(role)]
  if (!entry) return false
  return entry.pages.some((p: string) => path === p || path.startsWith(p + "/"))
}
