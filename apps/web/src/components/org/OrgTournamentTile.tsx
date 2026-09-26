import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Tag } from '@beat-em-all/ui';

type OrgTournamentTileProps = {
  href: string;
  name: string;
  game: string;
  status: { label: string; tone: 'soft' | 'live' | 'neutral' };
  /** Pre-localised sanctioned label; omit when the event is not sanctioned. */
  sanctionedLabel?: string;
  /** Pre-formatted prize pool, e.g. "KWD 1,500". */
  prize?: string;
};

/** One tournament hosted by an organization: status, name as an italic wordmark, game, prize. */
export function OrgTournamentTile({
  href,
  name,
  game,
  status,
  sanctionedLabel,
  prize,
}: OrgTournamentTileProps) {
  return (
    <Link
      href={href}
      className="bx-card bx-card--flat grid gap-4 p-5 transition-[filter] hover:brightness-110 focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone={status.tone}>{status.label}</Tag>
        {sanctionedLabel ? (
          <Tag tone="org" icon={<ShieldCheck className="bx-icon" aria-hidden />}>
            {sanctionedLabel}
          </Tag>
        ) : null}
      </div>
      <p className="font-display text-[20px] leading-[24px] font-extrabold italic uppercase text-ink text-balance rtl:normal-case rtl:not-italic">
        {name}
      </p>
      <div className="flex items-end justify-between gap-3">
        <span className="bx-eyebrow">{game}</span>
        {prize ? <span className="bx-num bx-gold-num text-[18px]">{prize}</span> : null}
      </div>
    </Link>
  );
}
