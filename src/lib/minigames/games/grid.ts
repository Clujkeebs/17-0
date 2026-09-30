import { createRng } from '@/lib/game/prng';
import { POSITION_NAMES, POSITION_GROUPS } from '@/lib/game/attributes';
import { card } from '../data';
import type { GPlayer, GTeam, GameData, MiniGame } from '../types';

export interface Crit { id: string; label: string }
interface Puzzle { seed: string; teams: GTeam[]; crits: Crit[]; cells: string[][] /* valid player ids per cell, row-major */; byId: Record<string, GPlayer> }
type Answer = (string | null)[];

const MIN = 2;

function critTest(id: string): (p: GPlayer) => boolean {
  const [k, v] = id.split(':');
  switch (k) {
    case 'pos': return (p) => p.group === v;
    case 'col': return (p) => p.college === v;
    case 'spd': return (p) => (p.attrs.speed ?? 0) >= 90;
    case 'age': return (p) => p.age != null && p.age <= 25;
    case 'ovr': return (p) => p.ovr >= 85;
    case 'rook': return (p) => p.yearsPro === 0;
    case 'tall': return (p) => (p.heightInches ?? 0) >= 76;
    default: return () => false;
  }
}

function candidates(data: GameData, simple: boolean): Crit[] {
  const pos: Crit[] = POSITION_GROUPS.filter((g) => g !== 'K').map((g) => ({ id: `pos:${g}`, label: POSITION_NAMES[g] }));
  if (simple) return pos;
  const counts = new Map<string, number>();
  for (const p of data.players) if (p.college) counts.set(p.college, (counts.get(p.college) ?? 0) + 1);
  const colleges = [...counts].filter(([, n]) => n >= 12).sort((a, b) => b[1] - a[1]).slice(0, 12)
    .map(([c]) => ({ id: `col:${c}`, label: `College: ${c}` }));
  return [
    ...pos, ...colleges,
    { id: 'spd', label: 'Speed 90+' }, { id: 'age', label: 'Age 25 or under' }, { id: 'ovr', label: 'Overall 85+' },
    { id: 'rook', label: 'Rookie (0 years pro)' }, { id: 'tall', label: '6\'4" or taller' },
  ];
}

function build(teams: GTeam[], crits: Crit[], data: GameData): string[][] {
  const out: string[][] = [];
  for (const t of teams) for (const c of crits) {
    const test = critTest(c.id);
    out.push(data.players.filter((p) => p.teamId === t.id && test(p)).map((p) => p.id));
  }
  return out;
}

/** Points for a correct cell: scarcer cells pay more, deeper cuts pay a little extra. */
export function cellPoints(validCount: number, ovr: number): number {
  return Math.round(100 / Math.sqrt(Math.max(1, validCount))) + Math.max(0, Math.min(15, Math.round((85 - ovr) / 2)));
}

export const grid: MiniGame<Puzzle, Answer> = {
  slug: 'grid',
  name: 'The Grid',
  tagline: 'Three teams, three filters, nine squares. Find a player for each.',
  howTo: [
    'Each square needs a current player on that row\'s team who also fits the column.',
    'Nine guesses total. A miss still burns a guess. Each player can be used once.',
    'Rarer squares pay more. The reveal shows every other answer you could have used.',
  ],
  generate(seed, data) {
    const rng = createRng(seed);
    const teamsWithPlayers = data.teams.filter((t) => data.players.some((p) => p.teamId === t.id));
    let best: { teams: GTeam[]; crits: Crit[]; cells: string[][]; worst: number } | null = null;
    for (let attempt = 0; attempt < 400; attempt++) {
      const simple = attempt >= 250;
      const pool = candidates(data, simple);
      if (teamsWithPlayers.length < 3 || pool.length < 3) break;
      const teams = rng.shuffle(teamsWithPlayers).slice(0, 3);
      // At most one college column; keep variety.
      const crits: Crit[] = [];
      for (const c of rng.shuffle(pool)) {
        if (crits.length === 3) break;
        if (c.id.startsWith('col:') && crits.some((x) => x.id.startsWith('col:'))) continue;
        if (c.id.startsWith('pos:') && crits.filter((x) => x.id.startsWith('pos:')).length >= 2) continue;
        crits.push(c);
      }
      if (crits.length < 3) continue;
      const cells = build(teams, crits, data);
      const worst = Math.min(...cells.map((c) => c.length));
      if (!best || worst > best.worst) best = { teams, crits, cells, worst };
      if (worst >= MIN) break;
    }
    if (!best) throw new Error('Not enough players to build a grid.');
    const byId: Record<string, GPlayer> = {};
    for (const c of best.cells) for (const id of c) byId[id] = data.players.find((p) => p.id === id)!;
    return { seed, teams: best.teams, crits: best.crits, cells: best.cells, byId };
  },
  publicView: (p) => ({
    seed: p.seed,
    teams: p.teams.map((t) => ({ id: t.id, abbr: t.abbr, name: `${t.city} ${t.name}`, color: t.color, logoUrl: t.logoUrl })),
    crits: p.crits.map((c) => c.label),
  }),
  check(p, guess) {
    const g = guess as { cell?: unknown; playerId?: unknown };
    const cell = Number(g?.cell);
    if (!Number.isInteger(cell) || cell < 0 || cell > 8 || typeof g.playerId !== 'string') throw new Error('Pick a square and a player.');
    const ok = p.cells[cell].includes(g.playerId);
    return { ok, cell, player: ok ? card(p.byId[g.playerId]) : null };
  },
  maxChecks: 9,
  // Ranked: nine checks total; each square takes the last player you checked there.
  applyChecks(_answer, checks) {
    const out: (string | null)[] = new Array(9).fill(null);
    for (const c of checks as { cell: number; playerId: string }[]) out[c.cell] = c.playerId;
    return out;
  },
  score(p, answer) {
    if (!Array.isArray(answer) || answer.length !== 9) throw new Error('Submit all nine squares.');
    const used = new Set<string>();
    const detail = p.cells.map((valid, i) => {
      const pick = answer[i];
      if (pick != null && typeof pick !== 'string') throw new Error('Bad square answer.');
      const ok = !!pick && valid.includes(pick) && !used.has(pick);
      if (pick) used.add(pick);
      const pl = ok ? p.byId[pick!] : null;
      const pts = pl ? cellPoints(valid.length, pl.ovr) : 0;
      const rarity = Math.round(100 / valid.length);
      return {
        team: p.teams[Math.floor(i / 3)].abbr, crit: p.crits[i % 3].label, ok, pts, rarity, validCount: valid.length,
        pick: pl ? pl.name : null,
        others: valid.filter((id) => id !== pick).map((id) => p.byId[id]).sort((a, b) => b.ovr - a.ovr).slice(0, 12).map((x) => x.name),
      };
    });
    const right = detail.filter((d) => d.ok).length;
    const pts = detail.reduce((s, d) => s + d.pts, 0);
    return { score: right * 1000 + pts, summary: `${right}/9 · ${pts} pts`, detail, perfect: right === 9 };
  },
};
