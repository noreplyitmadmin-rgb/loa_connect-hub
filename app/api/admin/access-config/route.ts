import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { supabase } from "@/lib/supabase"
import { clearAccessConfigCache } from "@/lib/access"
import fs from "fs"
import path from "path"

let scannedRoutesCache: { pages: string[] } | null = null

function scanRoutes(): { pages: string[] } {
  if (scannedRoutesCache) return scannedRoutesCache

  const pages: string[] = ["/"]
  const appDir = path.join(process.cwd(), "app")

  function walk(dir: string) {
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
        walk(fullPath)
      } else if (entry.name === "page.tsx" || entry.name === "page.ts" || entry.name === "page.js") {
        const relative = path.relative(appDir, path.dirname(fullPath))
        const urlPath = "/" + relative.replace(/\\/g, "/")
        if (!urlPath.startsWith("/api/")) pages.push(urlPath)
      }
    }
  }

  walk(appDir)

  scannedRoutesCache = { pages: [...new Set(pages)].sort() }
  return scannedRoutesCache
}

function pageCategory(p: string): string {
  if (p === "/") return "General"
  if (p.startsWith("/admin")) return "Admin"
  if (p.startsWith("/student")) return "Student"
  if (p.startsWith("/faculty")) return "Faculty"
  if (p.startsWith("/dean")) return "Dean"
  if (p.startsWith("/faq")) return "Information"
  return "Other"
}

function pageLabel(p: string): string {
  const map: Record<string, string> = {
    "/": "Dashboard (root)",
    "/admin": "Admin Dashboard",
    "/admin/users": "Manage Users",
    "/admin/access-config": "Access Configuration",
    "/student": "Student Dashboard",
    "/student/book": "Book Consultation",
    "/student/meetings": "Student Consultations",
    "/faculty": "Faculty Dashboard",
    "/faculty/meetings": "Faculty Meetings",
    "/faculty/availability": "Availability Rules",
    "/faculty/upload": "Import Students",
    "/faculty/reports": "Department Reports",
    "/dean": "Dean Dashboard",
    "/dean/upload": "Import Users",
    "/faq": "FAQ",
    "/403": "Forbidden",
  }
  return map[p] || p.split("/").filter(Boolean).map(capitalize).join(" / ") || p
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function buildCatalog() {
  const scanned = scanRoutes()

  const pageCatalog: Record<string, { path: string; label: string; description: string }[]> = {}
  for (const p of scanned.pages) {
    const cat = pageCategory(p)
    if (!pageCatalog[cat]) pageCatalog[cat] = []
    pageCatalog[cat].push({ path: p, label: pageLabel(p), description: "" })
  }

  return { pages: pageCatalog }
}

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!role || !hasRole(role, "ADMIN")) {
    return null
  }
  return session
}

export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { data, error } = await supabase.from("group_access").select("*").order("groupName")
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const catalog = buildCatalog()

  return NextResponse.json({ groups: data || [], catalog })
}

export async function PATCH(request: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const body = await request.json()
  const { groupName, pages } = body

  if (!groupName) {
    return NextResponse.json({ error: "groupName is required" }, { status: 400 })
  }

  if (pages !== undefined && !Array.isArray(pages)) {
    return NextResponse.json({ error: "pages must be an array" }, { status: 400 })
  }

  if (groupName === "ADMIN" && pages !== undefined) {
    const required = ["/admin", "/admin/users", "/admin/access-config"]
    const missing = required.filter((r) => !pages.includes(r))
    if (missing.length > 0) {
      return NextResponse.json({
        error: `Cannot remove required ADMIN pages: ${missing.join(", ")}`,
      }, { status: 400 })
    }
  }

  const updateData: Record<string, any> = { updatedAt: new Date().toISOString() }
  if (pages !== undefined) updateData.pages = pages

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
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

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


