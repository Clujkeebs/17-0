import { createRng, type Rng } from '@/lib/game/prng';
import type { MiniGame } from '../types';
import { ncard, rcard, type NbaGameData, type NRated, type NSeason } from './data';
import { starIds, topBy } from '../prominent';

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
    // Known names only: the 150 best players since 1985 (by their best season), in their good seasons.
    const stars = starIds(data.seasons, (s) => s.playerId, (s) => s.value, 150);
    const pool = data.seasons.filter((s) => s.value >= 72 && stars.has(s.playerId));
    const used = new Set<number>();
    return { rounds: tries(10, () => {
      const a = rng.pick(pool), st = rng.pick(STATS);
      if (used.has(a.playerId)) return null;
      const av = r1(a[st.key]);
      if (av < (st.key === 'ppg' ? 8 : st.key === 'rpg' || st.key === 'apg' ? 3 : 0.8)) return null;
      // Close calls from roughly the same era make it a game.
      const near = pool.filter((b) => b.playerId !== a.playerId && !used.has(b.playerId) && Math.abs(b.season - a.season) <= 8 && r1(b[st.key]) !== av && Math.abs(b[st.key] - a[st.key]) <= Math.max(0.3, av * 0.15));
      if (!near.length) return null;
      const b = rng.pick(near); used.add(a.playerId); used.add(b.playerId);
      return { a, b, stat: st.key, label: st.label };
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

/* ------------------------------------------------------------------ NBA 2K rating games (ratings via NBA2KLab) */

const SOURCE_NOTE = 'Ratings: NBA 2K, via NBA2KLab.';
const ratedPool = (data: NbaGameData, min = 70) => {
  const good = data.rated.filter((r) => r.ovr >= min);
  if (good.length < 20) throw new Error('NBA 2K ratings are still loading. Try again later.');
  return good;
};

type HL2kRound = { a: NRated; b: NRated };
export const nba2kHigherLower: MiniGame<{ rounds: HL2kRound[] }, ('a' | 'b')[], NbaGameData> = {
  slug: 'nba-2k-higher-lower', sport: 'nba',
  name: 'Higher or Lower: 2K',
  tagline: 'Two current NBA players. Who has the higher NBA 2K overall? Ten calls.',
  howTo: ['Each round shows two current players.', 'Tap the one with the higher NBA 2K overall. Ties count either way.', `Ten rounds. The reveal shows every rating. ${SOURCE_NOTE}`],
  generate(seed, data) {
    const rng = createRng(seed);
    // Known names only: the top 70 overalls in the game.
    const pool = topBy(ratedPool(data, 74), (r) => r.ovr, 70);
    const used = new Set<number>();
    return { rounds: tries(10, () => {
      const a = rng.pick(pool);
      if (used.has(a.playerId)) return null;
      const near = pool.filter((b) => b.playerId !== a.playerId && !used.has(b.playerId) && b.ovr !== a.ovr && Math.abs(b.ovr - a.ovr) <= 4);
      if (!near.length) return null;
      const b = rng.pick(near); used.add(a.playerId); used.add(b.playerId);
      return { a, b };
    }) };
  },
  publicView: (p) => ({ rounds: p.rounds.map((r) => ({ a: rcard(r.a), b: rcard(r.b), label: 'NBA 2K overall' })) }),
  score(p, answer) {
    if (!Array.isArray(answer) || answer.length !== p.rounds.length) throw new Error('Answer every round.');
    const detail = p.rounds.map((r, i) => {
      const av = r.a.ovr, bv = r.b.ovr;
      const ok = av === bv || (answer[i] === 'a' ? av > bv : bv > av);
      return { a: r.a.name, b: r.b.name, aImg: r.a.img, bImg: r.b.img, aTeam: r.a.team, bTeam: r.b.team, aColor: r.a.teamColor, bColor: r.b.teamColor, aLogo: r.a.logoUrl, bLogo: r.b.logoUrl, label: 'NBA 2K overall', av, bv, pick: answer[i], ok };
    });
    const right = detail.filter((d) => d.ok).length;
    return { score: right, summary: `${right}/${p.rounds.length}`, detail, perfect: right === p.rounds.length };
  },
};

const RANK_N = 5;
const GUARDS = new Set(['PG', 'SG', 'G']), BIGS = new Set(['PF', 'C', 'F', 'SF']);
interface Rank2k { groupName: string; players: NRated[] }
export const nba2kRankEm: MiniGame<Rank2k, string[], NbaGameData> = {
  slug: 'nba-2k-rank-em', sport: 'nba',
  name: "Rank 'Em: 2K",
  tagline: 'Five current NBA players. Put them in NBA 2K overall order.',
  howTo: ['Order the five players from highest to lowest NBA 2K overall.', 'Use the up and down buttons, or drag on desktop.', `Each of the 10 pairs you order correctly is worth 10. Each exact slot adds 4. ${SOURCE_NOTE}`],
  generate(seed, data) {
    const rng = createRng(seed);
    const pool = ratedPool(data, 72);
    for (let i = 0; i < 200; i++) {
      const guards = rng.pick([true, false]);
      const src = rng.shuffle(pool.filter((r) => (guards ? GUARDS : BIGS).has(r.position)));
      const picked: NRated[] = [];
      for (const r of src) { if (!picked.some((x) => x.ovr === r.ovr)) picked.push(r); if (picked.length === RANK_N) break; }
      if (picked.length === RANK_N) return { groupName: guards ? 'Guard' : 'Frontcourt player', players: picked };
    }
    throw new Error('Not enough rated players to build this puzzle.');
  },
  publicView: (p) => ({ label: 'NBA 2K overall', groupName: p.groupName, players: p.players.map(rcard) }),
  score(p, answer) {
    const ids = p.players.map((x) => x.key);
    if (!Array.isArray(answer) || answer.length !== ids.length || new Set(answer).size !== ids.length || !answer.every((a) => ids.includes(a))) throw new Error('Order all five players.');
    const v = new Map(p.players.map((x) => [x.key, x.ovr]));
    let pairs = 0, total = 0;
    for (let i = 0; i < answer.length; i++) for (let j = i + 1; j < answer.length; j++) { total++; if (v.get(answer[i])! >= v.get(answer[j])!) pairs++; }
    const truth = [...p.players].sort((a, b) => b.ovr - a.ovr);
    let exact = 0;
    answer.forEach((id, i) => { if (v.get(id) === truth[i].ovr) exact++; });
    const detail = { label: 'NBA 2K overall', pairs, total, exact, truth: truth.map((x, i) => ({ id: x.key, name: x.name, team: x.team, teamColor: x.teamColor, logoUrl: x.logoUrl, img: x.img, v: x.ovr, yourSlot: answer.indexOf(x.key) + 1, ok: v.get(answer[i]) === x.ovr })) };
    return { score: pairs * 10 + exact * 4, summary: `${pairs}/${total} pairs`, detail, perfect: pairs === total };
  },
};

const GUESS_N = 6;
const guessPoints = (guess: number, actual: number) => Math.max(0, 10 - Math.abs(guess - actual)) * 10;
interface Guess2kRound { target: NRated; anchors: NRated[] }
export const nba2kGuess: MiniGame<{ rounds: Guess2kRound[] }, number[], NbaGameData> = {
  slug: 'nba-2k-guess', sport: 'nba',
  name: 'Guess the 2K',
  tagline: 'Six current NBA players. Name the NBA 2K overall. Within ten or it is a zero.',
  howTo: ['Each round shows a player and two others at his position with their overalls, for calibration.', 'Set your guess with the slider or the plus and minus buttons, 40 to 99.', `Ten points per round minus one per point you miss by, times ten. 600 is perfect. ${SOURCE_NOTE}`],
  generate(seed, data) {
    const rng = createRng(seed);
    const pool = ratedPool(data, 65);
    const used = new Set<number>();
    const rounds = tries(GUESS_N, () => {
      const t = rng.pick(pool);
      if (used.has(t.playerId)) return null;
      const peers = pool.filter((p) => p.playerId !== t.playerId && !used.has(p.playerId) && p.position === t.position);
      const above = peers.filter((p) => p.ovr > t.ovr + 1), below = peers.filter((p) => p.ovr < t.ovr - 1);
      const anchors = above.length && below.length ? [rng.pick(above), rng.pick(below)] : peers.length >= 2 ? rng.shuffle(peers).slice(0, 2) : null;
      if (!anchors) return null;
      used.add(t.playerId); anchors.forEach((a) => used.add(a.playerId));
      return { target: t, anchors: anchors.sort((a, b) => b.ovr - a.ovr) };
    });
    return { rounds };
  },
  publicView: (p) => ({ rounds: p.rounds.map((r) => ({ player: { ...rcard(r.target), age: null, yearsPro: null, archetype: null }, anchors: r.anchors.map((a) => ({ ...rcard(a), ovr: a.ovr })) })) }),
  score(p, answer) {
    if (!Array.isArray(answer) || answer.length !== GUESS_N || !answer.every((x) => Number.isInteger(x) && x >= 40 && x <= 99)) throw new Error('Guess every overall between 40 and 99.');
    const detail = p.rounds.map((r, i) => ({ name: r.target.name, team: r.target.team, teamColor: r.target.teamColor, logoUrl: r.target.logoUrl, img: r.target.img, position: r.target.position, actual: r.target.ovr, guess: answer[i], points: guessPoints(answer[i], r.target.ovr) }));
    const score = detail.reduce((s, d) => s + d.points, 0);
    return { score, summary: `${score} pts`, detail, perfect: score === GUESS_N * 100 };
  },
};

/** Registered NBA mini games, in hub order. */
export const nbaGames = [nbaHigherLower, nbaBlindResume, nbaWhoLed, nbaWhoseTeam, nba2kHigherLower, nba2kRankEm, nba2kGuess];
