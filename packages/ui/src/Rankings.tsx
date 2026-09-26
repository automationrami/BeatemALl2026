import { ChevronDown, Crown, Users } from 'lucide-react';
import { MedalSet, RankDelta } from './Tag';
import { TeamCrest } from './TeamCrest';

type CrestData = { tag: string; color?: string; src?: string | null };

type PodiumCardProps = {
  place: 1 | 2 | 3;
  name: string;
  crest: CrestData;
  /** Pre-localised: "Position". */
  positionLabel: string;
  /** Pre-localised: "Team". */
  kicker: string;
  meta?: React.ReactNode;
  stats: { label: React.ReactNode; value: React.ReactNode }[];
  href?: string;
};

/** Top-three card: black band with a gold, silver or bronze position tab. */
export function PodiumCard({
  place,
  name,
  crest,
  positionLabel,
  kicker,
  meta,
  stats,
  href,
}: PodiumCardProps) {
  const Tag = href ? 'a' : 'article';
  return (
    <Tag className={`bx-podium bx-podium--${place}`} href={href}>
      <div className="bx-podium__pos">
        <span>{positionLabel}</span>
        <b>#{place}</b>
      </div>
      <div className="bx-podium__kicker">{kicker}</div>
      <h3 className="bx-podium__name">{name}</h3>
      {meta && (
        <div className="bx-podium__meta">
          <Users className="bx-icon" aria-hidden />
          {meta}
        </div>
      )}
      <div className="bx-podium__stats">
        {stats.map((s, i) => (
          <div key={i} className="bx-podium__stat">
            <span>{s.label}</span>
            <b>{s.value}</b>
          </div>
        ))}
      </div>
      <div className="bx-podium__crest">
        <TeamCrest tag={crest.tag} color={crest.color} src={crest.src} size={76} />
      </div>
    </Tag>
  );
}

export type StandingsRow = {
  id: string;
  rank: number;
  delta?: number;
  name: string;
  sub?: string;
  crest: CrestData;
  eligible?: boolean;
  points: number;
  medals?: { gold: number; silver: number; bronze: number };
  prize?: { label: string; amount: string } | null;
  me?: boolean;
  muted?: boolean;
  href?: string;
};

type StandingsLabels = {
  caption: string;
  rank: string;
  delta: string;
  team: string;
  points: string;
  medals: string;
  prize: string;
  eligible: string;
  more: string;
  /** Builds the screen-reader text for rank movement. */
  deltaSr: (value: number) => string;
};

/** The leaderboard table. Columns hide as the container narrows (prize, medals, then movement). */
export function StandingsTable({
  rows,
  labels,
}: { rows: StandingsRow[]; labels: StandingsLabels }) {
  const hasPrize = rows.some((r) => r.prize);
  const hasMedals = rows.some((r) => r.medals);
  const fmt = (n: number) => n.toLocaleString('en-US');
  return (
    <div className="bx-standings">
      <table className="bx-table">
        <caption className="bx-sr">{labels.caption}</caption>
        <thead>
          <tr>
            <th className="bx-c-rank" scope="col">
              {labels.rank}
            </th>
            <th className="bx-c-delta" scope="col">
              {labels.delta}
            </th>
            <th scope="col">{labels.team}</th>
            <th className="bx-c-elig" scope="col">
              <span className="bx-sr">{labels.eligible}</span>
            </th>
            <th className="bx-c-points" scope="col">
              {labels.points}
            </th>
            {hasMedals && (
              <th className="bx-c-medals" scope="col">
                {labels.medals}
              </th>
            )}
            {hasPrize && (
              <th className="bx-c-prize" scope="col">
                {labels.prize}
              </th>
            )}
            <th className="bx-c-more" scope="col">
              <span className="bx-sr">{labels.more}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={[r.me ? 'is-me' : '', r.muted ? 'is-muted' : ''].join(' ')}>
              <td className="bx-c-rank">
                <span className={['bx-rankno', r.rank <= 3 ? 'bx-rankno--top' : ''].join(' ')}>
                  #{r.rank}
                </span>
              </td>
              <td className="bx-c-delta">
                <RankDelta value={r.delta ?? 0} srLabel={labels.deltaSr(r.delta ?? 0)} />
              </td>
              <td>
                {(() => {
                  const inner = (
                    <>
                      <TeamCrest
                        tag={r.crest.tag}
                        color={r.crest.color}
                        src={r.crest.src}
                        size={32}
                      />
                      <div className="min-w-0">
                        <b>{r.name}</b>
                        {r.sub && <small>{r.sub}</small>}
                      </div>
                    </>
                  );
                  return r.href ? (
                    <a className="bx-teamcell" href={r.href}>
                      {inner}
                    </a>
                  ) : (
                    <div className="bx-teamcell">{inner}</div>
                  );
                })()}
              </td>
              <td className="bx-c-elig">
                {r.eligible && (
                  <span className="bx-crown" title={labels.eligible}>
                    <Crown className="bx-icon" aria-label={labels.eligible} />
                  </span>
                )}
              </td>
              <td className="bx-c-points">
                <span className="bx-points">{fmt(r.points)}</span>
              </td>
              {hasMedals && (
                <td className="bx-c-medals">{r.medals && <MedalSet {...r.medals} />}</td>
              )}
              {hasPrize && (
                <td className="bx-c-prize">
                  {r.prize && (
                    <div className="bx-prize">
                      <span>{r.prize.label}</span>
                      <b>{r.prize.amount}</b>
                    </div>
                  )}
                </td>
              )}
              <td className="bx-c-more bx-c-end">
                {r.href ? (
                  <a className="bx-expand" href={r.href} aria-label={`${labels.more}: ${r.name}`}>
                    <ChevronDown className="bx-icon -rotate-90 rtl:rotate-90" aria-hidden />
                  </a>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
