import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"

export async function GET(_request: NextRequest) {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || !hasRole(role, "ADMIN") && !hasRole(role, "DEAN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({
    data: {
      totalComments: 0,
      analyzed: 0,
      distribution: [
        { label: "POSITIVE", count: 0, percentage: 0 },
        { label: "NEGATIVE", count: 0, percentage: 0 },
        { label: "NEUTRAL", count: 0, percentage: 0 },
        { label: "MIXED", count: 0, percentage: 0 },
      ],
      averageScore: null,
    },
  })
}
