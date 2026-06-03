"use client"

import TeamsLinkForm from "@/components/TeamsLinkForm"

interface BasicPerson {
  id: string
  name: string
  email?: string
  department?: string | null
}

interface SelectedSlot {
  date: string
  start: string
  end: string
}

interface TeamsLinkSlot {
  key: string
  date: string
  startTime: string
  endTime: string
}

interface SelectedSlotsOverviewProps {
  selectedSlots: SelectedSlot[]
  primaryFacultyId: string
  facultyList: BasicPerson[]
  attendeeIds: string[]
  students?: BasicPerson[]
  onRemoveSlot: (index: number) => void
  title: string
  onTitleChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  userRole: string
  submitting: boolean
  onBook: (e: React.FormEvent) => void
  showTeamsLinkForm: boolean
  onShowTeamsLinkForm: () => void
  teamsLinkMode: "single" | "per-slot"
  onTeamsLinkModeChange: (mode: "single" | "per-slot") => void
  singleLink: string
  onSingleLinkChange: (value: string) => void
  slotLinks: Record<string, string>
  onSlotLinkChange: (key: string, value: string) => void
  teamsLinkSlots: TeamsLinkSlot[]
  teamsLinkError: string
}

export default function SelectedSlotsOverview({
  selectedSlots,
  primaryFacultyId,
  facultyList,
  attendeeIds,
  students,
  onRemoveSlot,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  userRole,
  submitting,
  onBook,
  showTeamsLinkForm,
  onShowTeamsLinkForm,
  teamsLinkMode,
  onTeamsLinkModeChange,
  singleLink,
  onSingleLinkChange,
  slotLinks,
  onSlotLinkChange,
  teamsLinkSlots,
  teamsLinkError,
}: SelectedSlotsOverviewProps) {
  const participantsText = (() => {
    const primary = facultyList.find((f) => f.id === primaryFacultyId)
    const attendeeMap = new Map<string, string>()

    facultyList
      .filter((f) => attendeeIds.includes(f.id))
      .forEach((f) => {
        attendeeMap.set(f.id, `${f.name}${f.department ? ` (${f.department})` : ""}`)
      })

    ;(students || [])
      .filter((s) => attendeeIds.includes(s.id))
      .forEach((s) => {
        if (!attendeeMap.has(s.id)) {
          attendeeMap.set(s.id, `${s.name} (Student)`)
        }
      })

    const parts: string[] = []
    if (primary) parts.push(`${primary.name} (Primary)`)
    parts.push(...attendeeMap.values())

    return parts.length > 0 ? parts.join(", ") : "No participants"
  })()

  const handleFacultyClick = () => {
    if (!showTeamsLinkForm) {
      onShowTeamsLinkForm()
      return
    }
    const submitEvent = { preventDefault: () => {} } as unknown as React.FormEvent
    onBook(submitEvent)
  }

  return (
    <form onSubmit={userRole === "STUDENT" ? onBook : undefined} className="card p-5 bg-white space-y-4">
      <h3 className="text-sm font-bold text-slate-700">4. Confirm Booking</h3>

      <div className="p-3 rounded-lg bg-gold-50 border border-gold-100 text-sm space-y-3">
        <div>
          <p className="text-gold-700 font-semibold">Selected Time Slots</p>
          <ul className="mt-2 space-y-2">
            {selectedSlots.map((slot, index) => (
              <li
                key={`${slot.date}-${slot.start}-${slot.end}-${index}`}
                className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm"
              >
                <span>
                  {slot.date} · {slot.start} – {slot.end}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveSlot(index)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-gold-700 font-semibold">Participants</p>
          <p className="text-gold-600 text-xs mt-1">{participantsText}</p>
        </div>
      </div>

      <div>
        <label className="input-label">
          Meeting Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="input"
          placeholder="e.g. Thesis Consultation"
          required
        />
      </div>

      <div>
        <label className="input-label">Concern / Agenda (optional)</label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="input min-h-[80px]"
          placeholder="Topics to discuss, questions..."
        />
      </div>

      {(userRole === "FACULTY" || userRole === "DEAN") && showTeamsLinkForm && (
        <TeamsLinkForm
          teamsLinkMode={teamsLinkMode}
          onModeChange={onTeamsLinkModeChange}
          singleLink={singleLink}
          onSingleLinkChange={onSingleLinkChange}
          slotLinks={slotLinks}
          onSlotLinkChange={onSlotLinkChange}
          timeSlots={teamsLinkSlots}
          error={teamsLinkError}
        />
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        {userRole === "STUDENT" ? (
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="btn-primary text-sm font-semibold px-6 py-3 sm:py-2.5 disabled:opacity-50 w-full sm:w-auto"
          >
            {submitting ? "Booking..." : "Book Consultation"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFacultyClick}
            disabled={submitting || !title.trim()}
            className="btn-primary text-sm font-semibold px-6 py-3 sm:py-2.5 disabled:opacity-50 w-full sm:w-auto"
          >
            {submitting ? "Booking..." : "Create Meeting"}
          </button>
        )}
      </div>
    </form>
  )
}
