import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { supabase } from "@/lib/supabase"
import { evaluationRepository } from "@/features/evaluations/evaluations.repository"
import { getActiveSemester } from "@/features/admin-data/semesters.service"
import nodemailer from "nodemailer"

const emailEnabled = () => process.env.EMAIL_FEATURE_FLAG === "true"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as Record<string, unknown>).role as string
  const userId = (session.user as Record<string, unknown>).id as string
  const userEmail = (session.user as Record<string, unknown>).email as string
  const userName = (session.user as Record<string, unknown>).name as string

  if (!hasRole(role, "STUDENT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { facultySubjectId, evaluateeId, evaluateeName, subjectName } = await request.json()

    if (!facultySubjectId || !evaluateeId) {
      return NextResponse.json({ error: "facultySubjectId and evaluateeId are required" }, { status: 400 })
    }

    const activeSemester = await getActiveSemester()
    if (!activeSemester) {
      return NextResponse.json({ error: "No active semester" }, { status: 400 })
    }

    const { data: enrollment } = await supabase
      .from("student_enrollments")
      .select("id")
      .eq("student_id", userId)
      .eq("faculty_subject_id", facultySubjectId)
      .eq("semesterId", activeSemester.id)
      .maybeSingle()

    if (!enrollment) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const existing = await evaluationRepository.findByComposite(activeSemester.id, userId, facultySubjectId)
    if (existing) {
      await supabase.from("evaluations").update({ isDisabled: true }).eq("id", existing.id)
    } else {
      await evaluationRepository.create(activeSemester.id, userId, evaluateeId, facultySubjectId, "dispute")
      await supabase
        .from("evaluations")
        .update({ isDisabled: true, status: "DRAFT" })
        .eq("evaluatorId", userId)
        .eq("facultySubjectId", facultySubjectId)
    }

    await supabase.from("audit_logs").insert({
      userId,
      email: userEmail,
      action: "EVALUATION_DISPUTE",
      details: JSON.stringify({
        facultySubjectId,
        currentFacultyId: evaluateeId,
        currentFacultyName: evaluateeName,
        subjectName,
        studentName: userName,
        studentEmail: userEmail,
      }),
    })

    if (emailEnabled()) {
      const { data: admins } = await supabase
        .from("users")
        .select("email, name")
        .ilike("role", "%ADMIN%")

      if (admins && admins.length > 0) {
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        })

        const subject = `[LOA Connect] Evaluation Dispute: ${userName} reported wrong faculty for ${subjectName || "a subject"}`
        const html = `
          <h2>Evaluation Dispute</h2>
          <p><strong>Student:</strong> ${userName} (${userEmail})</p>
          <p><strong>Subject:</strong> ${subjectName || "Unknown"}</p>
          <p><strong>Reported Faculty:</strong> ${evaluateeName || evaluateeId}</p>
          <p><strong>Faculty Subject ID:</strong> ${facultySubjectId}</p>
          <p>The student reported that they are evaluating the wrong faculty for this subject. Please review and update the faculty-subject assignment if needed.</p>
          <hr>
          <p style="color:#666;font-size:12px;">This is an automated notification from LOA Connect Hub.</p>
        `

        for (const admin of admins) {
          try {
            await transporter.sendMail({ to: admin.email, subject, html })
          } catch {
            // Silently fail per-email errors
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to submit dispute" }, { status: 500 })
  }
}
