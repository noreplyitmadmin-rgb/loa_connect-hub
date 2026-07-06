import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/route-guard'
import { userRepository } from '@/lib/repositories/factory'
import { bulkPreviewUsers, bulkUpsertUsers } from '@/features/users/users.service'

export async function GET(
  _request: NextRequest
) {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, name, "departmentId", "isDisabled", "hasLoggedInBefore", "lastLoginAt", "createdAt", "onboardingVersion"')
  if (error || !users) {
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch users' }), { status: 500 })
  }

  const ids = users.map((u) => u.id)
  const { data: roles } = await supabase
    .from('userrole')
    .select('"userId", "roleName"')
    .in('"userId"', ids)

  const roleMap: Record<string, string> = {}
  if (roles) {
    for (const r of roles) {
      const uid = r.userId
      if (!roleMap[uid]) roleMap[uid] = r.roleName
      else if (!roleMap[uid].includes(r.roleName)) roleMap[uid] += '|' + r.roleName
    }
  }

  const enriched = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: roleMap[u.id] || null,
    departmentId: u.departmentId,
    isDisabled: u.isDisabled,
    hasLoggedInBefore: u.hasLoggedInBefore,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    onboardingVersion: u.onboardingVersion,
  }))

  const { data: departments } = await supabase
    .from('departments')
    .select('id, name, code, "deanId"')

  return NextResponse.json({ users: enriched, departments: departments || [] })
}

export async function POST(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const body = await request.json()

    // Bulk preview mode
    if (body.preview === true && Array.isArray(body.users)) {
      const result = await bulkPreviewUsers(body.users)
      return NextResponse.json(result)
    }

    // Bulk execute mode (upsert by email)
    if (Array.isArray(body.users)) {
      const result = await bulkUpsertUsers(body.users)
      return NextResponse.json(result)
    }

    // Single user create (existing behavior)
    const { name, email, role, departmentId } = body
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }
    if (!role) {
      return NextResponse.json({ error: "At least one role is required" }, { status: 400 })
    }

    const user = await userRepository.create({ name, email, role, departmentId })
    return NextResponse.json({ user }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const body = await request.json()
    const { userId, ...fields } = body
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const user = await userRepository.update(userId, fields)
    return NextResponse.json({ user })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
