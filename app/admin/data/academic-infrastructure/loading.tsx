export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4 sm:px-0">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 bg-surface-dim rounded" />
        <div className="h-4 w-96 bg-surface-dim rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-28 bg-surface-dim rounded-lg animate-pulse-soft" />
        <div className="h-8 w-40 bg-surface-dim rounded-lg animate-pulse-soft" />
        <div className="h-8 w-36 bg-surface-dim rounded-lg animate-pulse-soft" />
        <div className="h-8 w-52 bg-surface-dim rounded-lg animate-pulse-soft" />
      </div>
      <div className="h-64 bg-surface-dim rounded-xl animate-pulse-soft" />
    </div>
  )
}
