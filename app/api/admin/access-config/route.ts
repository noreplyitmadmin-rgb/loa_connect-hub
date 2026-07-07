import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/route-guard"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { supabase } from "@/lib/supabase"
import { clearAccessConfigCache, loadAccessConfig } from "@/lib/access"
import { getDefaultPages } from "@/lib/default-access"
import { pageApiMap } from "@/lib/page-api-map"
import fs from "fs"
import path from "path"

let scannedRoutesCache: { pages: string[]; api: string[] } | null = null

function scanRoutes(): { pages: string[]; api: string[] } {
  if (scannedRoutesCache) return scannedRoutesCache

  const pages: string[] = ["/"]
  const api: string[] = []
  const appDir = path.join(process.cwd(), "app")

  function walkPages(dir: string) {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith("_") || entry.name.startsWith("@")) continue
      if (entry.name.startsWith("(") || entry.name.startsWith("[")) continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walkPages(fullPath)
      } else if (entry.name === "page.tsx" || entry.name === "page.ts" || entry.name === "page.js") {
        const relative = path.relative(appDir, path.dirname(fullPath))
        const urlPath = "/" + relative.replace(/\\/g, "/")
        if (!urlPath.startsWith("/api/") && !urlPath.includes("/m/")) pages.push(urlPath)
      }
    }
  }

  function walkApi(dir: string) {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith("_") || entry.name.startsWith("@")) continue
      if (entry.name.startsWith("(")) continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walkApi(fullPath)
      } else if (entry.name === "route.ts" || entry.name === "route.tsx" || entry.name === "route.js") {
        const relative = path.relative(apiDir, path.dirname(fullPath))
        const urlPath = "/api/" + relative.replace(/\\/g, "/")
        api.push(urlPath)
      }
    }
  }

  const apiDir = path.join(appDir, "api")
  walkPages(appDir)
  if (fs.existsSync(apiDir)) walkApi(apiDir)

  scannedRoutesCache = { pages: [...new Set(pages)].sort(), api: [...new Set(api)].sort() }
  return scannedRoutesCache
}

function pageCategory(p: string): string {
  if (p === "/") return "General"
  if (p.startsWith("/admin")) return "Admin"
  if (p.startsWith("/student")) return "Student"
  if (p.startsWith("/faculty")) return "Faculty"
  if (p.startsWith("/dean")) return "Dean"
  return "Other"
}

function pageSection(p: string): string {
  if (p === "/admin/consultations/reports" || p === "/admin/evaluations" || p === "/dean/reports") return "Hidden"
  if (p === "/" || p === "/403" || p === "/faq" || p === "/student/meetings" || p === "/student/history" || p === "/faculty/meetings" || p === "/faculty/availability" || p.startsWith("/admin/system/") || p === "/admin/access-config" || p === "/admin/audit-trail" || p === "/admin/user-permissions") return "System"
  if (p === "/admin" || p === "/dean" || p === "/faculty" || p === "/student") return "Dashboard"
  if (p.startsWith("/admin/data/") || p.startsWith("/dean/data/") || p === "/dean/departments" || p === "/admin/data/maintenance") return "Data"
  if ((p.startsWith("/admin/consultations/reports") || p.startsWith("/admin/consultations") || p.startsWith("/dean/reports") || p.startsWith("/faculty/reports")) && p !== "/admin/consultations/reports" && p !== "/dean/reports") return "Reports"
  if (p.startsWith("/admin/evaluations") || p.startsWith("/dean/evaluations") || p.startsWith("/faculty/evaluations") || p.startsWith("/student/evaluations")) return "Evaluations"
  return ""
}

