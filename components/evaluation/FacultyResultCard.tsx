"use client"

interface CategoryScore {
  label: string
  score: number | null
}

interface FacultyResultCardProps {
  facultyName: string
  departmentName?: string | null
  totalRespondents: number
  generalRating: number | null
  remarks: string | null
  categories: CategoryScore[]
}

const REMARKS_COLORS: Record<string, string> = {
  Outstanding: "text-emerald-700 bg-emerald-50 border-emerald-200",
  "Very Satisfactory": "text-blue-700 bg-blue-50 border-blue-200",
  Satisfactory: "text-amber-700 bg-amber-50 border-amber-200",
  Unsatisfactory: "text-rose-700 bg-rose-50 border-rose-200",
  Poor: "text-red-700 bg-red-50 border-red-200",
}

export function FacultyResultCard({
  facultyName,
  departmentName,
  totalRespondents,
  generalRating,
  remarks,
  categories,
}: FacultyResultCardProps) {
  const remarkClass = remarks ? REMARKS_COLORS[remarks] || "text-slate-700 bg-slate-50 border-slate-200" : ""

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-primary">{facultyName}</h3>
          {departmentName && (
            <p className="text-sm text-tertiary mt-0.5">{departmentName}</p>
          )}
        </div>
        {remarks && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${remarkClass}`}>
            {remarks}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">
            {generalRating !== null ? generalRating.toFixed(2) : "—"}
          </div>
          <div className="text-[10px] text-tertiary uppercase tracking-wider mt-0.5">General Rating</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-secondary">{totalRespondents}</div>
          <div className="text-[10px] text-tertiary uppercase tracking-wider mt-0.5">Respondents</div>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          {categories.map((cat) => (
            <div key={cat.label} className="flex items-center justify-between text-sm">
              <span className="text-secondary">{cat.label}</span>
              <span className="font-semibold text-primary">
                {cat.score !== null ? cat.score.toFixed(2) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
