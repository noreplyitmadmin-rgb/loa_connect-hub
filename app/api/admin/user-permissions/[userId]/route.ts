import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/route-guard'
import { getUserPermissions, setUserPermissions } from '@/features/user-permissions/user-permissions.service'
import { supabase } from '@/lib/supabase'

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
  const perms = await getUserPermissions(userId)
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
  const { error: deleteErr } = await supabase
    .from('user_permissions')
    .delete()
    .eq('user_id', userId)
  if (deleteErr) {
    return new NextResponse(JSON.stringify({ error: 'Delete failed' }), {
      status: 500,
    })
  }

  const body = await request.json()
  if (!Array.isArray(body) || !body.every(isPermissionObj)) {
    return new NextResponse(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400,
    })
  }

  const upsertResults = await Promise.all(
    body.map((p) =>
      setUserPermissions(userId, p.resource_path, p.grants ?? [], p.denies ?? [])
    )
  )

  if (upsertResults.some((r) => r === null)) {
    return new NextResponse(JSON.stringify({ error: 'One or more upserts failed' }), {
      status: 500,
    })
  }

  return NextResponse.json(upsertResults)
}
