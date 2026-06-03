"use client"

interface ResultBannerProps {
  result: { success: number; errors: string[]; sessionGroupId?: string } | null
}

export default function ResultBanner({ result }: ResultBannerProps) {
  if (!result) return null

  return (
    <div
      className={`p-3 rounded-lg text-xs font-medium border ${
        result.errors.length > 0
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-emerald-50 text-emerald-700 border-emerald-200"
      }`}
    >
      {result.success > 0 && <p>{result.success} appointment(s) created successfully.</p>}
      {result.sessionGroupId && (
        <p className="text-[10px] opacity-75 mt-1">Session: {result.sessionGroupId}</p>
      )}
      {result.errors.map((err, i) => (
        <p key={i} className="text-red-600">
          {err}
        </p>
      ))}
    </div>
  )
}
