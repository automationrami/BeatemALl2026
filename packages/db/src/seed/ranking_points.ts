/**
 * RankingPoint seeds (FED-1, DOMAIN_MODEL.md §11.3) — placements from the two completed
 * KEC-sanctioned events of the spring 2026 season.
 *
 * Points follow the placement formula example in FED-1 US-FED1.2 (1st 100, 2nd 75).
 * The awarding organization is always the tournament's organization, which must be
 * Federation tier.
 */

export type RankingPointSeed = {
  tournamentSlug: string;
  recipientType: 'team' | 'player';
  /** teams.slug or players.slug depending on recipientType. */
  recipientSlug: string;
  placement: number;
  points: number;
  season: string;
};

export const PLACEMENT_POINTS: Record<number, number> = { 1: 100, 2: 75 };

export const RANKING_POINT_SEEDS: RankingPointSeed[] = [
  {
    tournamentSlug: 'kec-spring-opener-26',
    recipientType: 'team',
    recipientSlug: 'sandstorm',
    placement: 1,
    points: 100,
    season: '2026-spring',
  },
  {
    tournamentSlug: 'kec-spring-opener-26',
    recipientType: 'team',
    recipientSlug: 'falcon-squad',
    placement: 2,
    points: 75,
    season: '2026-spring',
  },
  {
    tournamentSlug: 'kec-eafc-open-26',
    recipientType: 'team',
    recipientSlug: 'desert-dragons',
    placement: 1,
    points: 100,
    season: '2026-spring',
  },
  {
    tournamentSlug: 'kec-eafc-open-26',
    recipientType: 'team',
    recipientSlug: 'sandstorm',
    placement: 2,
    points: 75,
    season: '2026-spring',
  },
];
