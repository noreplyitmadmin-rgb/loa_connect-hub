import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ConsultationsTimeline } from "@/components/ConsultationsTimeline"
import { listFacultyAppointments } from "@/lib/controllers/appointments"
import { userRepository, departmentRepository } from "@/lib/repositories/factory"
import { OnboardingWalkthrough } from "@/components/OnboardingWalkthrough"

export default async function DeanDashboard() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if ((session.user as any).role !== "DEAN") redirect("/login")

  const deanId = (session.user as any).id
  const dbUser = await userRepository.findById(deanId)
  const needsOnboarding = dbUser?.onboardingVersion === 0
  const department = await departmentRepository.findByDeanId(deanId)

  const facultyUsers = department
    ? await userRepository.listByDepartment(department.id)
    : []

  const facultyMembers = facultyUsers.filter(
    (u: any) => u.role === "FACULTY" || u.role === "DEAN"
  )

  let upcomingCount = 0
  let pendingCount = 0
  const timelineEvents: any[] = []

  const today = new Date().toISOString().slice(0, 10)

  for (const faculty of facultyMembers) {
    const appointments = await listFacultyAppointments(faculty.id)

    upcomingCount += appointments.filter(
      (a: any) => a.date >= today && (a.status === "APPROVED" || a.status === "PENDING")
    ).length
    pendingCount += appointments.filter((a: any) => a.status === "PENDING").length

    for (const a of appointments as any[]) {
      timelineEvents.push({
        id: a.id,
        title: a.title || `Meeting with ${a.student?.name || "Attendee"}`,
        subtitle: faculty.name,
        date: a.date || "",
        startTime: a.startTime || "",
        endTime: a.endTime || "",
        status: a.status,
        type: "appointment" as const,
        teamsLink: a.teamsLink,
      })
    }
  }

  timelineEvents.sort((a, b) => a.date.localeCompare(b.date))

  return (
    <>
      {needsOnboarding && (
        <OnboardingWalkthrough role="DEAN" userId={deanId} />
      )}
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Dean Dashboard
          {department && (
            <span className="ml-2 text-base font-normal text-slate-400">
              — {department.name}
            </span>
          )}
        </h1>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="card p-5 bg-white">
          <p className="text-3xl font-bold text-slate-900">{upcomingCount}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Upcoming Meetings</p>
        </div>
        <div className="card p-5 bg-white">
          <p className="text-3xl font-bold text-slate-900">{pendingCount}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Pending Requests</p>
        </div>
      </div>

      {/* Quick Create CTA */}
      <div className="card p-6 bg-white flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">Need to schedule a meeting?</p>
          <p className="text-xs text-slate-500 mt-0.5">Create a meeting with your colleagues.</p>
        </div>
        <Link
          href="/faculty/meetings/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gold-600 text-white text-sm font-semibold hover:bg-gold-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create a Meeting
        </Link>
      </div>

      {/* Calendar Timeline */}
      <section className="space-y-4">
        <ConsultationsTimeline events={timelineEvents} variant="meetings" />
      </section>
    </div>
    </>
  )
}
