"use client"

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="ios-table-section p-12 text-center space-y-4 mx-4">
      <div className="text-5xl text-[var(--color-text-muted)]">⚠</div>
      <h1 className="text-lg font-bold text-[var(--color-text)]">Something went wrong</h1>
      <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto">
        {message ?? "An unexpected error occurred. Please try again later."}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ios-primary text-sm h-9 px-5">
          Try again
        </button>
      )}
    </div>
  )
}
