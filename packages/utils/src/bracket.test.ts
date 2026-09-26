import { describe, expect, it } from 'vitest';
import {
  BracketError,
  advanceWinner,
  bracketSize,
  buildSingleElimination,
  isFinalDecided,
  isPairingLocked,
  playablePairings,
  roundLabel,
  seedOrder,
  seedTeams,
  standings,
} from './bracket';

const teams = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);

describe('seedTeams', () => {
  it('keeps the given order by default', () => {
    expect(seedTeams(['a', 'b', 'c'])).toEqual([
      { teamId: 'a', seed: 1 },
      { teamId: 'b', seed: 2 },
      { teamId: 'c', seed: 3 },
    ]);
  });

  it('shuffles with the supplied generator and keeps every team once', () => {
    const out = seedTeams(teams(6), 'random', () => 0);
    expect(out.map((s) => s.seed)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(new Set(out.map((s) => s.teamId)).size).toBe(6);
    expect(out.map((s) => s.teamId)).not.toEqual(teams(6));
  });

  it('rejects duplicates', () => {
    expect(() => seedTeams(['a', 'a'])).toThrow(BracketError);
  });
});

describe('seedOrder / bracketSize', () => {
  it('pads to the next power of two', () => {
    expect(bracketSize(2)).toBe(2);
    expect(bracketSize(3)).toBe(4);
    expect(bracketSize(5)).toBe(8);
    expect(bracketSize(128)).toBe(128);
  });

  it('keeps seeds 1 and 2 on opposite halves', () => {
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });
});

describe('buildSingleElimination', () => {
  it('two teams: a single final, nothing auto-advanced', () => {
    const b = buildSingleElimination(teams(2));
    expect(b.rounds).toHaveLength(1);
    expect(b.rounds[0]![0]!.slots.map((s) => s.teamId)).toEqual(['t1', 't2']);
    expect(b.rounds[0]![0]!.winnerTeamId).toBeNull();
    expect(playablePairings(b)).toHaveLength(1);
  });

  it('three teams: seed 1 gets the bye and waits in the final', () => {
    const b = buildSingleElimination(teams(3));
    expect(b.rounds).toHaveLength(2);
    const [bye, match] = b.rounds[0]!;
    expect(bye!.slots[1]!.bye).toBe(true);
    expect(bye!.winnerTeamId).toBe('t1');
    expect(match!.slots.map((s) => s.teamId)).toEqual(['t2', 't3']);
    expect(b.rounds[1]![0]!.slots[0]!.teamId).toBe('t1');
    expect(b.rounds[1]![0]!.slots[1]!.teamId).toBeNull();
    expect(playablePairings(b).map((p) => [p.round, p.index])).toEqual([[0, 1]]);
  });

  it('five teams: three byes, 4 v 5 plays, 2 v 3 is ready in round 2', () => {
    const b = buildSingleElimination(teams(5));
    expect(b.rounds.map((r) => r.length)).toEqual([4, 2, 1]);
    const byes = b.rounds[0]!.filter((p) => p.slots.some((s) => s.bye));
    expect(byes.map((p) => p.winnerTeamId).sort()).toEqual(['t1', 't2', 't3']);
    expect(b.rounds[0]![1]!.slots.map((s) => s.teamId)).toEqual(['t4', 't5']);
    expect(b.rounds[1]![0]!.slots.map((s) => s.teamId)).toEqual(['t1', null]);
    expect(b.rounds[1]![1]!.slots.map((s) => s.teamId)).toEqual(['t2', 't3']);
    expect(playablePairings(b).map((p) => [p.round, p.index])).toEqual([
      [0, 1],
      [1, 1],
    ]);
  });

  it('six teams: seeds 1 and 2 get byes', () => {
    const b = buildSingleElimination(teams(6));
    const byeWinners = b.rounds[0]!.filter((p) => p.slots.some((s) => s.bye)).map(
      (p) => p.winnerTeamId,
    );
    expect(byeWinners.sort()).toEqual(['t1', 't2']);
    expect(playablePairings(b)).toHaveLength(2);
    expect(b.rounds[0]!.every((p) => !(p.slots[0].bye && p.slots[1].bye))).toBe(true);
  });

  it('rejects fewer than two teams', () => {
    expect(() => buildSingleElimination(['solo'])).toThrow(BracketError);
  });
});

describe('advanceWinner', () => {
  it('advances through to the final and decides it', () => {
    let b = buildSingleElimination(teams(4));
    b = advanceWinner(b, 0, 0, 't1');
    b = advanceWinner(b, 0, 1, 't3');
    expect(b.rounds[1]![0]!.slots.map((s) => s.teamId)).toEqual(['t1', 't3']);
    expect(b.rounds[1]![0]!.slots[1]!.seed).toBe(3);
    expect(isFinalDecided(b)).toBe(false);
    b = advanceWinner(b, 1, 0, 't3');
    expect(isFinalDecided(b)).toBe(true);
  });

  it('does not mutate the input', () => {
    const b = buildSingleElimination(teams(4));
    advanceWinner(b, 0, 0, 't1');
    expect(b.rounds[0]![0]!.winnerTeamId).toBeNull();
  });

  it('allows a correction until the next match is decided', () => {
    let b = buildSingleElimination(teams(4));
    b = advanceWinner(b, 0, 0, 't1');
    b = advanceWinner(b, 0, 0, 't4');
    expect(b.rounds[1]![0]!.slots[0]!.teamId).toBe('t4');
    b = advanceWinner(b, 0, 1, 't2');
    b = advanceWinner(b, 1, 0, 't4');
    expect(isPairingLocked(b, 0, 0)).toBe(true);
    expect(() => advanceWinner(b, 0, 0, 't1')).toThrow(BracketError);
  });

  it('rejects a winner who is not in the pairing', () => {
    const b = buildSingleElimination(teams(4));
    expect(() => advanceWinner(b, 0, 0, 't2')).toThrow(BracketError);
  });
});

describe('roundLabel', () => {
  it('names the last rounds', () => {
    expect(roundLabel(0, 1)).toBe('final');
    expect(roundLabel(2, 3)).toBe('final');
    expect(roundLabel(1, 3)).toBe('semifinal');
    expect(roundLabel(0, 3)).toBe('quarterfinal');
    expect(roundLabel(0, 4)).toBe('roundOf16');
    expect(roundLabel(0, 6)).toBe('round');
  });
});

describe('standings', () => {
  it('is empty until the final is played', () => {
    expect(standings(buildSingleElimination(teams(4)))).toEqual({
      first: null,
      second: null,
      thirdFourth: [],
    });
  });

  it('ranks champion, runner-up and both losing semi-finalists', () => {
    let b = buildSingleElimination(teams(4));
    b = advanceWinner(b, 0, 0, 't1');
    b = advanceWinner(b, 0, 1, 't2');
    b = advanceWinner(b, 1, 0, 't2');
    expect(standings(b)).toEqual({ first: 't2', second: 't1', thirdFourth: ['t4', 't3'] });
  });

  it('three teams: only one losing semi-finalist (the other semi was a bye)', () => {
    let b = buildSingleElimination(teams(3));
    b = advanceWinner(b, 0, 1, 't3');
    b = advanceWinner(b, 1, 0, 't1');
    expect(standings(b)).toEqual({ first: 't1', second: 't3', thirdFourth: ['t2'] });
  });

  it('two teams: no third place', () => {
    const b = advanceWinner(buildSingleElimination(teams(2)), 0, 0, 't2');
    expect(standings(b)).toEqual({ first: 't2', second: 't1', thirdFourth: [] });
  });
});
