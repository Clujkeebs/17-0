import { createRng, type Rng } from '@/lib/game/prng';
import type { MiniGame } from '../types';
import { starIds } from '../prominent';
import { bcard, type BSeason, type MlbGameData } from './card';

/**
 * Baseball mini games on MLB Stats API seasons since 1970. Same screens as the basketball ones (Higher or Lower,
 * "tap one card"), and only players fans would know: the best few hundred by their best season.
 */

const STARS = 300;
function tries<T>(n: number, make: () => T | null): T[] {
  const out: T[] = [];
  for (let i = 0; out.length < n && i < n * 400; i++) { const x = make(); if (x) out.push(x); }
  if (out.length < n) throw new Error('Baseball data is still loading. Try again in a few minutes.');
  return out;
}
const distinctBy = <T>(xs: T[], key: (x: T) => string | number) => xs.filter((x, i) => xs.findIndex((y) => key(y) === key(x)) === i);
function deal<T>(rng: Rng, answer: T, decoys: T[]): { list: T[]; correct: number } {
  const list = rng.shuffle([answer, ...decoys]);
  return { list, correct: list.indexOf(answer) };
}
/** Seasons by well-known players only, in their good years. */
export function knownSeasons(data: MlbGameData, minValue = 70): BSeason[] {
  const stars = starIds(data.seasons, (s) => s.playerId, (s) => s.value, STARS);
  return data.seasons.filter((s) => stars.has(s.playerId) && s.value >= minValue);
}

const fmt3 = (n: number) => n.toFixed(3).replace(/^0/, '');
/** "2001: .328, 49 HR, 141 RBI, 1.106 OPS" or "18-6, 2.98 ERA, 245 K". */
export function bLine(s: BSeason): string {
  if (s.bat) return `${fmt3(s.bat.avg)}, ${s.bat.hr} HR, ${s.bat.rbi} RBI, ${s.bat.sb} SB, ${fmt3(s.bat.ops)} OPS`;
  const p = s.pitch!;
  return s.kind === 'rp' ? `${p.sv} saves, ${p.era.toFixed(2)} ERA, ${p.so} K in ${p.g} games` : `${p.w} wins, ${p.era.toFixed(2)} ERA, ${p.so} K in ${Math.round(p.ip)} IP`;
}

/* ------------------------------------------------------------------ Higher or Lower */

type Stat = { key: string; label: string; kinds: BSeason['kind'][]; get: (s: BSeason) => number; show: (n: number) => string | number; min: number; near: (v: number) => number };
const STATS: Stat[] = [
  { key: 'hr', label: 'Home runs', kinds: ['bat'], get: (s) => s.bat!.hr, show: (n) => n, min: 15, near: (v) => Math.max(3, v * 0.15) },
  { key: 'rbi', label: 'RBI', kinds: ['bat'], get: (s) => s.bat!.rbi, show: (n) => n, min: 60, near: (v) => Math.max(6, v * 0.12) },
  { key: 'sb', label: 'Stolen bases', kinds: ['bat'], get: (s) => s.bat!.sb, show: (n) => n, min: 15, near: (v) => Math.max(4, v * 0.25) },
  { key: 'avg', label: 'Batting average', kinds: ['bat'], get: (s) => s.bat!.avg, show: fmt3, min: 0.26, near: () => 0.02 },
  { key: 'so', label: 'Strikeouts (pitching)', kinds: ['sp'], get: (s) => s.pitch!.so, show: (n) => n, min: 120, near: (v) => Math.max(15, v * 0.12) },
  { key: 'w', label: 'Wins', kinds: ['sp'], get: (s) => s.pitch!.w, show: (n) => n, min: 10, near: () => 3 },
  { key: 'sv', label: 'Saves', kinds: ['rp'], get: (s) => s.pitch!.sv, show: (n) => n, min: 20, near: (v) => Math.max(4, v * 0.15) },
];
type HLRound = { a: BSeason; b: BSeason; stat: string; label: string };
const statOf = (k: string) => STATS.find((s) => s.key === k)!;

