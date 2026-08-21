/**
 * Loading state for the dashboard body.
 *
 * A skeleton in the shape of the real layout, not a centred spinner: the
 * coordinator's eye settles on where the funnel and the assigned-work list are
 * about to appear, so the page does not jump when data lands.
 */
export function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="mx-auto w-full max-w-7xl space-y-6 p-6"
    >
      <span className="sr-only">Loading your dashboard…</span>

      {/* Funnel */}
      <div className="rounded-panel border border-border bg-surface p-5 shadow-2">
        <Bar className="h-4 w-40" />
        <div className="mt-6 flex flex-col gap-5 lg:flex-row">
          <div className="flex shrink-0 items-center gap-3.5 lg:w-56">
            <Bar className="h-11 w-11 rounded-panel" />
            <div className="flex-1 space-y-2">
              <Bar className="h-6 w-16" />
              <Bar className="h-3 w-28" />
            </div>
          </div>
          <div aria-hidden className="hidden w-px bg-border lg:block" />
          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2.5">
                <Bar className="h-3 w-24" />
                <Bar className="h-6 w-12" />
                <Bar className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assigned work */}
      <div className="rounded-panel border border-border bg-surface p-5 shadow-2">
        <Bar className="h-4 w-36" />
        <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2.5 rounded-panel border border-border bg-surface-sunken p-4">
              <Bar className="h-4 w-2/3" />
              <Bar className="h-3 w-1/2" />
              <Bar className="h-3 w-5/6" />
              <Bar className="h-7 w-full rounded-control" />
            </div>
          ))}
        </div>
      </div>

      {/* Lower row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-3 rounded-panel border border-border bg-surface p-5 shadow-2 lg:col-span-2">
          <Bar className="h-4 w-32" />
          <Bar className="h-4 w-3/4" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Bar className="h-16 rounded-panel" />
            <Bar className="h-16 rounded-panel" />
          </div>
        </div>
        <div className="space-y-3 rounded-panel border border-border bg-surface p-5 shadow-2 lg:col-span-3">
          <Bar className="h-4 w-20" />
          {[0, 1, 2].map((i) => (
            <Bar key={i} className="h-14 rounded-panel" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Single shimmering placeholder block. */
function Bar({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-control bg-surface-sunken ${className}`} />;
}
