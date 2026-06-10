import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest
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
    .select('id, name, code')

  return NextResponse.json({ users: enriched, departments: departments || [] })
}
