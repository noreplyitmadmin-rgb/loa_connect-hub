import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { rubricGroupRepository } from "@/lib/repositories/factory"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const snapshot = await rubricGroupRepository.getSnapshot(id)
    return NextResponse.json({ snapshot })
  } catch {
    return NextResponse.json({ error: "Failed to fetch rubric snapshot" }, { status: 500 })
  }
}
