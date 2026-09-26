import { TeamCrest } from '@beat-em-all/ui';

type HeroTeam = { name: string; tag: string; sub?: string | null; role: string };

type ChallengeHeroProps = {
  /** Accessible page heading, e.g. "Sandstorm vs Falcon Squad". */
  title: string;
  challenger: HeroTeam;
  challenged: HeroTeam;
  /** Tags row above the teams (status, format, game). */
  tags: React.ReactNode;
  vsLabel?: string;
};

function Side({ team }: { team: HeroTeam }) {
  return (
    <div className="grid min-w-0 justify-items-center gap-3 text-center">
      <span className="bx-eyebrow text-on-band-muted">{team.role}</span>
      <TeamCrest tag={team.tag} size={88} />
      <div className="min-w-0 max-w-full">
        <p className="font-display text-[16px] leading-[20px] font-bold uppercase tracking-[0.04em] text-balance break-words text-on-band min-[900px]:text-[28px] min-[900px]:leading-[32px] rtl:normal-case rtl:tracking-normal">
          {team.name}
        </p>
        {team.sub ? <p className="bx-eyebrow mt-1 text-on-band-muted">{team.sub}</p> : null}
      </div>
    </div>
  );
}

/** Challenge detail hero: the two crests facing each other on the black band. */
export function ChallengeHero({
  title,
  challenger,
  challenged,
  tags,
  vsLabel = 'VS',
}: ChallengeHeroProps) {
  return (
    <section className="bx-card bg-band text-on-band">
      <div className="grid gap-8 p-5 min-[900px]:p-8">
        <h1 className="bx-sr">{title}</h1>
        <div className="flex flex-wrap items-center gap-2">{tags}</div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 min-[900px]:gap-8">
          <Side team={challenger} />
          <span
            className="font-display text-[28px] leading-none font-bold text-ink-faint min-[900px]:text-[44px]"
            aria-hidden
          >
            {vsLabel}
          </span>
          <Side team={challenged} />
        </div>
      </div>
    </section>
  );
}
