import { getPrimaryRole } from "@/lib/utils/roles"

interface GroupAccessEntry {
  pages: string[]
  apis: string[]
}

const DEFAULT_CONFIG: Record<string, GroupAccessEntry> = {
  ADMIN: {
    pages: ["/", "/admin", "/admin/users", "/admin/access-config", "/faq"],
    apis: ["/api/admin"],
  },
  DEAN: {
    pages: ["/", "/dean", "/dean/upload", "/faculty/meetings", "/faculty/availability", "/faculty/reports", "/faq"],
    apis: ["/api/admin/users", "/api/import/users", "/api/appointments", "/api/availability-rules"],
  },
  FACULTY: {
    pages: ["/", "/faculty", "/faculty/meetings", "/faculty/availability", "/faculty/upload", "/faq"],
    apis: ["/api/appointments", "/api/availability-rules", "/api/import/students"],
  },
  STUDENT: {
    pages: ["/", "/student", "/student/book", "/student/meetings", "/faq"],
    apis: ["/api/appointments", "/api/appointments/faculty-booked"],
  },
  GUEST: {
    pages: [],
    apis: [],
  },
}

const CACHE_TTL = 60_000
const CACHE_KEY = "__group_access_cache__"

interface CacheData {
  data: Record<string, GroupAccessEntry>
  ts: number
}

function getCache(): CacheData | null {
  return (globalThis as any)[CACHE_KEY] ?? null
}

function setCache(data: Record<string, GroupAccessEntry>) {
  ;(globalThis as any)[CACHE_KEY] = { data, ts: Date.now() }
}

export function clearAccessConfigCache() {
  delete (globalThis as any)[CACHE_KEY]
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

    const map: Record<string, GroupAccessEntry> = {}
    for (const row of data || []) {
      map[row.groupName] = {
        pages: row.pages || [],
        apis: row.apis || [],
      }
    }

    setCache(map)
    return map
  } catch (err) {
    console.error("[access] Failed to load from DB, using defaults:", (err as any)?.message)
    if (cached) return cached.data
    return DEFAULT_CONFIG
  }
}

export function userGroup(role: string): string {
  return getPrimaryRole(role)
}

export async function hasPageAccess(role: string, path: string): Promise<boolean> {
  const config = await loadAccessConfig()
  const entry = config[userGroup(role)]
  if (!entry) return false
  return entry.pages.some((p: string) => path === p || path.startsWith(p + "/"))
}

export async function hasApiAccess(role: string, path: string): Promise<boolean> {
  const config = await loadAccessConfig()
  const entry = config[userGroup(role)]
  if (!entry) return false
  return entry.apis.some((p: string) => path === p || path.startsWith(p + "/"))
}
