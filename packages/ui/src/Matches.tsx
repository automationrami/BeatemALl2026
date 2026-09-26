import { ChevronRight, Info } from 'lucide-react';
import { Tag } from './Tag';
import { TeamCrest } from './TeamCrest';

type CrestData = { tag: string; color?: string; src?: string | null };
export type MatchSide = {
  name: string;
  crest: CrestData;
  sub?: string;
  score?: number | null;
  winner?: boolean | null;
};

type MatchCardProps = {
  home: MatchSide;
  away: MatchSide;
  /** Top row: game · when · round. All pre-localised. */
  game?: React.ReactNode;
  when?: React.ReactNode;
  round?: React.ReactNode;
  /** Footer: venue name and area. Every match is played in person. */
  venue?: React.ReactNode;
  href?: string;
  linkLabel?: string;
  vsLabel?: string;
  /** Replaces the footer link, e.g. a status tag. */
  status?: React.ReactNode;
};

function Side({ side, home }: { side: MatchSide; home?: boolean }) {
  const crest = (
    <TeamCrest tag={side.crest.tag} color={side.crest.color} src={side.crest.src} size={36} />
  );
  const who = (
    <div className="bx-match__who">
      <b>{side.name}</b>
      {side.sub && <small>{side.sub}</small>}
    </div>
  );
  return (
    <div className={['bx-match__side', home ? 'bx-match__side--home' : ''].join(' ')}>
      {home ? (
        <>
          {who}
          {crest}
        </>
      ) : (
        <>
          {crest}
          {who}
        </>
      )}
    </div>
  );
}

/** Head-to-head match: meta on top, both teams facing the score boxes, venue underneath. */
export function MatchCard({
  home,
  away,
  game,
  when,
  round,
  venue,
  href,
  linkLabel,
  vsLabel = 'VS',
  status,
}: MatchCardProps) {
  const done = typeof home.score === 'number' && typeof away.score === 'number';
  const box = (a: MatchSide, b: MatchSide) =>
    done ? (
      <span
        className={['bx-score', (a.score ?? 0) < (b.score ?? 0) ? 'bx-score--lose' : ''].join(' ')}
      >
        {a.score}
      </span>
    ) : (
      <span className="bx-score bx-score--tbd">–</span>
    );
  return (
    <article className="bx-match">
      {(game || when || round) && (
        <div className="bx-match__meta">
          <span>{game}</span>
          <span>{when}</span>
          <span>{round}</span>
        </div>
      )}
      <div className="bx-match__row">
        <Side side={home} home />
        <div className="bx-match__center">
          {box(home, away)}
          <span className="bx-vs">{vsLabel}</span>
          {box(away, home)}
        </div>
        <Side side={away} />
      </div>
      {(venue || href || status) && (
        <div className="bx-match__foot">
          <span>{venue}</span>
          {status ??
            (href ? (
              <a href={href}>
                {linkLabel}
                <ChevronRight className="bx-icon bx-flip" aria-hidden />
              </a>
            ) : null)}
        </div>
      )}
    </article>
  );
}

type Slot = { name: string; crest: CrestData; score?: number | null; winner?: boolean | null };

function BracketSlot({ t }: { t: Slot }) {
  return (
    <div
      className={[
        'bx-bslot',
        t.winner ? 'bx-bslot--win' : '',
        t.winner === false ? 'bx-bslot--lose' : '',
      ].join(' ')}
    >
      <TeamCrest tag={t.crest.tag} color={t.crest.color} src={t.crest.src} size={24} />
      <span className="bx-bslot__name">{t.name}</span>
      {typeof t.score === 'number' && <span className="bx-bslot__score">{t.score}</span>}
    </div>
  );
}

/** One bracket match: when + status, two slots, the match label. `final` = fire gradient. */
export function BracketMatch({
  a,
  b,
  when,
  status,
  label,
  final,
}: { a: Slot; b: Slot; when?: string; status?: string; label?: string; final?: boolean }) {
  return (
    <article className={['bx-bmatch', final ? 'bx-bmatch--final' : ''].join(' ')}>
      <div className="bx-bmatch__head">
        <span>{when}</span>
        {status && <span className="bx-bmatch__status">{status}</span>}
      </div>
      <BracketSlot t={a} />
      <BracketSlot t={b} />
      {label && (
        <div className="bx-bmatch__foot">
          <span>{label}</span>
          <Info className="bx-icon" aria-hidden />
        </div>
      )}
    </article>
  );
}

/** Champion slot at the end of a bracket; `third` renders the third-place slot on the band. */
export function BracketWinner({
  team,
  label,
  third,
}: { team: Slot; label: string; third?: boolean }) {
  return (
    <div className={['bx-bwinner', third ? 'bx-bwinner--third' : ''].join(' ')}>
      <div className="bx-bwinner__label">{label}</div>
      <BracketSlot t={team} />
    </div>
  );
}

type CompetitionTileProps = {
  position: number;
  /** Pre-localised, e.g. "Position #1". */
  positionLabel: string;
  /** Pre-localised, e.g. "1,000 points". */
  pointsLabel?: string;
  name: string;
  sub?: string;
  href?: string;
};

/** One tournament entered: finishing position, points earned, event name. #1 gets the gold outline. */
export function CompetitionTile({
  position,
  positionLabel,
  pointsLabel,
  name,
  sub,
  href,
}: CompetitionTileProps) {
  const top = position === 1;
  const Tile = href ? 'a' : 'article';
  return (
    <Tile className={['bx-comptile', top ? 'bx-comptile--top' : ''].join(' ')} href={href}>
      <div className="bx-comptile__top">
        <Tag tone={top ? 'gold' : position <= 3 ? 'ink' : 'neutral'}>{positionLabel}</Tag>
        {pointsLabel && <span className="bx-comptile__pts">{pointsLabel}</span>}
      </div>
      <div className="bx-comptile__name">{name}</div>
      {sub && <div className="bx-comptile__sub">{sub}</div>}
    </Tile>
  );
}
