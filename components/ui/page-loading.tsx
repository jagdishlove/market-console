export function PageLoading() {
  return (
    <div role="status" aria-label="Loading dashboard" className="min-h-screen bg-canvas">
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-line" aria-hidden="true">
        <div className="load-bar h-full w-1/3 bg-accent" />
      </div>
      <div className="border-b border-line bg-surface px-4 py-3" aria-hidden="true">
        <div className="h-4 w-56 animate-pulse rounded bg-canvas" />
        <div className="mt-2 h-3 w-32 animate-pulse rounded bg-canvas" />
      </div>
      <div className="space-y-4 p-4" aria-hidden="true">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="card h-20 animate-pulse" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card h-80 animate-pulse" />
          <div className="card h-80 animate-pulse" />
        </div>
      </div>
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}
