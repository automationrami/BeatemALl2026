/**
 * Single-elimination bracket maths (TM-3 US-TM3.1, TM-4 US-TM4.3). Pure functions, no I/O.
 *
 * The shapes mirror `BracketData` in `@beat-em-all/db` `schema/brackets.ts` (structurally
 * identical, so a value built here can be stored in `brackets.bracket_data` as is):
 *   rounds[r][m] = pairing m of round r (0-based); slots[0] is home, slots[1] away.
 *
 * Seeding follows the standard layout (1 v N, 2 v N-1, … arranged so seeds 1 and 2 can only
 * meet in the final). Fields that aren't a power of two are padded with byes, which land on
 * the top seeds and advance automatically.
 */

export type BracketSlotData = { teamId: string | null; seed: number | null; bye?: boolean };
export type BracketPairingData = {
  slots: [BracketSlotData, BracketSlotData];
  matchId: string | null;
  winnerTeamId: string | null;
};
export type BracketTree = { rounds: BracketPairingData[][] };

export type SeededTeam = { teamId: string; seed: number };

export type RoundLabelKey = 'final' | 'semifinal' | 'quarterfinal' | 'roundOf16' | 'round';

export class BracketError extends Error {
  constructor(
    public code: 'too_few_teams' | 'duplicate_team' | 'no_pairing' | 'not_in_pairing' | 'locked',
    message: string,
  ) {
    super(message);
    this.name = 'BracketError';
  }
}

/**
 * Assign seeds 1..n. `order` keeps the given order (check-in / registration order);
 * `random` shuffles with the supplied generator (Fisher–Yates).
 */
export function seedTeams(
  teamIds: readonly string[],
  strategy: 'order' | 'random' = 'order',
  random: () => number = Math.random,
): SeededTeam[] {
  const ids = [...teamIds];
  if (new Set(ids).size !== ids.length) {
    throw new BracketError('duplicate_team', 'A team can only be seeded once.');
  }
  if (strategy === 'random') {
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const tmp = ids[i] as string;
      ids[i] = ids[j] as string;
      ids[j] = tmp;
    }
  }
  return ids.map((teamId, i) => ({ teamId, seed: i + 1 }));
}

/** Smallest power of two ≥ n (n ≥ 1). */
export function bracketSize(n: number): number {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

/** Seed number at each round-1 position for a bracket of `size` (a power of two). */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const next = order.length * 2 + 1;
    order = order.flatMap((s) => [s, next - s]);
  }
  return order;
}

function emptySlot(): BracketSlotData {
  return { teamId: null, seed: null };
}

function clone(data: BracketTree): BracketTree {
  return {
    rounds: data.rounds.map((round) =>
      round.map((p) => ({
        slots: [{ ...p.slots[0] }, { ...p.slots[1] }] as [BracketSlotData, BracketSlotData],
        matchId: p.matchId,
        winnerTeamId: p.winnerTeamId,
      })),
    ),
  };
}

/** Put `slot` into the next round's pairing fed by (round, index). */
function feedNext(data: BracketTree, round: number, index: number, slot: BracketSlotData) {
  const next = data.rounds[round + 1]?.[Math.floor(index / 2)];
  if (!next) return;
  next.slots[index % 2] = { teamId: slot.teamId, seed: slot.seed };
}

/**
 * Build the whole tree from team ids in seed order (index 0 = seed 1). Byes auto-advance
 * their opponent into round 2.
 */
export function buildSingleElimination(seededTeamIds: readonly string[]): BracketTree {
  const n = seededTeamIds.length;
  if (n < 2) throw new BracketError('too_few_teams', 'A bracket needs at least two teams.');
  if (new Set(seededTeamIds).size !== n) {
    throw new BracketError('duplicate_team', 'A team can only be seeded once.');
  }
  const size = bracketSize(n);
  const totalRounds = Math.log2(size);
  const order = seedOrder(size);

  const slotFor = (seed: number): BracketSlotData =>
    seed <= n
      ? { teamId: seededTeamIds[seed - 1] as string, seed }
      : { teamId: null, seed: null, bye: true };

  const rounds: BracketPairingData[][] = [];
  const first: BracketPairingData[] = [];
  for (let i = 0; i < size; i += 2) {
    first.push({
      slots: [slotFor(order[i] as number), slotFor(order[i + 1] as number)],
      matchId: null,
      winnerTeamId: null,
    });
  }
  rounds.push(first);
  for (let r = 1; r < totalRounds; r++) {
    const count = size / 2 ** (r + 1);
    rounds.push(
      Array.from({ length: count }, () => ({
        slots: [emptySlot(), emptySlot()] as [BracketSlotData, BracketSlotData],
        matchId: null,
        winnerTeamId: null,
      })),
    );
  }

  const data: BracketTree = { rounds };
  first.forEach((p, i) => {
    const [a, b] = p.slots;
    const byeWinner = a.bye && b.teamId ? b : b.bye && a.teamId ? a : null;
    if (byeWinner) {
      p.winnerTeamId = byeWinner.teamId;
      feedNext(data, 0, i, byeWinner);
    }
  });
  return data;
}

