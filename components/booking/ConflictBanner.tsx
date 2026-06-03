"use client"

interface ConflictAppointment {
  appointmentId: string
  title: string | null
  meetingType: string
  date: string
  startTime: string
  endTime: string
}

interface Conflict {
  userName: string
  message: string
  appointments?: ConflictAppointment[]
}

interface ConflictBannerProps {
  conflicts: Conflict[]
  userRole: string
  isSuccess: boolean
}

export default function ConflictBanner({ conflicts, userRole, isSuccess }: ConflictBannerProps) {
  if (conflicts.length === 0) return null

  const rolePath = userRole === "STUDENT" ? "student" : "faculty"

  return (
    <div
      className={`p-3 rounded-lg text-xs space-y-1 border ${
        isSuccess
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-red-50 text-red-700 border-red-200"
      }`}
    >
      <p className="font-semibold">Schedule Conflicts Detected</p>
      {conflicts.map((c, i) => (
        <div key={i} className="space-y-0.5">
          <p className="font-semibold">
            {c.userName}: {c.message}
          </p>
          {c.appointments?.map((a, j) => (
            <a
              key={j}
              href={`/${rolePath}/meetings/${a.appointmentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline hover:opacity-80 ml-2"
            >
              {a.meetingType === "CONSULTATION" ? "Consultation" : "Meeting"}
              {a.title ? `: ${a.title}` : ""} &mdash; {a.date} {a.startTime}&ndash;{a.endTime}
            </a>
          ))}
        </div>
      ))}
      {isSuccess ? (
        <p className="opacity-75 pt-1">
          You can still proceed with booking. Invited faculty will review and accept/decline.
        </p>
      ) : (
        <p className="opacity-75 pt-1">Please resolve the conflicts before booking.</p>
      )}
    </div>
  )
}
