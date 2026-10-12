import { createRng, type Rng } from '@/lib/game/prng';
import { F_POS, snakePicks, type FPos } from './rank';

/**
 * Mock draft: a snake draft against computer teams that draft the way people do, from the same ranks the rest of the
 * fantasy hub uses. Each bot takes from the best few players left, nudged by what its roster still needs and by a little
 * randomness, so every draft is different and the board does not fall in a straight line. Each pick has its own random
 * stream (seed and pick number), so a draft plays out the same whether it is stepped through or run at once.
 */
export interface MPlayer { id: string; name: string; pos: FPos; team: string; value: number; vor: number; overall: number }
export interface MockSetup { teams: number; slot: number; seed: string }
export interface MockPick { pick: number; round: number; team: number; playerId: string }
export interface MockState { setup: MockSetup; picks: MockPick[]; rosters: string[][]; rounds: number }

export const MOCK_ROUNDS = 14;
/** Starting lineup: one QB, two RB, two WR, one TE and a flex (RB, WR or TE). */
export const STARTERS: Record<FPos, number> = { QB: 1, RB: 2, WR: 2, TE: 1 };
/** Roster limits by position, so a bot never loads up on four quarterbacks. */
export const MAX: Record<FPos, number> = { QB: 3, RB: 7, WR: 7, TE: 3 };

export const teamForPick = (pick: number, teams: number) => { const r = Math.floor((pick - 1) / teams), i = (pick - 1) % teams; return r % 2 === 0 ? i + 1 : teams - i; };

export function newDraft(setup: MockSetup, rounds = MOCK_ROUNDS): MockState {
  return { setup, picks: [], rosters: Array.from({ length: setup.teams }, () => []), rounds };
}
export const totalPicks = (s: MockState) => s.setup.teams * s.rounds;
export const nextPick = (s: MockState) => s.picks.length + 1;
export const done = (s: MockState) => s.picks.length >= totalPicks(s);
export const onTheClock = (s: MockState) => (done(s) ? null : teamForPick(nextPick(s), s.setup.teams));
/** Picks until the user is next on the clock (0 when it is his turn now), or null when the draft is over. */
export function picksUntilYou(s: MockState): number | null {
  for (let k = nextPick(s); k <= totalPicks(s); k++) if (teamForPick(k, s.setup.teams) === s.setup.slot) return k - nextPick(s);
  return null;
}

/** How much a roster wants this position right now, in points of value over replacement. */
function need(roster: MPlayer[], pos: FPos, round: number): number {
  const have = roster.filter((p) => p.pos === pos).length;
  if (have >= MAX[pos]) return -99;
  const open = STARTERS[pos] - have;
  // Early rounds the best player wins; later a bot with an empty starting spot fills it, quarterbacks and tight ends last.
  const late = Math.max(0, round - 6) / 8;
  if ((pos === 'QB' || pos === 'TE') && round <= 4 && have === 0) return -1.5;     // nobody takes a QB or TE before round 5 unless he is a star
  return open > 0 ? (pos === 'QB' || pos === 'TE' ? 1.2 + 4 * late : 0.6 + 3 * late) : -0.5 * have;
}

const roundOf = (s: MockState) => Math.ceil(nextPick(s) / s.setup.teams);
const byId = (players: MPlayer[]) => new Map(players.map((p) => [p.id, p]));
const rosterOf = (s: MockState, team: number, map: Map<string, MPlayer>) => s.rosters[team - 1].map((id) => map.get(id)).filter((p): p is MPlayer => !!p);
const availableTo = (s: MockState, players: MPlayer[]) => { const taken = new Set(s.picks.map((x) => x.playerId)); return players.filter((p) => !taken.has(p.id)); };

/** Starting spots a roster still has to fill (one entry per spot), not counting the flex. */
function unfilled(roster: Pick<MPlayer, 'pos'>[]): FPos[] {
  return F_POS.flatMap((pos) => Array.from({ length: Math.max(0, STARTERS[pos] - roster.filter((x) => x.pos === pos).length) }, () => pos));
}

/**
 * Who a team is choosing between: the best dozen or so on the board, plus the best player left at every position so a
 * needed spot can always be filled. With as many picks left as empty starting spots, only those positions are allowed.
 */
function candidatesFor<T extends MPlayer>(available: T[], roster: MPlayer[], round: number, rounds: number): T[] {
  const open = (p: MPlayer) => roster.filter((x) => x.pos === p.pos).length < MAX[p.pos];
  const top = available.filter(open).slice(0, 14);
  for (const pos of F_POS) { const best = available.find((p) => p.pos === pos && open(p)); if (best && !top.includes(best)) top.push(best); }
  const must = unfilled(roster);
  if (must.length >= rounds - round + 1) { const forced = top.filter((p) => must.includes(p.pos)); if (forced.length) return forced; }
  return top;
}

/** A bot's choice from what is left: the best few by value plus need, with some randomness. */
export function botPick<T extends MPlayer>(rng: Rng, available: T[], roster: MPlayer[], round: number, rounds = MOCK_ROUNDS): T {
  const scored = candidatesFor(available, roster, round, rounds).map((p) => ({ p, s: p.vor + need(roster, p.pos, round) + (rng.next() - 0.5) * 3.2 }));
  scored.sort((a, b) => b.s - a.s);
  return scored[0]?.p ?? available[0];
}

