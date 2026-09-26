'use client';

import { useState } from 'react';

type TabItem = { value: string; label: string; href?: string };

type SegmentedTabsProps = {
  items: TabItem[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
};

/**
 * Pill track of uppercase tabs; the selected tab turns into the black band.
 * Items with `href` render as links (server-driven views); otherwise it is a
 * client toggle, controlled (value + onChange) or uncontrolled.
 */
export function SegmentedTabs({ items, value, onChange, label }: SegmentedTabsProps) {
  const [local, setLocal] = useState(value ?? items[0]?.value);
  const current = onChange ? value : local;
  return (
    <div className="bx-seg" role="tablist" aria-label={label}>
      {items.map((it) =>
        it.href ? (
          <a key={it.value} role="tab" href={it.href} aria-selected={it.value === current}>
            {it.label}
          </a>
        ) : (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={it.value === current}
            onClick={() => (onChange ? onChange(it.value) : setLocal(it.value))}
          >
            {it.label}
          </button>
        ),
      )}
    </div>
  );
}

type GameTilesProps = {
  games: { slug: string; name: string }[];
  value?: string;
  onChange?: (slug: string) => void;
  allLabel: string;
  label?: string;
};

/** Game filter tiles: names as italic wordmarks, with a black "all games" tile first. */
export function GameTiles({ games, value, onChange, allLabel, label }: GameTilesProps) {
  const [local, setLocal] = useState(value ?? 'all');
  const current = onChange ? value : local;
  const pick = (v: string) => (onChange ? onChange(v) : setLocal(v));
  return (
    <div className="bx-gametiles" role="group" aria-label={label}>
      <button
        type="button"
        className="bx-gametile bx-gametile--all"
        aria-pressed={current === 'all'}
        onClick={() => pick('all')}
      >
        {allLabel}
      </button>
      {games.map((g) => (
        <button
          key={g.slug}
          type="button"
          className="bx-gametile"
          aria-pressed={current === g.slug}
          onClick={() => pick(g.slug)}
        >
          {g.name}
        </button>
      ))}
    </div>
  );
}
