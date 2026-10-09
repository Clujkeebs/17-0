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

export const soccerAssistKing = pickGame({
  slug: 'soccer-assist-king', name: 'Assist King',
  tagline: 'One league, one season. Which of these four set up the most league goals?',
  howTo: ['Each round names a league season and four players from its leader lists.', 'Pick the one with the most league assists that season.', 'Six rounds.'],
}, (rng, data) => {
  const a = rng.pick(data.leaders);
  const same = data.leaders.filter((l) => l.league === a.league && l.season === a.season && l.assists > 0);
  if (same.length < 6) return null;
  const four = rng.shuffle(same).slice(0, 4);
  const best = [...four].sort((x, y) => y.assists - x.assists);
  if (best[0].assists === best[1].assists) return null;
  const { list, correct } = deal(rng, best[0], four.filter((x) => x !== best[0]));
  return { prompt: `Who had the most assists in the ${a.seasonLabel}?`, options: list.map(lcard), notes: list.map((l) => `${l.assists} assists in ${l.matches} matches`), correct };
});

const leagueCard = (league: string) => ({ id: `lg:${league}`, name: leagueName(league), position: '', team: leagueName(league), teamName: leagueName(league), teamColor: '#1F2937', logoUrl: null, img: null });
export const soccerWhichLeague = pickGame({
  slug: 'soccer-which-league', name: 'Which League?',
  tagline: 'One star, four leagues. Where does he play his club football?',
  howTo: ['Each round names a current player from a recent goals or assists list.', 'Pick the league his club plays in: Premier League, La Liga, Serie A, Bundesliga, Ligue 1 or MLS.', 'Six rounds. The reveal names his club.'],
}, (rng, data) => {
  const s = rng.pick(stars(data));
  const leagues = [...new Set(data.clubs.map((c) => c.league))].sort().filter((l) => l !== s.league);
  if (leagues.length < 3) return null;
  const { list, correct } = deal(rng, s.league, rng.shuffle(leagues).slice(0, 3));
  return { prompt: `Which league does ${s.name} (${s.position.toLowerCase()}) play in?`, options: list.map(leagueCard), notes: list.map((l) => (l === s.league ? s.club : '')), correct };
});

/** A player card that hides the club: the question is which club. */
const noClubCard = (s: SStar) => ({ id: s.key, name: s.name, position: s.position, team: leagueName(s.league), teamName: leagueName(s.league), teamColor: '#1F2937', logoUrl: null, img: s.img });
export const soccerOddClub = pickGame({
  slug: 'soccer-odd-club', name: 'Odd One Out: Clubs',
  tagline: 'Four players from one league. Three are teammates. Find the one who is not.',
  howTo: ['Each round shows four current players from the same league, clubs hidden.', 'Three play for the same club. Tap the one who plays somewhere else.', 'Six rounds. The reveal shows every club.'],
}, (rng, data) => {
  const pool = stars(data);
  const anchor = rng.pick(pool);
  const mates = pool.filter((x) => x.clubId === anchor.clubId);
  const outsiders = pool.filter((x) => x.league === anchor.league && x.clubId !== anchor.clubId);
  if (mates.length < 3 || !outsiders.length) return null;
  const odd = rng.pick(outsiders);
  const { list, correct } = deal(rng, odd, rng.shuffle(mates).slice(0, 3));
  return { prompt: `Three of these play for the same ${leagueName(anchor.league)} club. Who does not?`, options: list.map(noClubCard), notes: list.map((x) => x.club), correct };
});

/* ------------------------------------------------------------------ Rank 'Em: Goals */