/** True once the pairing after (round, index) has a result (so this one can't change). */
export function isPairingLocked(data: BracketTree, round: number, index: number): boolean {
  const next = data.rounds[round + 1]?.[Math.floor(index / 2)];
  return !!next?.winnerTeamId;
}

/**
 * Record `winnerTeamId` for pairing (round, index) and move them into the next round.
 * Re-recording a different winner is allowed until the next pairing has a result.
 * Returns a new tree; the input is not mutated.
 */
export function advanceWinner(
  data: BracketTree,
  round: number,
  index: number,
  winnerTeamId: string,
): BracketTree {
  const out = clone(data);
  const pairing = out.rounds[round]?.[index];
  if (!pairing) throw new BracketError('no_pairing', `No pairing at round ${round}, #${index}.`);
  const slot = pairing.slots.find((s) => s.teamId === winnerTeamId);
  if (!slot) throw new BracketError('not_in_pairing', 'The winner must be one of the two teams.');
  if (
    pairing.winnerTeamId &&
    pairing.winnerTeamId !== winnerTeamId &&
    isPairingLocked(out, round, index)
  ) {
    throw new BracketError('locked', 'The next match has already been played.');
  }
  pairing.winnerTeamId = winnerTeamId;
  feedNext(out, round, index, slot);
  return out;
}

/** Translation key for a round: 'final', 'semifinal', 'quarterfinal', 'roundOf16', else 'round'. */
export function roundLabel(roundIndex: number, totalRounds: number): RoundLabelKey {
  const fromEnd = totalRounds - roundIndex;
  if (fromEnd === 1) return 'final';
  if (fromEnd === 2) return 'semifinal';
  if (fromEnd === 3) return 'quarterfinal';
  if (fromEnd === 4) return 'roundOf16';
  return 'round';
}

/** The team that lost a decided pairing (null for byes and undecided pairings). */
export function pairingLoser(p: BracketPairingData): string | null {
  if (!p.winnerTeamId) return null;
  const other = p.slots.find((s) => s.teamId && s.teamId !== p.winnerTeamId);
  return other?.teamId ?? null;
}

/** The final pairing, or null for an empty tree. */
export function finalPairing(data: BracketTree): BracketPairingData | null {
  const last = data.rounds[data.rounds.length - 1];
  return last?.[0] ?? null;
}

export function isFinalDecided(data: BracketTree): boolean {
  return !!finalPairing(data)?.winnerTeamId;
}

/** Pairings with both teams known and no result yet — the matches to play now. */
export function playablePairings(
  data: BracketTree,
): { round: number; index: number; pairing: BracketPairingData }[] {
  const out: { round: number; index: number; pairing: BracketPairingData }[] = [];
  data.rounds.forEach((r, round) =>
    r.forEach((pairing, index) => {
      if (pairing.slots[0].teamId && pairing.slots[1].teamId && !pairing.winnerTeamId) {
        out.push({ round, index, pairing });
      }
    }),
  );
  return out;
}

export type BracketStandings = {
  first: string | null;
  second: string | null;
  /** Losing semi-finalists (shared 3rd–4th); empty for a two-team bracket. */
  thirdFourth: string[];
};

/** Final placings once the final is decided (1st, 2nd, shared 3rd–4th). */
export function standings(data: BracketTree): BracketStandings {
  const fin = finalPairing(data);
  if (!fin?.winnerTeamId) return { first: null, second: null, thirdFourth: [] };
  const semis = data.rounds.length >= 2 ? (data.rounds[data.rounds.length - 2] ?? []) : [];
  return {
    first: fin.winnerTeamId,
    second: pairingLoser(fin),
    thirdFourth: semis.map(pairingLoser).filter((id): id is string => !!id),
  };
}
