import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { logAuditEvent } from "@/lib/services/audit"

export async function POST(req: NextRequest) {
  const session = await auth()
  const su = session?.user as Record<string, unknown> | undefined

  const { path, method, message } = await req.json()

  await logAuditEvent({
    userId: (su?.id as string) ?? null,
    email: (su?.email as string) ?? null,
    action: "API_ACCESS_DENIED",
    details: JSON.stringify({ path, method, message, userAgent: req.headers.get("user-agent") }),
  })

  return NextResponse.json({ success: true })
}
