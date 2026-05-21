import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { fetchUsersFromGraph } from "@/lib/services/graph"

export async function GET() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const users = await fetchUsersFromGraph()
    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch users" },
      { status: 500 }
    )
  }
}