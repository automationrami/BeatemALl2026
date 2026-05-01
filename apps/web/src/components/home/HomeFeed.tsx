'use client';

/**
 * Home Feed (S-E5-04). See spec at Beatemall/docs/page-specs/HOME_FEED.md.
 *
 * Note on client/server split: per app/CLAUDE.md the default is Server Components, but the
 * Home Feed is viewer-aware and the active persona lives in a client-side Zustand store
 * (persisted in localStorage). The page.tsx shell stays server; this composer is `'use client'`
 * and reads the persona before calling the synchronous mock accessor.
 *
 * In Phase 9 the persona is replaced by a real session and the data fetch becomes async, but the
 * sectional structure here doesn't need to change.
 */
import { useMemo } from 'react';
import { useActAsPersona, getHomeFeed } from '@beat-em-all/api-client';
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

  // Recompute every persona change. `now` is held stable across the same persona to avoid
  // greeting flips on every keystroke / interaction. Real Date is fine on the client.
  const data = useMemo(() => getHomeFeed(personaId), [personaId]);

  // While the persisted Zustand store is hydrating, render the same skeleton the page would
  // produce on a slow connection. This avoids the "wrong persona briefly visible" flash.
  if (!mounted) return <HomeFeedSkeleton />;

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
