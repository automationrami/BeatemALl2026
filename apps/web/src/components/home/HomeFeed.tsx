'use client';

/**
 * Home Feed (S-E5-04). See spec at Beatemall/docs/page-specs/HOME_FEED.md.
 *
 * Phase 1 status (post-pivot 2026-05-02): viewer is resolved via the persona switcher
 * (Zustand → personaId → /api/home?personaId=...). Auth.js v5 (E1-S2) replaces this with
 * a real session lookup later — same payload shape; same callers.
 */
import { useEffect, useState } from 'react';
import type { HomeFeedData } from '@beat-em-all/types';
import { useActAsPersona } from '@beat-em-all/api-client';
import { useHasMounted } from '@beat-em-all/ui';
import { HomeHero } from './HomeHero';
import { RecommendedTeams } from './RecommendedTeams';
import { QuickActions } from './QuickActions';
import { TournamentList } from './TournamentList';
import { VenueList } from './VenueList';
import { RecentActivity } from './RecentActivity';
import { GreetingStrip } from './GreetingStrip';
import { HomeFeedSkeleton } from './HomeFeedSkeleton';

export function HomeFeed() {
  const mounted = useHasMounted();
  const personaId = useActAsPersona((s) => s.activePersonaId);
  const [data, setData] = useState<HomeFeedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    setError(null);
    setData(null);

    fetch(`/api/home?personaId=${encodeURIComponent(personaId)}`, { cache: 'no-store' })
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
      <div className="rounded-[20px] border border-[var(--coral)] bg-[rgba(251,113,133,0.10)] p-6 text-center">
        <p className="text-[var(--coral-2)] text-sm">Couldn’t load the home feed: {error}.</p>
      </div>
    );
  }
  if (!data) return <HomeFeedSkeleton />;

  if (data.viewer.mode === 'incomplete') {
    return (
      <div className="space-y-6">
        <GreetingStrip viewer={data.viewer} />
        <HomeHero hero={data.hero} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GreetingStrip viewer={data.viewer} />
      <HomeHero hero={data.hero} />

      <section className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <RecommendedTeams teams={data.recommendedTeams} primaryGame={data.viewer.primaryGame} />
        <QuickActions />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <TournamentList tournaments={data.tournaments} />
        <VenueList venues={data.nearbyVenues} />
      </section>

      <RecentActivity
        matches={data.recentActivity}
        mode={data.viewer.mode}
        primaryTeamSlug={data.recommendedTeams[0]?.slug ?? null}
      />
    </div>
  );
}