const RANK_N = 5;
interface RankGoals { label: string; groupName: string; season: string; players: SLeader[] }
export const soccerRankGoals: MiniGame<RankGoals, string[], SoccerGameData> = {
  slug: 'soccer-rank-goals', sport: 'soccer',
  name: "Rank 'Em: Goals",
  tagline: 'Five scorers from one league season. Put them in order of league goals.',
  howTo: ['Order the five players from most to fewest league goals that season.', 'Use the up and down buttons, or drag on desktop.', 'Each of the 10 pairs you order correctly is worth 10. Each exact slot adds 4.'],
  generate(seed, data) {
    const rng = createRng(seed);
    const pool = topOfLists(data.leaders);
    for (let i = 0; i < 300; i++) {
      const a = rng.pick(pool);
      const picked: SLeader[] = [];
      for (const l of rng.shuffle(pool.filter((x) => x.league === a.league && x.season === a.season))) {
        if (!picked.some((x) => x.goals === l.goals || x.playerId === l.playerId)) picked.push(l);
        if (picked.length === RANK_N) break;
      }
      if (picked.length === RANK_N) return { label: 'League goals', groupName: 'Scorer', season: a.seasonLabel, players: picked };
    }
    throw new Error('Soccer data is still loading. Try again in a few minutes.');
  },
  publicView: (p) => ({ label: `Goals, ${p.season}`, groupName: 'Scorer', players: p.players.map(lcard) }),
  score(p, answer) {
    const ids = p.players.map((x) => x.key);
    if (!Array.isArray(answer) || answer.length !== ids.length || new Set(answer).size !== ids.length || !answer.every((a) => ids.includes(a))) throw new Error('Order all five players.');
    const v = new Map(p.players.map((x) => [x.key, x.goals]));
    let pairs = 0, total = 0;
    for (let i = 0; i < answer.length; i++) for (let j = i + 1; j < answer.length; j++) { total++; if (v.get(answer[i])! >= v.get(answer[j])!) pairs++; }
    const truth = [...p.players].sort((a, b) => b.goals - a.goals);
    let exact = 0;
    answer.forEach((id, i) => { if (v.get(id) === truth[i].goals) exact++; });
    const detail = { label: `Goals, ${p.season}`, pairs, total, exact, truth: truth.map((x, i) => ({ id: x.key, name: x.name, team: x.clubAbbr, teamColor: x.clubColor, logoUrl: x.clubLogo, img: x.img, v: x.goals, yourSlot: answer.indexOf(x.key) + 1, ok: v.get(answer[i]) === x.goals })) };
    return { score: pairs * 10 + exact * 4, summary: `${pairs}/${total} pairs`, detail, perfect: pairs === total };
  },
};

/* ------------------------------------------------------------------ Build a Soccer Player */

export const BUILD_TRAITS = [
  { key: 'finishing', label: 'Finishing', hint: 'his goals per match' },
  { key: 'playmaking', label: 'Playmaking', hint: 'his assists per match' },
  { key: 'fitness', label: 'Fitness', hint: 'his matches played' },
] as const;
export type BuildTrait = (typeof BUILD_TRAITS)[number]['key'];
type BuildRound = { club: SLeader; options: SLeader[] };
export type BuildAnswer = { pick: number; trait: BuildTrait }[];

/** The season a set of choices adds up to: the finisher's and playmaker's per-match rates over the fit man's matches. */
export function builtLine(rounds: BuildRound[], answer: BuildAnswer) {
  const at = (t: BuildTrait) => { const i = answer.findIndex((a) => a.trait === t); return rounds[i].options[answer[i].pick]; };
  const fin = at('finishing'), play = at('playmaking'), fit = at('fitness');
  const matches = fit.matches;
  const goals = Math.round((fin.goals / Math.max(1, fin.matches)) * matches);
  const assists = Math.round((play.assists / Math.max(1, play.matches)) * matches);
  return { goals, assists, matches, total: goals + assists, fin, play, fit };
}
/** The best line the board allows: every pick and every way to hand out the three traits. */
export function bestLine(rounds: BuildRound[]) {
  const orders: BuildTrait[][] = [['finishing', 'playmaking', 'fitness'], ['finishing', 'fitness', 'playmaking'], ['playmaking', 'finishing', 'fitness'], ['playmaking', 'fitness', 'finishing'], ['fitness', 'finishing', 'playmaking'], ['fitness', 'playmaking', 'finishing']];
  let best: ReturnType<typeof builtLine> | null = null;
  for (const o of orders) for (let a = 0; a < rounds[0].options.length; a++) for (let b = 0; b < rounds[1].options.length; b++) for (let c = 0; c < rounds[2].options.length; c++) {
    const r = builtLine(rounds, [{ pick: a, trait: o[0] }, { pick: b, trait: o[1] }, { pick: c, trait: o[2] }]);
    if (!best || r.total > best.total) best = r;
  }
  return best!;
}

