import { createRng } from '@/lib/game/prng';
import type { MiniGame } from '../types';
import type { NbaGameData, NSeason } from '../nba/data';

/**
 * Build a Player for basketball, on real per-game lines. Five programs, one real season from each (a rotation player on
 * that team that year), and each season lends one skill: scoring, rebounding, playmaking, steals or blocks, each used once.
 * Every skill is scored against what a star puts up in that league's data (its 95th percentile), so 100 means a star at
 * everything. The reveal shows the best build the board allowed.
 */
export type BuildTrait = 'scoring' | 'rebounding' | 'playmaking' | 'steals' | 'blocks';
type Stat = 'ppg' | 'rpg' | 'apg' | 'spg' | 'bpg';
export const BUILD_TRAITS: { key: BuildTrait; label: string; hint: string; stat: Stat; unit: string }[] = [
  { key: 'scoring', label: 'Scoring', hint: 'Points per game', stat: 'ppg', unit: 'PPG' },
  { key: 'rebounding', label: 'Rebounding', hint: 'Rebounds per game', stat: 'rpg', unit: 'RPG' },
  { key: 'playmaking', label: 'Playmaking', hint: 'Assists per game', stat: 'apg', unit: 'APG' },
  { key: 'steals', label: 'Steals', hint: 'Steals per game', stat: 'spg', unit: 'SPG' },
  { key: 'blocks', label: 'Blocks', hint: 'Blocks per game', stat: 'bpg', unit: 'BPG' },
];
const ROUNDS = 5, OPTIONS = 6;
const r1 = (n: number) => Math.round(n * 10) / 10;

type Option = NSeason;
export interface BuildRound { team: { name: string; abbr: string; color: string; logo: string | null }; season: string; options: Option[] }
export interface BuildAnswer { pick: number; trait: BuildTrait }
type Bench = Record<Stat, number>;

const quantile = (xs: number[], q: number) => { const v = [...xs].sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.floor(q * v.length))] : 1; };
const benchCache = new WeakMap<NbaGameData, Bench>();
/** What a star puts up in each stat: better than 95 in 100 stored seasons. */
export function benchOf(data: NbaGameData): Bench {
  let b = benchCache.get(data);
  if (!b) {
    b = {} as Bench;
    for (const t of BUILD_TRAITS) b[t.stat] = Math.max(0.5, quantile(data.seasons.map((s) => s[t.stat]), 0.95));
    benchCache.set(data, b);
  }
  return b;
}
/** One skill taken from one season, as a share of star level. */
export const norm = (o: Option, trait: BuildTrait, bench: Bench) => { const t = BUILD_TRAITS.find((x) => x.key === trait)!; return o[t.stat] / bench[t.stat]; };

/** Every way to give the five skills to the five rounds, best total first found: the highest total a board allows. */
export function bestBuild(rounds: BuildRound[], bench: Bench): { total: number; picks: BuildAnswer[] } {
  const table = rounds.map((r) => BUILD_TRAITS.map((t) => { let best = 0, at = 0; r.options.forEach((o, k) => { const v = norm(o, t.key, bench); if (v > best) { best = v; at = k; } }); return { best, at }; }));
  let top = -1, topPerm: number[] = [];
  const perm = (used: number[], total: number) => {
    if (used.length === rounds.length) { if (total > top) { top = total; topPerm = [...used]; } return; }
    for (let t = 0; t < BUILD_TRAITS.length; t++) if (!used.includes(t)) perm([...used, t], total + table[used.length][t].best);
  };
  perm([], 0);
  return { total: top, picks: topPerm.map((t, i) => ({ pick: table[i][t].at, trait: BUILD_TRAITS[t].key })) };
}

const lineOf = (rounds: BuildRound[], answer: BuildAnswer[]) => {
  const out = {} as Record<Stat, number>, from = {} as Record<BuildTrait, string>;
  answer.forEach((a, i) => { const o = rounds[i].options[a.pick], t = BUILD_TRAITS.find((x) => x.key === a.trait)!; out[t.stat] = r1(o[t.stat]); from[a.trait] = `${o.name} (${o.seasonLabel}, ${o.teamName})`; });
  return { line: out, from };
};

