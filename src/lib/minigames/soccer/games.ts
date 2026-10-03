import { createRng, type Rng } from '@/lib/game/prng';
import type { MiniGame } from '../types';
import { clubCard, lcard, scard, type SLeader, type SoccerGameData, type SStar } from './data';
import { leagueName } from '@/lib/server/soccer-sync';
import { topBy } from '../prominent';

/**
 * Soccer mini games on ESPN data: current club rosters (Premier League, La Liga, Serie A, Bundesliga, Ligue 1,
 * MLS) and each league's goal and assist leaders. They reuse the Higher or Lower and "tap one card" screens.
 */

function tries<T>(n: number, make: () => T | null): T[] {
  const out: T[] = [];
  for (let i = 0; out.length < n && i < n * 400; i++) { const x = make(); if (x) out.push(x); }
  if (out.length < n) throw new Error('Soccer data is still loading. Try again in a few minutes.');
  return out;
}
function deal<T>(rng: Rng, answer: T, decoys: T[]): { list: T[]; correct: number } {
  const list = rng.shuffle([answer, ...decoys]);
  return { list, correct: list.indexOf(answer) };
}
const stars = (d: SoccerGameData) => { if (d.stars.length < 30) throw new Error('Soccer data is still loading. Try again in a few minutes.'); return d.stars; };

/* ------------------------------------------------------------------ Higher or Lower: Goals */

/**
 * Known names only: each league season's top 12 scorers and top 8 assist men (top 5 and 4 in MLS),
 * not the whole 50-deep leader list.
 */
export function topOfLists(leaders: SLeader[]): SLeader[] {
  const groups = new Map<string, SLeader[]>();
  for (const l of leaders) { const k = `${l.league}:${l.season}`; groups.set(k, [...(groups.get(k) ?? []), l]); }
  const keep = new Set<string>();
  for (const [k, ls] of groups) {
    const mls = k.startsWith('usa.1');
    topBy(ls, (l) => l.goals, mls ? 5 : 12).forEach((l) => keep.add(l.key));
    topBy(ls, (l) => l.assists, mls ? 4 : 8).forEach((l) => keep.add(l.key));
  }
  return leaders.filter((l) => keep.has(l.key));
}

type HLRound = { a: SLeader; b: SLeader; stat: 'goals' | 'assists'; label: string };
export const soccerHigherLower: MiniGame<{ rounds: HLRound[] }, ('a' | 'b')[], SoccerGameData> = {
  slug: 'soccer-higher-lower', sport: 'soccer',
  name: 'Higher or Lower: Goals',
  tagline: 'Two real league seasons. Who scored (or set up) more? Ten calls.',
  howTo: ['Each round shows two players from the same league and season.', 'Tap the one with more league goals (or assists, when the round says so). Ties count either way.', 'Ten rounds. The reveal shows every number.'],
  generate(seed, data) {
    const rng = createRng(seed);
    if (data.leaders.length < 40) throw new Error('Soccer data is still loading. Try again in a few minutes.');
    const pool = topOfLists(data.leaders);
    const used = new Set<number>();
    return { rounds: tries(10, () => {
      const a = rng.pick(pool);
      if (used.has(a.playerId)) return null;
      const stat = rng.next() < 0.75 ? 'goals' : 'assists';
      const av = a[stat];
      if (av < (stat === 'goals' ? 5 : 4)) return null;
      const near = pool.filter((b) => b.playerId !== a.playerId && !used.has(b.playerId) && b.league === a.league && b.season === a.season && b[stat] !== av && Math.abs(b[stat] - av) <= Math.max(2, Math.round(av * 0.3)));
      if (!near.length) return null;
      const b = rng.pick(near); used.add(a.playerId); used.add(b.playerId);
      return { a, b, stat, label: `${leagueName(a.league)} ${stat} in ${a.seasonLabel.split(' ').pop()}` };
    }) };
  },
  publicView: (p) => ({ rounds: p.rounds.map((r) => ({ a: lcard(r.a), b: lcard(r.b), label: r.label })) }),
  score(p, answer) {
    if (!Array.isArray(answer) || answer.length !== p.rounds.length) throw new Error('Answer every round.');
    const detail = p.rounds.map((r, i) => {
      const av = r.a[r.stat], bv = r.b[r.stat];
      const ok = av === bv || (answer[i] === 'a' ? av > bv : bv > av);
      return { a: `${r.a.name} (${r.a.seasonLabel})`, b: `${r.b.name} (${r.b.seasonLabel})`, aImg: r.a.img, bImg: r.b.img, aTeam: r.a.clubAbbr, bTeam: r.b.clubAbbr, aColor: r.a.clubColor, bColor: r.b.clubColor, aLogo: r.a.clubLogo, bLogo: r.b.clubLogo, label: r.label, av, bv, pick: answer[i], ok };
    });
    const right = detail.filter((d) => d.ok).length;
    return { score: right, summary: `${right}/${p.rounds.length}`, detail, perfect: right === p.rounds.length };
  },
};

