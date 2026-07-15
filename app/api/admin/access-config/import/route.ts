import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/route-guard"
import { groupAccessRepository, userPermissionRepository } from "@/lib/repositories/factory"
import { clearAccessConfigCache } from "@/lib/access"

interface GroupRow {
  groupName: string
  pages: string[]
  api_overrides?: Record<string, Record<string, boolean>>
  updatedAt?: string
}

interface UserPermRow {
  user_id: string
  resource_path: string
  grants: string[]
  denies: string[]
}

interface ImportPayload {
  version?: number
  groups: GroupRow[]
  userPermissions: UserPermRow[]
}

const BUILT_IN = new Set(["ADMIN", "DEAN", "FACULTY", "STUDENT", "GUEST"])

export async function POST(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  let body: ImportPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!Array.isArray(body.groups)) {
    return NextResponse.json({ error: "groups must be an array" }, { status: 400 })
  }
  if (!Array.isArray(body.userPermissions)) {
    return NextResponse.json({ error: "userPermissions must be an array" }, { status: 400 })
  }

  const now = new Date().toISOString()
  const groupsToUpsert = body.groups.map((g) => ({
    groupName: g.groupName.toUpperCase(),
    pages: g.pages ?? [],
    api_overrides: g.api_overrides ?? {},
    updatedAt: g.updatedAt ?? now,
  }))

  const groupNames = new Set(groupsToUpsert.map((g) => g.groupName))
  for (const name of BUILT_IN) {
    if (!groupNames.has(name)) {
      return NextResponse.json({
        error: `Missing required built-in group: ${name}`,
      }, { status: 400 })
    }
  }

  try {
    await groupAccessRepository.deleteAll()
    await groupAccessRepository.insertMany(groupsToUpsert)
    await userPermissionRepository.deleteAll()

    if (body.userPermissions.length > 0) {
      const permsToInsert = body.userPermissions.map((p) => ({
        user_id: p.user_id,
        resource_path: p.resource_path,
        grants: p.grants ?? [],
        denies: p.denies ?? [],
      }))
      await userPermissionRepository.insertMany(permsToInsert)
    }

    clearAccessConfigCache()

    return NextResponse.json({ success: true, importedGroups: groupsToUpsert.length, importedPermissions: body.userPermissions.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
