import { Trophy } from 'lucide-react';
import { Avatar } from './Avatar';
import { StatStrip } from './Layout';
import { Tag } from './Tag';
import { TeamCrest } from './TeamCrest';

type StatItem = {
  label: React.ReactNode;
  value: React.ReactNode;
  of?: React.ReactNode;
  tone?: 'gold';
};

type ProfileHeaderProps = {
  /** The mark cell: a <TeamCrest size={120}/> or <Avatar size={120}/>. */
  mark: React.ReactNode;
  name: React.ReactNode;
  tags?: React.ReactNode;
  meta?: { icon?: React.ReactNode; text: React.ReactNode }[];
  bio?: React.ReactNode;
  actions?: React.ReactNode;
  stats?: StatItem[];
};

/** Identity card at the top of team and player pages, with a stat strip below. */
export function ProfileHeader({ mark, name, tags, meta, bio, actions, stats }: ProfileHeaderProps) {
  return (
    <section className="bx-profile">
      <div className="bx-profile__top">
        <div className="bx-profile__mark">{mark}</div>
        <div className="bx-profile__id">
          {tags && <div className="bx-profile__kicker">{tags}</div>}
          <h1 className="bx-profile__name">{name}</h1>
          {meta && meta.length > 0 && (
            <div className="bx-profile__meta">
              {meta.map((m, i) => (
                <span key={i}>
                  {m.icon}
                  {m.text}
                </span>
              ))}
            </div>
          )}
          {bio && <p className="bx-profile__bio">{bio}</p>}
          {actions && <div className="bx-profile__actions">{actions}</div>}
        </div>
      </div>
      {stats && stats.length > 0 && <StatStrip items={stats} />}
    </section>
  );
}

type RosterMember = {
  id: string;
  name: string;
  role: React.ReactNode;
  rating?: React.ReactNode;
  verified?: boolean;
  tag?: { text: React.ReactNode; tone?: 'gold' | 'ink' | 'neutral' };
  href?: string;
};

/** A team's players: avatar, name, role, optional tag, rating. Captain first. */
export function RosterList({ members }: { members: RosterMember[] }) {
  return (
    <ul className="bx-roster">
      {members.map((m) => {
        const body = (
          <>
            <Avatar name={m.name} size={40} verified={m.verified} />
            <div className="min-w-0">
              <b>{m.name}</b>
              <small>{m.role}</small>
            </div>
            {m.tag ? <Tag tone={m.tag.tone ?? 'neutral'}>{m.tag.text}</Tag> : <span />}
            <span className="bx-roster__rating">{m.rating}</span>
          </>
        );
        return (
          <li key={m.id}>
            {m.href ? (
              <a href={m.href} className="contents">
                {body}
              </a>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}

type WinnerHeroProps = {
  badge: string;
  event: React.ReactNode;
  org?: React.ReactNode;
  crest?: { tag: string; color?: string; src?: string | null };
  name: React.ReactNode;
  prizeLabel: React.ReactNode;
  prize: React.ReactNode;
  bonus?: React.ReactNode;
  facts?: { k: React.ReactNode; v: React.ReactNode }[];
  actions?: React.ReactNode;
  image?: string | null;
  monogram?: string;
};

/** Champion announcement: identity and prize on the band, team photo or fire stage on the right. Always dark. */
export function WinnerHero(p: WinnerHeroProps) {
  return (
    <div className="bx-hero-wrap">
      <section className="bx-hero">
        <div className="bx-hero__panel">
          <div className="bx-hero__eyebrow">
            <Tag tone="outline">{p.badge}</Tag>
            <span>{p.event}</span>
            {p.org && <em>{p.org}</em>}
          </div>
          {p.crest && (
            <TeamCrest tag={p.crest.tag} color={p.crest.color} src={p.crest.src} size={72} />
          )}
          <h2 className="bx-hero__name">{p.name}</h2>
          <div>
            <div className="bx-hero__prize-label">{p.prizeLabel}</div>
            <div className="bx-hero__prize">{p.prize}</div>
            {p.bonus && <div className="bx-hero__bonus">{p.bonus}</div>}
          </div>
          {p.facts && p.facts.length > 0 && (
            <div className="bx-hero__facts">
              {p.facts.map((f, i) => (
                <div key={i}>
                  <span>{f.k}</span>
                  {f.v}
                </div>
              ))}
            </div>
          )}
          {p.actions && <div className="bx-hero__actions">{p.actions}</div>}
        </div>
        <div className="bx-hero__art" aria-hidden={p.image ? undefined : true}>
          {p.image ? (
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
