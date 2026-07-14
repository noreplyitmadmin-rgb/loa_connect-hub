import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/route-guard'
import { userRepository, departmentRepository } from '@/lib/repositories/factory'
import { bulkPreviewUsers, bulkUpsertUsers } from '@/features/users/users.service'

export async function GET(
  _request: NextRequest
) {
  const users = await userRepository.listAll()
  const departments = await departmentRepository.listAll()

  return NextResponse.json({ users, departments })
}

export async function POST(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const body = await request.json()

    if (body.preview === true && Array.isArray(body.users)) {
      const result = await bulkPreviewUsers(body.users)
      return NextResponse.json(result)
    }

    if (Array.isArray(body.users)) {
      const result = await bulkUpsertUsers(body.users)
      return NextResponse.json(result)
    }

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
