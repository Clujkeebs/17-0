import { createRng, type Rng } from '@/lib/game/prng';
import type { MiniGame } from '../types';
import { ncard, type NbaGameData, type NSeason } from './data';

/**
 * Basketball mini games, built on real per-game stats (ESPN) since 1984-85. Each one reuses a football game's
 * screen: Higher or Lower, or the shared "tap one card" rounds.
 */

type Stat = 'ppg' | 'rpg' | 'apg' | 'spg' | 'bpg';
const STATS: { key: Stat; label: string; short: string }[] = [
  { key: 'ppg', label: 'Points per game', short: 'points' }, { key: 'rpg', label: 'Rebounds per game', short: 'rebounds' },
  { key: 'apg', label: 'Assists per game', short: 'assists' }, { key: 'spg', label: 'Steals per game', short: 'steals' },
  { key: 'bpg', label: 'Blocks per game', short: 'blocks' },
];
const r1 = (n: number) => Math.round(n * 10) / 10;
const line = (s: NSeason) => `${r1(s.ppg)} pts, ${r1(s.rpg)} reb, ${r1(s.apg)} ast`;

function tries<T>(n: number, make: () => T | null): T[] {
  const out: T[] = [];
  for (let i = 0; out.length < n && i < n * 400; i++) { const x = make(); if (x) out.push(x); }
  if (out.length < n) throw new Error('Not enough NBA history to build this puzzle.');
  return out;
}
const distinctBy = <T>(xs: T[], key: (x: T) => string | number) => xs.filter((x, i) => xs.findIndex((y) => key(y) === key(x)) === i);

/* ------------------------------------------------------------------ Higher or Lower */

type HLRound = { a: NSeason; b: NSeason; stat: Stat; label: string };
export const nbaHigherLower: MiniGame<{ rounds: HLRound[] }, ('a' | 'b')[], NbaGameData> = {
  slug: 'nba-higher-lower', sport: 'nba',
  name: 'Higher or Lower: Hoops',
  tagline: 'Two real NBA seasons, one stat. Ten calls. Who averaged more?',
  howTo: ['Each round shows two players, each in one season, and one per-game stat.', 'Tap the player who averaged more. Ties count either way.', 'Ten rounds. The reveal shows every number.'],
  generate(seed, data) {
    const rng = createRng(seed);
    const pool = data.seasons.filter((s) => s.value >= 72);
    return { rounds: tries(10, () => {
      const a = rng.pick(pool), st = rng.pick(STATS);
      const av = r1(a[st.key]);
      if (av < (st.key === 'ppg' ? 8 : st.key === 'rpg' || st.key === 'apg' ? 3 : 0.8)) return null;
      // Close calls from roughly the same era make it a game.
      const near = pool.filter((b) => b.playerId !== a.playerId && Math.abs(b.season - a.season) <= 8 && r1(b[st.key]) !== av && Math.abs(b[st.key] - a[st.key]) <= Math.max(0.3, av * 0.15));
      return near.length ? { a, b: rng.pick(near), stat: st.key, label: st.label } : null;
    }) };
  },
  publicView: (p) => ({ rounds: p.rounds.map((r) => ({ a: ncard(r.a), b: ncard(r.b), label: r.label })) }),
  score(p, answer) {
    if (!Array.isArray(answer) || answer.length !== p.rounds.length) throw new Error('Answer every round.');
    const detail = p.rounds.map((r, i) => {
      const av = r1(r.a[r.stat]), bv = r1(r.b[r.stat]);
      const ok = av === bv || (answer[i] === 'a' ? av > bv : bv > av);
      return { a: `${r.a.name} (${r.a.seasonLabel})`, b: `${r.b.name} (${r.b.seasonLabel})`, aImg: r.a.img, bImg: r.b.img, aTeam: r.a.team, bTeam: r.b.team, aColor: r.a.teamColor, bColor: r.b.teamColor, aLogo: r.a.logoUrl, bLogo: r.b.logoUrl, label: r.label, av, bv, pick: answer[i], ok };
    });
    const right = detail.filter((d) => d.ok).length;
    return { score: right, summary: `${right}/${p.rounds.length}`, detail, perfect: right === p.rounds.length };
  },
};

/* ------------------------------------------------------------------ shared "tap one card" rounds */

