import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { rubricRepository } from "@/lib/repositories/factory"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  try {
    const item = await rubricRepository.createItem({
      categoryId: body.categoryId,
      text: body.text,
      displayOrder: body.displayOrder,
      weight: body.weight ?? 1,
    })
    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