function pageLabel(p: string): string {
  const map: Record<string, string> = {
    "/": "Dashboard (root)",
    "/admin": "Admin Dashboard",
    "/admin/system/access-config": "Access Configuration",
    "/admin/access-config": "Access Configuration (legacy)",
    "/admin/system/user-permissions": "User Permissions",
    "/admin/system/audit-trail": "Audit Trail",
    "/student": "Student Dashboard",
    "/student/book": "Book Consultation",
    "/student/meetings": "Student Consultations",
    "/faculty": "Faculty Dashboard",
    "/faculty/meetings": "Faculty Meetings",
    "/faculty/availability": "Availability Settings",
    "/faculty/upload": "Import Students",
    "/faculty/reports": "Department Reports",
    "/dean": "Dean Dashboard",
    "/dean/upload": "Import Users",
    "/403": "Forbidden",
    "/student/evaluations/thank-you": "Evaluation Thank You",
  }
  return map[p] || p.split("/").filter(Boolean).map(capitalize).join(" / ") || p
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function buildCatalog() {
  const scanned = scanRoutes()

  const pageCatalog: Record<string, { path: string; label: string; description: string; section?: string }[]> = {}
  for (const p of scanned.pages) {
    const cat = pageCategory(p)
    if (!pageCatalog[cat]) pageCatalog[cat] = []
    pageCatalog[cat].push({ path: p, label: pageLabel(p), description: "", section: pageSection(p) })
  }

  const apiItems = scanned.api.map((p) => ({ path: p, label: pageLabel(p), description: "" }))
  if (apiItems.length > 0) pageCatalog["API"] = apiItems

  return { pages: pageCatalog }
}

export async function GET() {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string | undefined
  const showApi = role && (hasRole(role, "ADMIN") || hasRole(role, "DEAN"))

  const { data, error } = await supabase.from("group_access").select("*").order("groupName")
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const catalog = buildCatalog()
  if (!showApi) {
    delete catalog.pages["API"]
  }

  const mergedConfig = await loadAccessConfig()

  return NextResponse.json({ groups: data || [], catalog, config: mergedConfig, pageApiMap })
}

function expandApiPaths(
  selectedPages: string[],
  api_overrides: Record<string, Record<string, boolean>>,
): string[] {
  const paths = new Set(selectedPages)
  for (const pagePath of selectedPages) {
    const defaultApis = pageApiMap[pagePath]?.apis ?? []
    for (const api of defaultApis) {
      paths.add(api)
    }
  }
  // Apply overrides: false → remove, true → add
  for (const [, overrides] of Object.entries(api_overrides)) {
    for (const [apiPath, value] of Object.entries(overrides)) {
      if (value === true) {
        paths.add(apiPath)
      } else {
        paths.delete(apiPath)
      }
    }
  }
  return Array.from(paths)
}

export async function PATCH(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const body = await request.json()
  const { groupName, pages, api_overrides } = body

  if (!groupName) {
    return NextResponse.json({ error: "groupName is required" }, { status: 400 })
  }

  const normalizePath = (p: string) => p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p
  const stripMobile = (p: string) => p.includes("/m/") ? "" : p

  const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() }

  if (pages !== undefined) {
    if (!Array.isArray(pages)) {
      return NextResponse.json({ error: "pages must be an array" }, { status: 400 })
    }
    let dedupedPages = [...new Set(pages.map(normalizePath).map(stripMobile).filter(Boolean))]

    // ADMIN access is hardcoded — /admin/system/access-config and /admin/system/user-permissions are always granted
    if (groupName === "ADMIN") {
      dedupedPages = dedupedPages.filter((p: string) => p !== "/admin/system/access-config" && p !== "/admin/system/user-permissions" && p !== "/admin/access-config" && p !== "/admin/user-permissions")
    }

    if (groupName !== "ADMIN") {
      for (const p of ["/faq", "/403", "/student/evaluations/thank-you"]) {
        if (!dedupedPages.includes(p)) dedupedPages.push(p)
      }
    }

    // If api_overrides is provided (new page-centric UI), expand page paths into full flat list.
    // If api_overrides is NOT provided (legacy UI), pages is already a flat list — keep as-is.
    if (api_overrides !== undefined) {
      dedupedPages = expandApiPaths(dedupedPages, api_overrides)
    }

    // Filter out irrevocable defaults — they are never stored in DB
    const defaultSet = new Set(getDefaultPages(groupName))
    dedupedPages = dedupedPages.filter((p: string) => !defaultSet.has(p))

    updateData.pages = dedupedPages
  }

  if (api_overrides !== undefined) {
    updateData.api_overrides = api_overrides
  }

  const { data, error } = await supabase
    .from("group_access")
    .update(updateData)
    .eq("groupName", groupName)
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  clearAccessConfigCache()

  return NextResponse.json({ group: data })
}

export async function POST(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const body = await request.json()
  const { groupName } = body

  if (!groupName || typeof groupName !== "string" || !groupName.trim()) {
    return NextResponse.json({ error: "groupName is required" }, { status: 400 })
  }

  const name = groupName.trim().toUpperCase()

  const { data: existing } = await supabase
    .from("group_access")
    .select("groupName")
    .eq("groupName", name)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: `Group "${name}" already exists` }, { status: 409 })
  }

  const { data, error } = await supabase
    .from("group_access")
    .insert({ groupName: name, pages: [], updatedAt: new Date().toISOString() })
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  clearAccessConfigCache()

  return NextResponse.json({ group: data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const { searchParams } = new URL(request.url)
  const groupName = searchParams.get("groupName")

  if (!groupName || typeof groupName !== "string" || !groupName.trim()) {
    return NextResponse.json({ error: "groupName query param is required" }, { status: 400 })
  }

  const name = groupName.trim().toUpperCase()

  if (name === "ADMIN" || name === "DEAN" || name === "FACULTY" || name === "STUDENT" || name === "GUEST") {
    return NextResponse.json({ error: `Cannot delete built-in group "${name}"` }, { status: 403 })
  }

  const { error } = await supabase
    .from("group_access")
    .delete()
    .eq("groupName", name)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  clearAccessConfigCache()

  return NextResponse.json({ success: true })
}


