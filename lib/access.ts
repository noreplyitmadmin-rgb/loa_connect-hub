import { getPrimaryRole } from "@/lib/utils/roles"

interface GroupAccessEntry {
  pages: string[]
}

export const DEFAULT_CONFIG: Record<string, GroupAccessEntry> = {
  ADMIN: {
    pages: ["/", "/admin", "/admin/data-management", "/admin/users", "/admin/data/users/deleted", "/admin/access-config", "/admin/user-permissions", "/admin/departments", "/admin/data/users", "/admin/data/academic-infrastructure", "/admin/reports", "/admin/reports/health", "/admin/reports/demand", "/admin/reports/responsiveness", "/admin/reports/backlog", "/admin/reports/coverage", "/admin/reports/distribution", "/admin/evaluations", "/admin/evaluations/results", "/admin/evaluations/rubrics", "/admin/evaluations/disabled", "/admin/audit-trail"],
  },
  DEAN: {
    pages: ["/", "/dean", "/dean/upload", "/dean/departments", "/dean/reports", "/dean/evaluations", "/dean/evaluations/results", "/dean/data/users", "/dean/data/academic-infrastructure", "/dean/etl-hub", "/faculty/meetings", "/faculty/availability", "/faculty/reports"],
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

export interface AccessEntry {
  url: string
  access: "granted" | "revoked"
  type: "ui" | "api"
}

let configCache: { data: Record<string, GroupAccessEntry>; ts: number } | null = null
const CONFIG_CACHE_TTL = 60_000

export function clearAccessConfigCache() {
  configCache = null
}

export async function loadAccessConfig(): Promise<Record<string, GroupAccessEntry>> {
  if (configCache && Date.now() - configCache.ts < CONFIG_CACHE_TTL) {
    return configCache.data
  }

  try {
    const { supabase } = await import("@/lib/supabase")
    const { data, error } = await supabase.from("group_access").select("*")
    if (error) throw error

    const map: Record<string, GroupAccessEntry> = { ...DEFAULT_CONFIG }
    for (const row of data || []) {
      if (row.groupName === "ADMIN") {
        const nonAdminPages = (row.pages || []).filter((p: string) => !p.startsWith("/admin") && p !== "/")
        map.ADMIN = { pages: [...DEFAULT_CONFIG.ADMIN.pages, ...nonAdminPages] }
      } else {
        map[row.groupName] = { pages: row.pages || [] }
      }
    }

    configCache = { data: map, ts: Date.now() }
    return map
  } catch (err) {
    console.error("[access] Failed to load from DB, using defaults:", (err as { message?: string })?.message)
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

function pathType(url: string): "ui" | "api" {
  return url.startsWith("/api/") ? "api" : "ui"
}

const accessCache = new Map<string, { entries: AccessEntry[]; ts: number }>()
const ACCESS_CACHE_TTL = 60_000

export async function getUserAccess(userId: string, role: string): Promise<AccessEntry[]> {
  const cached = accessCache.get(userId)
  if (cached && Date.now() - cached.ts < ACCESS_CACHE_TTL) return cached.entries

  const config = await loadAccessConfig()
  const isAdmin = role?.includes("ADMIN")
  const topRole = role ? getPrimaryRole(role) : "GUEST"

  const allPaths = new Map<string, "ui" | "api">()
  for (const group of Object.values(config)) {
    for (const p of group.pages) {
      if (!allPaths.has(p)) allPaths.set(p, pathType(p))
    }
  }

  const entries = new Map<string, AccessEntry>()

  if (isAdmin) {
    // ADMIN: only grant RBAC-configured pages (sidebar visibility).
    // Middleware fallback (proxy.ts) allows ADMIN to navigate unconfigured paths.
    const adminPages = config["ADMIN"]?.pages ?? []
    for (const url of adminPages) {
      const t = allPaths.get(url) ?? pathType(url)
      entries.set(url, { url, access: "granted", type: t })
    }
  } else {
    for (const [url, type] of allPaths) {
      entries.set(url, { url, access: "revoked", type })
    }
    const rbacPages = config[topRole]?.pages ?? []
    for (const url of rbacPages) {
      const t = allPaths.get(url) ?? pathType(url)
      entries.set(url, { url, access: "granted", type: t })
    }
  }

  try {
    const { supabase } = await import("@/lib/supabase")
    const { data: perms } = await supabase
      .from('user_permissions')
      .select('grants, denies, resource_path')
      .eq('user_id', userId)

    if (perms) {
      for (const p of perms as { grants: string[]; denies: string[]; resource_path: string }[]) {
        const existing = entries.get(p.resource_path) ?? {
          url: p.resource_path,
          access: "revoked",
          type: pathType(p.resource_path)
        }
        if (p.denies?.includes('access')) {
          // ADMIN cannot be denied on /admin/ paths (mandatory), except /admin/etl-hub (decommissioning)
          if (isAdmin && p.resource_path.startsWith('/admin/') && p.resource_path !== '/admin/etl-hub') {
            // skip deny — admin paths are mandatory
          } else {
            existing.access = "revoked"
            entries.set(p.resource_path, existing)
          }
        } else if (p.grants?.includes('access')) {
          existing.access = "granted"
          entries.set(p.resource_path, existing)
        }
      }
    }
  } catch {}

  const result = Array.from(entries.values())
  accessCache.set(userId, { entries: result, ts: Date.now() })
  return result
}
