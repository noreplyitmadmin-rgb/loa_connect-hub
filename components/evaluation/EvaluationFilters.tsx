"use client"

interface FilterOption {
  value: string
  label: string
}

interface EvaluationFiltersProps {
  periods: FilterOption[]
  selectedPeriod: string
  onPeriodChange: (value: string) => void
  departments?: FilterOption[]
  selectedDepartment?: string
  onDepartmentChange?: (value: string) => void
}

export function EvaluationFilters({
  periods,
  selectedPeriod,
  onPeriodChange,
  departments,
  selectedDepartment,
  onDepartmentChange,
}: EvaluationFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">
          Evaluation Period
        </label>
        <select
          value={selectedPeriod}
          onChange={(e) => onPeriodChange(e.target.value)}
          className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-primary min-w-44 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        >
          {periods.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {departments && onDepartmentChange && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">
            Department
          </label>
          <select
            value={selectedDepartment || ""}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-primary min-44 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