export const mlbHigherLower: MiniGame<{ rounds: HLRound[] }, ('a' | 'b')[], MlbGameData> = {
  slug: 'mlb-higher-lower', sport: 'mlb',
  name: 'Higher or Lower: Baseball',
  tagline: 'Two real MLB seasons, one stat. Ten calls. Who had more?',
  howTo: ['Each round shows two well-known players, each in one season, and one stat: home runs, RBI, steals, average, strikeouts, wins or saves.', 'Tap the player with the higher number. Ties count either way.', 'Ten rounds. The reveal shows every number.'],
  generate(seed, data) {
    const rng = createRng(seed);
    const pool = knownSeasons(data, 72);
    const used = new Set<number>();
    return { rounds: tries(10, () => {
      const st = rng.pick(STATS);
      const a = rng.pick(pool);
      if (!st.kinds.includes(a.kind) || used.has(a.playerId)) return null;
      const av = st.get(a);
      if (av < st.min) return null;
      // Close calls from roughly the same era make it a game.
      const near = pool.filter((b) => st.kinds.includes(b.kind) && b.playerId !== a.playerId && !used.has(b.playerId) && Math.abs(b.season - a.season) <= 10 && st.show(st.get(b)) !== st.show(av) && Math.abs(st.get(b) - av) <= st.near(av));
      if (!near.length) return null;
      const b = rng.pick(near); used.add(a.playerId); used.add(b.playerId);
      return { a, b, stat: st.key, label: st.label };
    }) };
  },
  publicView: (p) => ({ rounds: p.rounds.map((r) => ({ a: bcard(r.a), b: bcard(r.b), label: r.label })) }),
  score(p, answer) {
    if (!Array.isArray(answer) || answer.length !== p.rounds.length) throw new Error('Answer every round.');
    const detail = p.rounds.map((r, i) => {
      const st = statOf(r.stat), an = st.get(r.a), bn = st.get(r.b);
      const ok = st.show(an) === st.show(bn) || (answer[i] === 'a' ? an > bn : bn > an);
      return { a: `${r.a.name} (${r.a.season})`, b: `${r.b.name} (${r.b.season})`, aImg: r.a.img, bImg: r.b.img, aTeam: r.a.team, bTeam: r.b.team, aColor: r.a.teamColor, bColor: r.b.teamColor, aLogo: r.a.logoUrl, bLogo: r.b.logoUrl, label: r.label, av: st.show(an), bv: st.show(bn), pick: answer[i], ok };
    });
    const right = detail.filter((d) => d.ok).length;
    return { score: right, summary: `${right}/${p.rounds.length}`, detail, perfect: right === p.rounds.length };
  },
};

/* ------------------------------------------------------------------ "tap one card" rounds */

type Card = Omit<ReturnType<typeof bcard>, 'img'> & { img: string | null };
type PickRound = { prompt: string; options: Card[]; notes: string[]; correct: number };
function pickGame(meta: { slug: string; name: string; tagline: string; howTo: string[] }, build: (rng: Rng, data: MlbGameData, pool: BSeason[]) => PickRound | null, rounds = 6): MiniGame<{ rounds: PickRound[] }, number[], MlbGameData> {
  return {
    ...meta, sport: 'mlb',
    generate: (seed, data) => { const rng = createRng(seed); const pool = knownSeasons(data); return { rounds: tries(rounds, () => build(rng, data, pool)) }; },
    publicView: (p) => ({ rounds: p.rounds.map((r) => ({ prompt: r.prompt, options: r.options })) }),
    score(p, answer) {
      if (!Array.isArray(answer) || answer.length !== p.rounds.length) throw new Error('Answer every round.');
      const detail = p.rounds.map((r, i) => ({ prompt: r.prompt, pick: answer[i], correct: r.correct, right: answer[i] === r.correct, options: r.options.map((o, k) => ({ ...o, note: r.notes[k] })) }));
      const right = detail.filter((d) => d.right).length;
      return { score: right, summary: `${right}/${p.rounds.length}`, detail, perfect: right === p.rounds.length };
    },
  };
}

