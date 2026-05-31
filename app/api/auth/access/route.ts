import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { loadAccessConfig, userGroup } from "@/lib/access"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ pages: [], apis: [] })
  }

  const config = await loadAccessConfig()
  const group = userGroup((session.user as Record<string, unknown>).role as string)
  return NextResponse.json(config[group] || { pages: [], apis: [] })
}
