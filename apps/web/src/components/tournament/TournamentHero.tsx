import { ShieldCheck, Trophy } from 'lucide-react';
import { Tag } from '@beat-em-all/ui';

type Fact = { k: React.ReactNode; v: React.ReactNode };

type TournamentHeroProps = {
  status: React.ReactNode;
  statusTone: 'live' | 'soft' | 'neutral';
  event: React.ReactNode;
  org: React.ReactNode;
  sanctionedLabel?: string;
  name: React.ReactNode;
  prizeLabel: React.ReactNode;
  prize: React.ReactNode;
  facts: Fact[];
  actions?: React.ReactNode;
  image?: string | null;
  monogram: string;
};

/**
 * Tournament header on the band before a champion exists: status, org, prize pool in
 * gold, key facts and the register action, with the fire stage (or cover) on the side.
 * Built on the `bx-hero` classes so it matches WinnerHero once results land.
 */
export function TournamentHero(p: TournamentHeroProps) {
  // The @container wrapper matters: `.bx-hero` is its own size container, and an element
  // cannot query itself, so the one-column phone layout only applies with an outer container.
  return (
    <div className="@container">
      <section className="bx-hero">
        <div className="bx-hero__panel">
          <div className="bx-hero__eyebrow flex-wrap">
            <Tag tone={p.statusTone === 'neutral' ? 'outline' : p.statusTone}>{p.status}</Tag>
            <span>{p.event}</span>
            <em className="inline-flex items-center gap-1.5">
              {p.sanctionedLabel ? (
                <ShieldCheck
                  className="bx-icon text-gold-text"
                  role="img"
                  aria-label={p.sanctionedLabel}
                />
              ) : null}
              {p.org}
            </em>
          </div>
          <h1 className="bx-hero__name">{p.name}</h1>
          <div>
            <div className="bx-hero__prize-label">{p.prizeLabel}</div>
            <div className="bx-hero__prize">{p.prize}</div>
          </div>
          {p.facts.length > 0 && (
            <dl className="bx-hero__facts m-0">
              {p.facts.map((f, i) => (
                <div key={i} className="flex flex-wrap items-baseline">
                  {f.k ? <dt className="me-1.5 font-medium text-on-band-muted">{f.k}</dt> : null}
                  <dd className="m-0">{f.v}</dd>
                </div>
              ))}
            </dl>
          )}
          {p.actions && <div className="flex flex-wrap items-start gap-3 pt-2">{p.actions}</div>}
        </div>
        <div className="bx-hero__art" aria-hidden>
          {p.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- decorative cover, same markup as WinnerHero
            <img src={p.image} alt="" />
          ) : (
            <>
              <span className="bx-hero__mono">{p.monogram}</span>
              <span className="bx-hero__trophy">
                <Trophy className="bx-icon" aria-hidden />
              </span>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
