'use client';

/**
 * Skeleton matching HomeFeed layout. Same row heights and column splits so there's
 * no layout shift when the persisted persona Zustand store finishes hydrating.
 */
export function HomeFeedSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-baseline justify-between gap-3">
        <div className="h-8 w-64 rounded-lg bg-[rgba(255,255,255,0.04)]" />
        <div className="h-3 w-32 rounded bg-[rgba(255,255,255,0.04)] hidden sm:block" />
      </div>

      {/* Hero */}
      <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-7 min-h-[220px]" />

      {/* Recommended teams + Quick actions */}
      <section className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5 min-h-[200px]" />
        <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5 min-h-[200px]" />
      </section>

      {/* Tournaments + Venues */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5 min-h-[260px]" />
        <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5 min-h-[260px]" />
      </section>

      {/* Recent activity */}
      <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5 min-h-[200px]" />
    </div>
  );
}
