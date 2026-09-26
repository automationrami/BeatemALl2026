import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { PlaceTag, TeamCrest } from '@beat-em-all/ui';
import type { BracketView } from '@beat-em-all/db/queries';
import { teamCrestColor } from './display';

/** Final standings (M-08): 1st, 2nd, shared 3rd–4th. */
export async function FinalStandings({
  standings,
  locale,
}: {
  standings: BracketView['standings'];
  locale: string;
}) {
  const t = await getTranslations('bracket');
  const rows = [
    ...(standings.first ? [{ place: 1, label: t('place1'), team: standings.first }] : []),
    ...(standings.second ? [{ place: 2, label: t('place2'), team: standings.second }] : []),
    ...standings.thirdFourth.map((team) => ({ place: 3, label: t('place3'), team })),
  ];
  if (rows.length === 0) return null;
  return (
    <ol className="bx-roster" data-testid="standings">
      {rows.map((r) => (
        <li key={r.team.id} data-testid={`standing-${r.place}-${r.team.slug}`}>
          <TeamCrest tag={r.team.tag} color={teamCrestColor(r.team.slug)} size={40} />
          <div className="min-w-0">
            <Link
              href={`/${locale}/teams/${r.team.slug}`}
              className="block truncate font-display text-[16px] font-bold leading-[19px] text-ink no-underline hover:text-gold-text"
            >
              {r.team.name}
            </Link>
            <small>{r.team.tag}</small>
          </div>
          <span />
          <PlaceTag place={r.place} label={r.label} />
        </li>
      ))}
    </ol>
  );
}