export const mlbBlindResume = pickGame({
  slug: 'mlb-blind-resume', name: 'Blind Résumé: Baseball',
  tagline: 'A real season line. Four players from that year. Whose season was it?',
  howTo: ['Each round shows one season: average, homers, RBI, steals and OPS for a hitter; wins or saves, ERA and strikeouts for a pitcher.', 'Pick the player who put it up. All four played that season, in the same role.', 'Six rounds.'],
}, (rng, _data, pool) => {
  const t = rng.pick(pool.filter((s) => s.value >= 80));
  const same = distinctBy(pool.filter((s) => s.season === t.season && s.kind === t.kind && s.playerId !== t.playerId), (s) => s.playerId);
  if (same.length < 3) return null;
  const { list, correct } = deal(rng, t, rng.shuffle(same).slice(0, 3));
  return { prompt: `${t.season}: ${bLine(t)}. Whose season?`, options: list.map(bcard), notes: list.map(bLine), correct };
});

const LED: { label: string; get: (s: BSeason) => number }[] = [
  { label: 'home runs', get: (s) => s.bat!.hr }, { label: 'RBI', get: (s) => s.bat!.rbi }, { label: 'stolen bases', get: (s) => s.bat!.sb },
];
export const mlbWhoLed = pickGame({
  slug: 'mlb-who-led', name: 'Who Led? Baseball',
  tagline: 'One team, one season, one stat. Which teammate led the club?',
  howTo: ['Each round names a team-season and a stat: home runs, RBI or steals.', 'Pick the player who led that team (among its everyday players). All four were on the roster.', 'Six rounds.'],
}, (rng, data, pool) => {
  const star = rng.pick(pool.filter((s) => s.kind === 'bat'));
  const roster = distinctBy(data.seasons.filter((s) => s.kind === 'bat' && s.teamId === star.teamId && s.season === star.season), (s) => s.playerId);
  if (roster.length < 4) return null;
  const st = rng.pick(LED);
  const sorted = [...roster].sort((a, b) => st.get(b) - st.get(a));
  if (st.get(sorted[0]) === st.get(sorted[1])) return null;
  const { list, correct } = deal(rng, sorted[0], rng.shuffle(sorted.slice(1, 7)).slice(0, 3));
  return { prompt: `Who led the ${star.season} ${star.teamName} in ${st.label}?`, options: list.map(bcard), notes: list.map((s) => `${st.get(s)} ${st.label}`), correct };
});

export const mlbWhoseTeam = pickGame({
  slug: 'mlb-whose-team', name: 'Whose Team? Baseball',
  tagline: 'One star, one season. Which franchise was he on?',
  howTo: ['Each round names a well-known player and a season.', 'Pick the team he played for that year. Four teams from that season.', 'Six rounds.'],
}, (rng, data, pool) => {
  const t = rng.pick(pool.filter((s) => s.value >= 76));
  const his = new Set(data.seasons.filter((s) => s.playerId === t.playerId && s.season === t.season).map((s) => s.teamId));
  if (his.size !== 1) return null; // traded mid-season: two right answers
  const teams = distinctBy(data.seasons.filter((s) => s.season === t.season && !his.has(s.teamId)), (s) => s.teamId);
  if (teams.length < 3) return null;
  const asTeam = (s: BSeason) => ({ id: `${s.teamId}:${s.season}`, name: s.teamName, position: String(s.season), team: s.team, teamName: s.teamName, teamColor: s.teamColor, logoUrl: s.logoUrl, img: s.logoUrl });
  const { list, correct } = deal(rng, t, rng.shuffle(teams).slice(0, 3));
  return { prompt: `Which team did ${t.name} play for in ${t.season}?`, options: list.map(asTeam), notes: list.map((s) => (s === t ? bLine(t) : '')), correct };
});

export const mlbGames = [mlbHigherLower, mlbBlindResume, mlbWhoLed, mlbWhoseTeam];
