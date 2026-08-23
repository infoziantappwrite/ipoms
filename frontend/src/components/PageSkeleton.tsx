'use client';

/**
 * Universal Shimmer Skeleton Loading layout for iPOMS.
 * Rendered when the browser or network is loading pages or data.
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans animate-pulse">
      {/* ── Top Header Skeleton ────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 space-y-3 shrink-0 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-200" />
              <div className="w-36 h-5 rounded-md bg-slate-200" />
              <div className="w-24 h-4 rounded-full bg-slate-100 border border-slate-200" />
            </div>
            <div className="w-48 h-3 rounded-md bg-slate-200/80" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-28 h-8 rounded-xl bg-slate-200" />
            <div className="w-8 h-8 rounded-full bg-slate-200" />
          </div>
        </div>

        {/* Sub-bar shimmer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-48 h-8 rounded-xl bg-slate-200" />
            <div className="w-36 h-8 rounded-xl bg-slate-200" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-28 h-7 rounded-xl bg-slate-100" />
            <div className="w-24 h-7 rounded-xl bg-slate-100" />
          </div>
        </div>
      </header>

      {/* ── Toolbar Shimmer ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-6 py-3 bg-slate-50/80 border-b border-slate-200">
        <div className="w-20 h-8 rounded-xl bg-slate-200" />
        <div className="w-20 h-8 rounded-xl bg-slate-200" />
        <div className="w-24 h-8 rounded-xl bg-slate-200" />
        <div className="h-6 w-px bg-slate-200 mx-1" />
        <div className="w-36 h-8 rounded-xl bg-slate-200" />
        <div className="w-64 h-8 rounded-xl bg-slate-200" />
      </div>

      {/* ── KPI Cards Shimmer Row ──────────────────────────────────────── */}
      <div className="px-6 py-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-2xs"
          >
            <div className="w-16 h-3 rounded bg-slate-200" />
            <div className="w-10 h-6 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* ── Table Grid Shimmer ─────────────────────────────────────────── */}
      <div className="flex-1 px-6 pb-4">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-slate-100/70 border-b border-slate-200">
            <div className="col-span-1 h-3.5 bg-slate-200 rounded" />
            <div className="col-span-1 h-3.5 bg-slate-200 rounded" />
            <div className="col-span-1 h-3.5 bg-slate-200 rounded" />
            <div className="col-span-3 h-3.5 bg-slate-200 rounded" />
            <div className="col-span-2 h-3.5 bg-slate-200 rounded" />
            <div className="col-span-2 h-3.5 bg-slate-200 rounded" />
            <div className="col-span-2 h-3.5 bg-slate-200 rounded" />
          </div>

          {/* Table Rows (8 Shimmer Rows) */}
          <div className="divide-y divide-slate-100">
            {[...Array(8)].map((_, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 px-4 py-3.5 items-center">
                <div className="col-span-1 h-3 bg-slate-200/70 rounded w-6" />
                <div className="col-span-1 h-3 bg-slate-200/70 rounded w-14" />
                <div className="col-span-1 h-3 bg-slate-200/70 rounded w-14" />
                <div className="col-span-3 h-3.5 bg-slate-200 rounded w-4/5" />
                <div className="col-span-2 h-3 bg-slate-200/70 rounded w-3/4" />
                <div className="col-span-2 h-3 bg-slate-200/70 rounded w-2/3" />
                <div className="col-span-2 h-5 bg-slate-100 border border-slate-200 rounded-full w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
