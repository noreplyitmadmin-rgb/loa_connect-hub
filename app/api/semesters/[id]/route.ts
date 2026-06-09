import { NextResponse } from "next/server"
import { getSemester, updateSemester, deleteSemester, activateSemester } from "@/features/admin-data/semesters.service"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"

// Helper function to ensure authentication
async function requireAuth() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized: No active session found." }, { status: 401 })
  }
  return null
}

// Helper function to ensure ADMIN role
async function requireAdminRole() {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || !hasRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden: Administrator role required for this action." }, { status: 403 })
  }
  return null
}

// GET handler: Get a single semester by ID
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  // Authentication check (must be logged in to view details)
  const authErr = await requireAuth()
  if (authErr) return authErr
  
  try {
    const semester = await getSemester(id)
    if (!semester) {
      return NextResponse.json({ error: `Semester with ID ${id} not found.` }, { status: 404 })
    }
    return NextResponse.json({ data: semester }, { status: 200 })
  } catch (error) {
    console.error("Error fetching semester details", error)
    return NextResponse.json({ error: "Failed to retrieve semester details." }, { status: 500 })
  }
}

// PATCH handler: Update a semester
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  // Authorization check
  const forbidden = await requireAdminRole()
  if (forbidden) return forbidden

  try {
    const body = await request.json()
    const { title, isActive } = body
    
    if (!title) {
        return NextResponse.json({ error: "Title is required." }, { status: 400 })
    }

    const updatedSemester = await updateSemester(id, { title, isActive })
    return NextResponse.json({ data: updatedSemester }, { status: 200 })
  } catch (error) {
    console.error("Error updating semester", error)
    return NextResponse.json({ error: (error as Error).message || "Failed to update semester." }, { status: 500 })
  }
}

// DELETE handler: Delete a semester
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  // Authorization check
  const forbidden = await requireAdminRole()
  if (forbidden) return forbidden

  try {
    await deleteSemester(id)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error deleting semester", error)
    return NextResponse.json({ error: (error as Error).message || "Failed to delete semester." }, { status: 500 })
  }
}

// POST handler: Activate a semester (optional/cleaner route)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  // Authorization check
  const forbidden = await requireAdminRole()
  if (forbidden) return forbidden
  
  try {
    const activatedSemester = await activateSemester(id)
    return NextResponse.json({ data: activatedSemester }, { status: 200 })
  } catch (error) {
    console.error("Error activating semester", error)
    return NextResponse.json({ error: (error as Error).message || "Failed to activate semester." }, { status: 500 })
  }
}