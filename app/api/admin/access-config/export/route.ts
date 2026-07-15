import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/route-guard"
import { groupAccessRepository, userPermissionRepository } from "@/lib/repositories/factory"
import { DEFAULT_CONFIG } from "@/lib/access"
import { DEFAULT_ROLE_PREFIXES } from "@/lib/default-access"

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const [groups, userPermissions] = await Promise.all([
    groupAccessRepository.listAll(),
    userPermissionRepository.listAll(),
  ])

  return NextResponse.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    hardcodedDefaults: {
      rolePrefixes: DEFAULT_ROLE_PREFIXES,
      defaultConfig: DEFAULT_CONFIG,
    },
    groups: groups || [],
    userPermissions: userPermissions || [],
  })
}
