'use client';

/**
 * Skeleton matching the HomeFeed layout (same sections, column splits and rough heights)
 * so there's no layout shift when the persisted persona store hydrates and the feed loads.
 * Renders a fragment so each block sits in the `.bx-page` grid like the real sections.
 */
const BLOCK = 'animate-pulse rounded-lg bg-surface-100';
const LINE = 'animate-pulse rounded-sm bg-surface-200';
const PANEL = 'animate-pulse rounded-xl bg-surface-100';

function SectionHead() {
  return (
    <div className="mb-6 grid gap-2">
      <div className={`${LINE} h-3 w-32`} />
      <div className={`${LINE} h-9 w-64 max-w-full`} />
    </div>
  );
}

export function HomeFeedSkeleton() {
  return (
    <>
      <div className="grid gap-6">
        <div className="grid gap-3">
          <div className={`${LINE} h-10 w-80 max-w-full`} />
          <div className={`${LINE} h-4 w-[28rem] max-w-full`} />
        </div>
        <div className="min-h-[300px] animate-pulse rounded-xl bg-band" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${BLOCK} h-20`} />
          ))}
        </div>
      </div>

      <div>
        <SectionHead />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${BLOCK} h-52`} />
          ))}
        </div>
      </div>

      <div className="bx-two">
        <div>
          <SectionHead />
          <div className={`${PANEL} h-[330px]`} />
        </div>
        <div>
          <SectionHead />
          <div className={`${PANEL} h-[200px]`} />
        </div>
      </div>
    </>
  );
}