/** The best pick for a roster with no randomness, and why: a hole in the lineup to fill, or simply the best player left. */
export function recommend<T extends MPlayer>(available: T[], roster: MPlayer[], round: number, rounds = MOCK_ROUNDS): { player: T; reason: string } | null {
  const cands = candidatesFor(available, roster, round, rounds);
  const best = cands.map((p) => ({ p, s: p.vor + need(roster, p.pos, round) })).sort((a, b) => b.s - a.s)[0]?.p;
  if (!best) return null;
  const have = roster.filter((x) => x.pos === best.pos).length;
  const reason = have < STARTERS[best.pos] ? `Fills your ${have === 0 ? 'first' : 'next'} ${best.pos} spot.`
    : best.overall <= available[0].overall ? 'Best player on the board.' : `Best value left at ${best.pos}.`;
  return { player: best, reason };
}

/** Records one pick (a bot's or the user's). Returns the new state, or the same one if the pick is not allowed. */
export function draftPlayer(s: MockState, playerId: string): MockState {
  if (done(s) || s.picks.some((x) => x.playerId === playerId)) return s;
  const pick = nextPick(s), team = teamForPick(pick, s.setup.teams);
  const rosters = s.rosters.map((r, i) => (i === team - 1 ? [...r, playerId] : r));
  return { ...s, picks: [...s.picks, { pick, round: Math.ceil(pick / s.setup.teams), team, playerId }], rosters };
}

/** One computer pick for whoever is on the clock (the user's own team too, for auto-pick). */
export function botStep(s: MockState, players: MPlayer[]): MockState {
  const team = onTheClock(s);
  const available = availableTo(s, players);
  if (team == null || !available.length) return s;
  const rng = createRng(`${s.setup.seed}:${nextPick(s)}`);
  return draftPlayer(s, botPick(rng, available, rosterOf(s, team, byId(players)), roundOf(s), s.rounds).id);
}

/** The recommended pick for whoever is on the clock, with no randomness: what auto-pick takes for the user. */
export function autoPick(s: MockState, players: MPlayer[]): MockState {
  const team = onTheClock(s);
  if (team == null) return s;
  const rec = recommend(availableTo(s, players), rosterOf(s, team, byId(players)), roundOf(s), s.rounds);
  return rec ? draftPlayer(s, rec.player.id) : s;
}

/** Finishes the draft: the computer teams draft as usual and the user's slot takes the recommended player each time. */
export function finishDraft(s: MockState, players: MPlayer[]): MockState {
  let state = s;
  while (!done(state)) {
    const next = onTheClock(state) === state.setup.slot ? autoPick(state, players) : botStep(state, players);
    if (next === state) break;
    state = next;
  }
  return state;
}

/** Plays out every computer pick until the user is on the clock or the draft ends. */
export function runBots(s: MockState, players: MPlayer[]): MockState {
  let state = s;
  while (!done(state) && onTheClock(state) !== state.setup.slot) {
    const next = botStep(state, players);
    if (next === state) break;
    state = next;
  }
  return state;
}

/** Points a game from the best lineup a roster can field: QB, 2 RB, 2 WR, TE and a flex. */
export function lineupValue<T extends Pick<MPlayer, 'pos' | 'value'>>(roster: T[]): { total: number; starters: T[] } {
  const sorted = [...roster].sort((a, b) => b.value - a.value);
  const starters: T[] = [];
  const left: T[] = [];
  const open: Record<FPos, number> = { ...STARTERS };
  for (const p of sorted) { if (open[p.pos] > 0) { starters.push(p); open[p.pos]--; } else left.push(p); }
  const flex = left.find((p) => p.pos !== 'QB');
  if (flex) starters.push(flex);
  return { total: Math.round(starters.reduce((s, p) => s + p.value, 0) * 10) / 10, starters };
}

export interface MockResult { standings: { team: number; total: number; rank: number }[]; yourRank: number; grade: string; yourTotal: number; best: number; average: number }

/** A+ for the best lineup, then by how much of the field you beat: A three quarters, B half, C a quarter, D anyone, F nobody. */
export function gradeFor(rank: number, teams: number): string {
  if (teams <= 1 || rank <= 1) return 'A+';
  const beat = (teams - rank) / (teams - 1);
  return beat >= 0.75 ? 'A' : beat >= 0.5 ? 'B' : beat >= 0.25 ? 'C' : beat > 0 ? 'D' : 'F';
}

/** Teams ranked by their best lineup's points a game (a tie shares a rank); the grade comes from where yours finished. */
export function resultOf(s: MockState, players: MPlayer[]): MockResult {
  const map = byId(players);
  const totals = s.rosters.map((_, i) => ({ team: i + 1, total: lineupValue(rosterOf(s, i + 1, map)).total }));
  const standings = [...totals].sort((a, b) => b.total - a.total || a.team - b.team).map((t) => ({ ...t, rank: 1 + totals.filter((o) => o.total > t.total).length }));
  const yours = standings.find((t) => t.team === s.setup.slot)!;
  const average = Math.round((totals.reduce((n, t) => n + t.total, 0) / totals.length) * 10) / 10;
  return { standings, yourRank: yours.rank, grade: gradeFor(yours.rank, s.setup.teams), yourTotal: yours.total, best: standings[0].total, average };
}

/** Your picks against where the rankings had each player: a positive gap is a player who went later than his rank (a steal). */
export function pickValues<T extends MPlayer>(s: MockState, players: T[]): { pick: number; round: number; player: T; gap: number }[] {
  const map = new Map(players.map((p) => [p.id, p]));
  return s.picks.filter((x) => x.team === s.setup.slot).flatMap((x) => {
    const player = map.get(x.playerId);
    return player ? [{ pick: x.pick, round: x.round, player, gap: x.pick - player.overall }] : [];
  });
}

/** The overall pick numbers one slot gets, for showing "your picks" on the board. */
export const yourPicks = (s: MockState) => snakePicks(s.setup.slot, s.setup.teams, s.rounds);
