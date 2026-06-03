"use client"

const MINUTE_OPTIONS = [0, 15, 30, 45]

function isValid15MinuteTime(time: string): boolean {
  if (!time) return false
  const [, mins] = time.split(":").map(Number)
  return MINUTE_OPTIONS.includes(mins)
}

interface TimeRange {
  start: string
  end: string
}

interface TimeSlotPickerProps {
  freeRanges: TimeRange[]
  userRole: string
  startHourOpts: number[]
  manualTime: { start: string; end: string } | null
  onManualTimeChange: (time: { start: string; end: string } | null) => void
  onAddBlock: (slot: { start: string; end: string }) => void
  allow24Hours: boolean
  onToggle24Hours: () => void
}

export default function TimeSlotPicker({
  freeRanges,
  userRole,
  startHourOpts,
  manualTime,
  onManualTimeChange,
  onAddBlock,
  allow24Hours,
  onToggle24Hours,
}: TimeSlotPickerProps) {
  const getEndHourOpts = (start: string | null) => {
    if (!start) return startHourOpts
    const [sH, sM] = start.split(":").map(Number)
    const minEndMinutes = sH * 60 + sM + 30
    const minEndH = Math.floor(minEndMinutes / 60)
    return startHourOpts.filter((h) => h >= minEndH)
  }

  const getEndMinuteOpts = (start: string | null, selEndHour: number) => {
    if (!start) return MINUTE_OPTIONS
    const [sH, sM] = start.split(":").map(Number)
    const minEndMinutes = sH * 60 + sM + 30
    const minEndH = Math.floor(minEndMinutes / 60)
    const minEndM = minEndMinutes % 60
    if (selEndHour !== minEndH) return MINUTE_OPTIONS
    return MINUTE_OPTIONS.filter((m) => m >= minEndM)
  }

  const handleAddClick = () => {
    if (
      manualTime?.start &&
      manualTime?.end &&
      isValid15MinuteTime(manualTime.start) &&
      isValid15MinuteTime(manualTime.end)
    ) {
      onAddBlock({ start: manualTime.start, end: manualTime.end })
      onManualTimeChange(null)
    }
  }

  return (
    <div className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
      {freeRanges.length === 0 && userRole === "STUDENT" ? (
        <div className="text-xs text-red-700">
          <p className="font-semibold">No common availability</p>
          <p className="opacity-75">Add a custom block and invited faculty will review it.</p>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          You can also add additional custom blocks for this day.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {userRole !== "STUDENT" && (
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={allow24Hours}
              onChange={onToggle24Hours}
              className="w-3.5 h-3.5 rounded border-slate-300 text-gold-600 focus:ring-gold-500"
            />
            Allow 24-hour range (00:00 – 23:00)
          </label>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-1">
            <label className="text-[10px] font-semibold text-slate-400 sm:hidden w-8">
              Start
            </label>
            <select
              value={manualTime?.start ? manualTime.start.split(":")[0] : ""}
              onChange={(e) => {
                const h = e.target.value
                const m = manualTime?.start?.split(":")[1] || "00"
                const endH = Math.min(parseInt(h) + 1, 23)
                onManualTimeChange({
                  start: `${h}:${m}`,
                  end: `${String(endH).padStart(2, "0")}:00`,
                })
              }}
              className="input text-xs py-2 flex-1 sm:w-auto min-w-0"
            >
              <option value="" disabled>HH</option>
              {startHourOpts.map((h) => (
                <option key={h} value={String(h).padStart(2, "0")}>
                  {String(h).padStart(2, "0")}
                </option>
              ))}
            </select>
            <span className="text-slate-400 font-bold shrink-0">:</span>
            <select
              value={manualTime?.start?.split(":")[1] || ""}
              onChange={(e) => {
                const m = e.target.value
                const h = manualTime?.start?.split(":")[0] || "00"
                onManualTimeChange({
                  start: `${h}:${m}`,
                  end: manualTime?.end || "",
                })
              }}
              className="input text-xs py-2 flex-1 sm:w-auto min-w-0"
            >
              <option value="" disabled>MM</option>
              {MINUTE_OPTIONS.map((m) => (
                <option key={m} value={String(m).padStart(2, "0")}>
                  {String(m).padStart(2, "0")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center sm:px-2">
            <span className="text-xs font-semibold text-slate-400">to</span>
          </div>

          <div className="flex items-center gap-1">
            <label className="text-[10px] font-semibold text-slate-400 sm:hidden w-8">
              End
            </label>
            <select
              value={manualTime?.end ? manualTime.end.split(":")[0] : ""}
              onChange={(e) => {
                const h = e.target.value
                const m = manualTime?.end?.split(":")[1] || "00"
                onManualTimeChange({
                  start: manualTime?.start || "",
                  end: `${h}:${m}`,
                })
              }}
              className="input text-xs py-2 flex-1 sm:w-auto min-w-0"
            >
              <option value="" disabled>HH</option>
              {getEndHourOpts(manualTime?.start || null).map((h) => (
                <option key={h} value={String(h).padStart(2, "0")}>
                  {String(h).padStart(2, "0")}
                </option>
              ))}
            </select>
            <span className="text-slate-400 font-bold shrink-0">:</span>
            <select
              value={manualTime?.end?.split(":")[1] || ""}
              onChange={(e) => {
                const m = e.target.value
                const h = manualTime?.end?.split(":")[0] || "00"
                onManualTimeChange({
                  start: manualTime?.start || "",
                  end: `${h}:${m}`,
                })
              }}
              className="input text-xs py-2 flex-1 sm:w-auto min-w-0"
            >
              <option value="" disabled>MM</option>
              {getEndMinuteOpts(
                manualTime?.start || null,
                parseInt(manualTime?.end?.split(":")[0] || "0")
              ).map((m) => (
                <option key={m} value={String(m).padStart(2, "0")}>
                  {String(m).padStart(2, "0")}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAddClick}
            disabled={!manualTime?.start || !manualTime?.end}
            className="btn-primary text-xs py-3 sm:py-1.5 px-4 disabled:opacity-50 shrink-0"
          >
            Add Block
          </button>
        </div>

        <p className="text-[10px] text-slate-500">
          Min 30 min, max 8 hrs per block. 15-min intervals.
        </p>
      </div>
    </div>
  )
}