export const soccerBuildPlayer: MiniGame<{ rounds: BuildRound[] }, BuildAnswer, SoccerGameData> = {
  slug: 'build-a-soccer-player', sport: 'soccer',
  name: 'Build a Soccer Player',
  tagline: 'Three clubs, three real seasons. Take finishing from one, playmaking from another, fitness from the third.',
  howTo: [
    'Each club shows its players\' seasons on a league goal or assist leader list.',
    'Take one season from each club and give it a trait: Finishing uses his goals per match, Playmaking his assists per match, Fitness his matches played.',
    'Your player\'s season is those rates over those matches. The score is goals plus assists; the reveal shows the best build the board allowed.',
  ],
  generate(seed, data) {
    const rng = createRng(seed);
    const pool = topOfLists(data.leaders).filter((l) => l.clubAbbr && l.matches >= 10);
    const byClub = new Map<string, SLeader[]>();
    for (const l of pool) byClub.set(l.clubAbbr, [...(byClub.get(l.clubAbbr) ?? []), l]);
    const clubs = rng.shuffle([...byClub.keys()].filter((k) => byClub.get(k)!.length >= 3));
    if (clubs.length < 3) throw new Error('Soccer data is still loading. Try again in a few minutes.');
    const rounds = clubs.slice(0, 3).map((k) => {
      const seen = new Set<number>();
      const options = rng.shuffle(byClub.get(k)!).filter((l) => (seen.has(l.playerId) ? false : (seen.add(l.playerId), true))).slice(0, 6);
      return { club: options[0], options };
    });
    return { rounds };
  },
  publicView: (p) => ({
    traits: BUILD_TRAITS,
    rounds: p.rounds.map((r) => ({ club: { name: r.club.club, abbr: r.club.clubAbbr, color: r.club.clubColor, logo: r.club.clubLogo },
      options: r.options.map((o) => ({ ...lcard(o), goals: o.goals, assists: o.assists, matches: o.matches })) })),
  }),
  score(p, answer) {
    if (!Array.isArray(answer) || answer.length !== p.rounds.length) throw new Error('Make a pick from every club.');
    const traits = new Set(answer.map((a) => a?.trait));
    if (traits.size !== 3 || !BUILD_TRAITS.every((t) => traits.has(t.key))) throw new Error('Use each trait once.');
    answer.forEach((a, i) => { if (!Number.isInteger(a.pick) || a.pick < 0 || a.pick >= p.rounds[i].options.length) throw new Error('Pick a player from every club.'); });
    const mine = builtLine(p.rounds, answer), best = bestLine(p.rounds);
    const who = (l: SLeader) => `${l.name} (${l.seasonLabel})`;
    const detail = { goals: mine.goals, assists: mine.assists, matches: mine.matches, from: { finishing: who(mine.fin), playmaking: who(mine.play), fitness: who(mine.fit) },
      best: { goals: best.goals, assists: best.assists, matches: best.matches, from: { finishing: who(best.fin), playmaking: who(best.play), fitness: who(best.fit) } } };
    return { score: mine.total, summary: `${mine.goals} G, ${mine.assists} A`, detail, perfect: mine.total >= best.total };
  },
};

export const soccerGames = [soccerWhoseClub, soccerWhereFrom, soccerHigherLower, soccerWhoScored, soccerBuildPlayer, soccerAssistKing, soccerWhichLeague, soccerOddClub, soccerRankGoals];
export type { SStar };
