'use client';

/**
 * Home Feed (S-E5-04). See spec at Beatemall/docs/page-specs/HOME_FEED.md.
 *
 * Phase 1 status (post-pivot 2026-05-02): viewer is resolved via the persona switcher
 * (Zustand → personaId → /api/home?personaId=...). Auth.js v5 (E1-S2) replaces this with
 * a real session lookup later — same payload shape; same callers.
 *
 * Renders a fragment: each section is a direct child of `.bx-page`, so the page grid
 * owns the vertical rhythm.
 */
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TriangleAlert } from 'lucide-react';
import type { HomeFeedData } from '@beat-em-all/types';
import { useActAsPersona } from '@beat-em-all/api-client';
import { Notice, useHasMounted } from '@beat-em-all/ui';
import { HomeHero } from './HomeHero';
import { RecommendedTeams } from './RecommendedTeams';
import { QuickActions } from './QuickActions';
import { TournamentList } from './TournamentList';
import { VenueList } from './VenueList';
import { RecentActivity } from './RecentActivity';
import { GreetingStrip } from './GreetingStrip';
import { HomeFeedSkeleton } from './HomeFeedSkeleton';

export function HomeFeed() {
  const t = useTranslations('home');
  const mounted = useHasMounted();
  const personaId = useActAsPersona((s) => s.activePersonaId);
  const [data, setData] = useState<HomeFeedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    // We want a clean loading state on persona change; resetting state here is
    // intentional (it's the actual "the persona changed" effect, not a render-cascade).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    setData(null);

    fetch('/api/home', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ data: HomeFeedData }>;
      })
      .then((json) => {
        if (!cancelled) setData(json.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [mounted, personaId]);

  // Show skeleton until either hydration completes or fetch resolves.
  if (!mounted || (!data && !error)) return <HomeFeedSkeleton />;

  if (error) {
    return (
      <Notice tone="neutral" icon={<TriangleAlert className="bx-icon text-negative" aria-hidden />}>
        {t('loadError')} <span className="bx-num text-ink-muted">({error})</span>
      </Notice>
    );
  }
  if (!data) return <HomeFeedSkeleton />;

  if (data.viewer.mode === 'incomplete') {
    return (
      <>
        <GreetingStrip viewer={data.viewer} />
        <HomeHero hero={data.hero} />
      </>
    );
  }

  return (
    <>
      <div className="grid gap-6">
        <GreetingStrip viewer={data.viewer} />
        <HomeHero hero={data.hero} />
        <QuickActions />
      </div>

      <RecommendedTeams teams={data.recommendedTeams} primaryGame={data.viewer.primaryGame} />

      <div className="bx-two">
        <TournamentList tournaments={data.tournaments} />
        <RecentActivity
          matches={data.recentActivity}
          mode={data.viewer.mode}
          primaryTeamSlug={data.viewer.primaryTeamSlug ?? null}
        />
      </div>

      <VenueList venues={data.nearbyVenues} />
    </>
  );
}
