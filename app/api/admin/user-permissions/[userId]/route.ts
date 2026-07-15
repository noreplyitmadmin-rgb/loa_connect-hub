import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/route-guard'
import { userPermissionRepository } from '@/lib/repositories/factory'

interface PermissionPayload {
  resource_path: string
  grants?: string[]
  denies?: string[]
}

function isPermissionObj(obj: unknown): obj is PermissionPayload {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Record<string, unknown>)?.resource_path === 'string'
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const { userId } = await params
  const perms = await userPermissionRepository.findByUserId(userId)
  if (perms === null) {
    return new NextResponse(JSON.stringify({ error: 'User not found' }), {
      status: 404,
    })
  }
  return NextResponse.json(perms)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const { userId } = await params
  await userPermissionRepository.deleteByUserId(userId)

  const body = await request.json()
  if (!Array.isArray(body) || !body.every(isPermissionObj)) {
    return new NextResponse(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400,
    })
  }

  const upsertResults = await Promise.all(
    body.map((p) =>
      userPermissionRepository.upsertPermission(userId, p.resource_path, p.grants ?? [], p.denies ?? [])
    )
  )

  if (upsertResults.some((r) => r === null)) {
    return new NextResponse(JSON.stringify({ error: 'One or more upserts failed' }), {
      status: 500,
    })
  }

  return NextResponse.json(upsertResults)
}
