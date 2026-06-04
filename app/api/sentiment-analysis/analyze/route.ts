import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"

export async function POST(request: NextRequest) {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || !hasRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const comment = body.comment as string | undefined
  if (!comment) {
    return NextResponse.json({ error: "Comment is required" }, { status: 400 })
  }

  return NextResponse.json({
    data: {
      sentimentScore: 0.75,
      sentimentLabel: "POSITIVE",
    },
  })
}