export function hoopsBuildPlayer(meta: { slug: string; name: string; tagline: string; sport: 'cbb' | 'wcbb'; league: string }): MiniGame<{ rounds: BuildRound[]; bench: Bench }, BuildAnswer[], NbaGameData> {
  return {
    slug: meta.slug, sport: meta.sport, name: meta.name, tagline: meta.tagline,
    howTo: [
      `Each round shows one ${meta.league} program in one real season, with six of its rotation players.`,
      'Take one player from each program and give his season a skill: Scoring, Rebounding, Playmaking, Steals or Blocks. Use each skill once.',
      'Your player gets those numbers. Each is scored against a star\'s level, and 100 means a star at everything. The reveal shows the best build this board allowed.',
    ],
    generate(seed, data) {
      const rng = createRng(seed);
      const byTeam = new Map<number, Map<number, Option[]>>();
      for (const s of data.seasons) {
        const seasons = byTeam.get(s.teamId) ?? new Map<number, Option[]>();
        seasons.set(s.season, [...(seasons.get(s.season) ?? []), s]);
        byTeam.set(s.teamId, seasons);
      }
      const teams = rng.shuffle([...byTeam.keys()].filter((id) => [...byTeam.get(id)!.values()].some((l) => l.length >= OPTIONS)));
      if (teams.length < ROUNDS) throw new Error(`The ${meta.league} stats are still loading. Try again in a few minutes.`);
      const rounds: BuildRound[] = teams.slice(0, ROUNDS).map((id) => {
        const seasons = byTeam.get(id)!;
        const year = rng.pick([...seasons.keys()].filter((y) => seasons.get(y)!.length >= OPTIONS).sort((a, b) => a - b));
        const options = [...seasons.get(year)!].sort((a, b) => b.value - a.value || a.playerId - b.playerId).slice(0, OPTIONS);
        const t = options[0];
        return { team: { name: t.teamName, abbr: t.team, color: t.teamColor, logo: t.logoUrl }, season: t.seasonLabel, options: rng.shuffle(options) };
      });
      return { rounds, bench: benchOf(data) };
    },
    publicView: (p) => ({
      traits: BUILD_TRAITS.map(({ key, label, hint }) => ({ key, label, hint })),
      rounds: p.rounds.map((r) => ({
        team: r.team, season: r.season,
        options: r.options.map((o) => ({ id: o.key, name: o.name, position: o.position, img: o.img, team: o.team, teamColor: o.teamColor, logoUrl: o.logoUrl, ppg: r1(o.ppg), rpg: r1(o.rpg), apg: r1(o.apg), spg: r1(o.spg), bpg: r1(o.bpg) })),
      })),
    }),
    score(p, answer) {
      if (!Array.isArray(answer) || answer.length !== p.rounds.length) throw new Error('Make a pick from every program.');
      const traits = new Set(answer.map((a) => a?.trait));
      if (traits.size !== BUILD_TRAITS.length || !BUILD_TRAITS.every((t) => traits.has(t.key))) throw new Error('Use each skill once.');
      answer.forEach((a, i) => { if (!Number.isInteger(a.pick) || a.pick < 0 || a.pick >= p.rounds[i].options.length) throw new Error('Pick a player from every program.'); });
      const bench = p.bench;
      const total = answer.reduce((s, a, i) => s + norm(p.rounds[i].options[a.pick], a.trait, bench), 0);
      const best = bestBuild(p.rounds, bench);
      const score = Math.round((total / ROUNDS) * 100), bestScore = Math.round((best.total / ROUNDS) * 100);
      const mine = lineOf(p.rounds, answer), top = lineOf(p.rounds, best.picks);
      return { score, summary: `Build ${score}`, detail: { score, line: mine.line, from: mine.from, best: { score: bestScore, line: top.line, from: top.from } }, perfect: score >= bestScore };
    },
  };
}
