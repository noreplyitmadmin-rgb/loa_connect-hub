import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { appointmentRepository } from "@/lib/repositories/factory"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"]

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user as any).role
  if (role !== "FACULTY" && role !== "DEAN") {
    return NextResponse.json({ error: "Only faculty can upload files" }, { status: 403 })
  }

  const { id } = await params

  try {
    const appointment = await appointmentRepository.findById(id)
    if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    if (appointment.facultyId !== (session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { files } = await request.json()

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "files array is required with at least one file" }, { status: 400 })
    }

    const results = []

    for (const f of files) {
      const { fileName, fileType, fileData, fileSize } = f

      if (!fileName || !fileType || !fileData || typeof fileSize !== "number") {
        return NextResponse.json({ error: `Invalid file entry: ${fileName || "unknown"}` }, { status: 400 })
      }

      if (!ALLOWED_TYPES.includes(fileType)) {
        return NextResponse.json({ error: `Invalid file type for ${fileName}: only PNG, JPEG, GIF, and WebP images are allowed` }, { status: 400 })
      }

      if (fileSize > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `${fileName} must be less than 5MB` }, { status: 400 })
      }

      const result = await appointmentRepository.addFile(id, { fileName, fileType, fileData, fileSize })
      results.push(result)
    }

    return NextResponse.json({ files: results })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload files" },
      { status: 400 }
    )
  }
}
