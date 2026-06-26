interface LockedTabProps {
  endpoint: string
}

export default function LockedTab({ endpoint }: LockedTabProps) {
  const cleanEndpoint = endpoint.split('?')[0]
  return (
    <div className="card p-12 text-center space-y-4">
      <div className="text-4xl text-tertiary">&#x1f512;</div>
      <h1 className="text-lg font-bold text-primary">Access Restricted</h1>
      <p className="text-sm text-tertiary max-w-md mx-auto">
        This tab requires the <strong>ADMIN role</strong> or a user-permissions grant for
      </p>
      <code className="inline-block px-3 py-1.5 rounded-lg bg-surface-hover text-xs font-mono text-secondary max-w-full break-all">
        {cleanEndpoint}
      </code>
    </div>
  )
}