type Card = ReturnType<typeof ncard>;
type PickRound = { prompt: string; options: Card[]; notes: string[]; correct: number };
function pickGame(meta: { slug: string; name: string; tagline: string; howTo: string[] }, build: (rng: Rng, data: NbaGameData) => PickRound | null, rounds = 6): MiniGame<{ rounds: PickRound[] }, number[], NbaGameData> {
  return {
    ...meta, sport: 'nba',
    generate: (seed, data) => { const rng = createRng(seed); return { rounds: tries(rounds, () => build(rng, data)) }; },
    publicView: (p) => ({ rounds: p.rounds.map((r) => ({ prompt: r.prompt, options: r.options })) }),
    score(p, answer) {
      if (!Array.isArray(answer) || answer.length !== p.rounds.length) throw new Error('Answer every round.');
      const detail = p.rounds.map((r, i) => ({ prompt: r.prompt, pick: answer[i], correct: r.correct, right: answer[i] === r.correct, options: r.options.map((o, k) => ({ ...o, note: r.notes[k] })) }));
      const right = detail.filter((d) => d.right).length;
      return { score: right, summary: `${right}/${p.rounds.length}`, detail, perfect: right === p.rounds.length };
    },
  };
}
/** Puts the answer among the decoys in seeded order and remembers where it went. */
function deal<T>(rng: Rng, answer: T, decoys: T[]): { list: T[]; correct: number } {
  const list = rng.shuffle([answer, ...decoys]);
  return { list, correct: list.indexOf(answer) };
}

export const nbaBlindResume = pickGame({
  slug: 'nba-blind-resume', name: 'Blind Résumé: Hoops',
  tagline: 'A real season stat line. Four players from that year. Whose season was it?',
  howTo: ['Each round shows one season\'s per-game line: points, rebounds, assists.', 'Pick the player who put it up. All four played that season.', 'Six rounds.'],
}, (rng, data) => {
  const t = rng.pick(data.seasons.filter((s) => s.value >= 82));
  const same = distinctBy(data.seasons.filter((s) => s.season === t.season && s.playerId !== t.playerId && s.value >= 72), (s) => s.playerId);
  if (same.length < 3) return null;
  const { list, correct } = deal(rng, t, rng.shuffle(same).slice(0, 3));
  return { prompt: `${t.seasonLabel}: ${line(t)}. Whose season?`, options: list.map(ncard), notes: list.map(line), correct };
});

export const nbaWhoLed = pickGame({
  slug: 'nba-who-led', name: 'Who Led?',
  tagline: 'One team, one season, one stat. Which teammate led the way?',
  howTo: ['Each round names a team-season and a per-game stat.', 'Pick the player who led that team in it. All four were on the roster.', 'Six rounds.'],
}, (rng, data) => {
  const any = rng.pick(data.seasons);
  const roster = distinctBy(data.seasons.filter((s) => s.teamId === any.teamId && s.season === any.season), (s) => s.playerId);
  if (roster.length < 4) return null;
  const st = rng.pick(STATS.slice(0, 3));
  const sorted = [...roster].sort((a, b) => b[st.key] - a[st.key]);
  if (r1(sorted[0][st.key]) === r1(sorted[1][st.key])) return null;
  const { list, correct } = deal(rng, sorted[0], rng.shuffle(sorted.slice(1, 7)).slice(0, 3));
  return { prompt: `Who led the ${any.seasonLabel} ${any.teamName} in ${st.short} per game?`, options: list.map(ncard), notes: list.map((s) => `${r1(s[st.key])} ${st.short}`), correct };
});

export const nbaWhoseTeam = pickGame({
  slug: 'nba-whose-team', name: 'Whose Team?',
  tagline: 'One player, one season. Which franchise was he on?',
  howTo: ['Each round names a player and a season.', 'Pick the team he played for that year. Four teams from that season.', 'Six rounds.'],
}, (rng, data) => {
  const t = rng.pick(data.seasons.filter((s) => s.value >= 78));
  const his = new Set(data.seasons.filter((s) => s.playerId === t.playerId && s.season === t.season).map((s) => s.teamId));
  if (his.size !== 1) return null; // traded mid-season: two right answers
  const teams = distinctBy(data.seasons.filter((s) => s.season === t.season && !his.has(s.teamId)), (s) => s.teamId);
  if (teams.length < 3) return null;
  const asTeam = (s: NSeason) => ({ id: `${s.teamId}:${s.season}`, name: s.teamName, position: s.seasonLabel, team: s.team, teamName: s.teamName, teamColor: s.teamColor, logoUrl: s.logoUrl, img: s.logoUrl });
  const { list, correct } = deal(rng, t, rng.shuffle(teams).slice(0, 3));
  return { prompt: `Which team did ${t.name} play for in ${t.seasonLabel}?`, options: list.map(asTeam), notes: list.map((s, k) => (k === list.indexOf(t) ? line(t) : '')), correct };
});

/** Registered NBA mini games, in hub order. */
export const nbaGames = [nbaHigherLower, nbaBlindResume, nbaWhoLed, nbaWhoseTeam];
