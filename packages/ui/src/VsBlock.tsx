import { TeamCrest } from './TeamCrest';

type VsTeam = {
  tag: string;
  name: string;
  country: string;
  accentColor: string;
};

type VsBlockProps = {
  teamA: VsTeam;
  teamB: VsTeam;
  /** Optional element rendered between the two teams (e.g. status pill). */
  status?: React.ReactNode;
  /** Crest pixel size. Defaults to 48. */
  crestSize?: number;
};

/** Two-team head-to-head display used in upcoming-match cards + tournament bracket nodes. */
export function VsBlock({ teamA, teamB, status, crestSize = 48 }: VsBlockProps) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
      <Side team={teamA} align="end" crestSize={crestSize} />
      <div className="text-center">
        {status && <div className="mb-1.5">{status}</div>}
        <div className="font-mono font-medium text-[11px] text-[var(--t-4)] tracking-[0.3em]">
          VS
        </div>
      </div>
      <Side team={teamB} align="start" crestSize={crestSize} />
    </div>
  );
}

function Side({
  team,
  align,
  crestSize,
}: {
  team: VsTeam;
  align: 'start' | 'end';
  crestSize: number;
}) {
  const flexDir = align === 'end' ? 'flex-row-reverse' : 'flex-row';
  const textAlign = align === 'end' ? 'text-end' : 'text-start';
  return (
    <div
      className={`flex items-center gap-3 ${flexDir} ${align === 'end' ? 'justify-end' : 'justify-start'}`}
    >
      <TeamCrest tag={team.tag} color={team.accentColor} size={crestSize} />
      <div className={textAlign}>
        <div className="font-display font-medium text-[16px] tracking-[-0.02em] text-white">
          {team.name}
        </div>
        <div className="font-mono font-medium text-[10px] text-[var(--t-4)] tracking-[0.18em] mt-0.5">
          {team.country}
        </div>
      </div>
    </div>
  );
}
