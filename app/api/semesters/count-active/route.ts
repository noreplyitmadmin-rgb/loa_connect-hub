import { NextResponse } from "next/server"
import { semesterRepository } from "@/lib/repositories/factory"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const semesters = await semesterRepository.list({ isActive: true })
    return NextResponse.json({ count: semesters.length }, { status: 200 })
  } catch {
    return NextResponse.json({ count: 1 }, { status: 200 })
  }
}