/* ------------------------------------------------------------------ tap one card */

type Card = { id: string; name: string; position: string; team: string; teamName: string; teamColor: string; logoUrl: string | null; img: string | null };
type PickRound = { prompt: string; options: Card[]; notes: string[]; correct: number };
function pickGame(meta: { slug: string; name: string; tagline: string; howTo: string[] }, build: (rng: Rng, data: SoccerGameData) => PickRound | null, rounds = 6): MiniGame<{ rounds: PickRound[] }, number[], SoccerGameData> {
  return {
    ...meta, sport: 'soccer',
    generate: (seed, data) => { const rng = createRng(seed); stars(data); return { rounds: tries(rounds, () => build(rng, data)) }; },
    publicView: (p) => ({ rounds: p.rounds.map((r) => ({ prompt: r.prompt, options: r.options })) }),
    score(p, answer) {
      if (!Array.isArray(answer) || answer.length !== p.rounds.length) throw new Error('Answer every round.');
      const detail = p.rounds.map((r, i) => ({ prompt: r.prompt, pick: answer[i], correct: r.correct, right: answer[i] === r.correct, options: r.options.map((o, k) => ({ ...o, note: r.notes[k] })) }));
      const right = detail.filter((d) => d.right).length;
      return { score: right, summary: `${right}/${p.rounds.length}`, detail, perfect: right === p.rounds.length };
    },
  };
}

export const soccerWhoseClub = pickGame({
  slug: 'soccer-whose-club', name: 'Whose Club?',
  tagline: 'A star from Europe\'s big five leagues or MLS. Which club does he play for now?',
  howTo: ['Each round names a current player who made a recent goals or assists list.', 'Pick his club. All four clubs are from his league.', 'Six rounds. Rosters update daily.'],
}, (rng, data) => {
  const s = rng.pick(stars(data));
  const others = data.clubs.filter((c) => c.league === s.league && c.id !== s.clubId);
  const mine = data.clubs.find((c) => c.id === s.clubId);
  if (!mine || others.length < 3) return null;
  const { list, correct } = deal(rng, mine, rng.shuffle(others).slice(0, 3));
  return { prompt: `Which club does ${s.name} (${s.position.toLowerCase()}) play for?`, options: list.map(clubCard), notes: list.map((c) => (c.id === s.clubId ? `${s.name} is here` : '')), correct };
});

const flagCard = (country: string) => ({ id: `n:${country}`, name: country, position: '', team: country.slice(0, 3).toUpperCase(), teamName: country, teamColor: '#1F2937', logoUrl: null, img: null });
export const soccerWhereFrom = pickGame({
  slug: 'soccer-where-from', name: "Where's He From? Soccer",
  tagline: 'One star, four countries. Which nation does he represent?',
  howTo: ['Each round names a current player from a top league.', 'Pick his nationality (ESPN\'s listed citizenship).', 'Six rounds.'],
}, (rng, data) => {
  const pool = stars(data).filter((s) => s.nationality);
  const s = rng.pick(pool);
  const nations = [...new Set(pool.map((x) => x.nationality!).filter((n) => n !== s.nationality))];
  if (nations.length < 3) return null;
  const { list, correct } = deal(rng, s.nationality!, rng.shuffle(nations).slice(0, 3));
  return { prompt: `${s.name} plays for ${s.club}. Where is he from?`, options: list.map(flagCard), notes: list.map((n) => (n === s.nationality ? `${s.name}` : '')), correct };
});

export const soccerWhoScored = pickGame({
  slug: 'soccer-top-scorer', name: 'Top Scorer',
  tagline: 'One league, one season. Which of these four scored the most league goals?',
  howTo: ['Each round names a league season and four players from its leader lists.', 'Pick the one with the most league goals that season.', 'Six rounds.'],
}, (rng, data) => {
  const a = rng.pick(data.leaders);
  const same = data.leaders.filter((l) => l.league === a.league && l.season === a.season);
  if (same.length < 6) return null;
  const four = rng.shuffle(same).slice(0, 4);
  const best = [...four].sort((x, y) => y.goals - x.goals);
  if (best[0].goals === best[1].goals) return null;
  const { list, correct } = deal(rng, best[0], four.filter((x) => x !== best[0]));
  return { prompt: `Who scored the most goals in the ${a.seasonLabel}?`, options: list.map(lcard), notes: list.map((l) => `${l.goals} goals in ${l.matches} matches`), correct };
});

export const soccerGames = [soccerWhoseClub, soccerWhereFrom, soccerHigherLower, soccerWhoScored];
export type { SStar };
