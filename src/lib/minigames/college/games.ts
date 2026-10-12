import { createRng, type Rng } from '@/lib/game/prng';
import type { MiniGame } from '../types';
import type { NbaGameData } from '../nba/data';
import { hoopsGames, valueAt, deal, distinctBy, tries, r1 } from '../nba/games';
import { starIds } from '../prominent';
import type { CfbData, CfbLine } from './data';

/* ------------------------------------------------------------------ college basketball: the four hoops games on college data */

const cutsFor = () => {
  const cache = new WeakMap<NbaGameData, { ok: number; good: number; star: number }>();
  return (data: NbaGameData) => {
    let c = cache.get(data);
    if (!c) { c = { ok: valueAt(data, 0.55), good: valueAt(data, 0.78), star: valueAt(data, 0.9) }; cache.set(data, c); }
    return c;
  };
};
const MEN = hoopsGames({
  sport: 'cbb', prefix: 'cbb', league: "men's college basketball", she: 'he', stars: 120,
  names: { hl: 'Higher or Lower: College Hoops', br: 'Blind Résumé: College Hoops', led: 'Who Led? College Hoops', team: 'Whose Team? College Hoops' },
  cuts: cutsFor(),
});
const WOMEN = hoopsGames({
  sport: 'wcbb', prefix: 'wcbb', league: "women's college basketball", she: 'she', stars: 70,
  names: { hl: "Higher or Lower: Women's College Hoops", br: "Blind Résumé: Women's College Hoops", led: "Who Led? Women's College Hoops", team: "Whose Team? Women's College Hoops" },
  cuts: cutsFor(),
});
export const cbbHigherLower = MEN.higherLower, cbbBlindResume = MEN.blindResume, cbbWhoLed = MEN.whoLed, cbbWhoseTeam = MEN.whoseTeam;
export const wcbbHigherLower = WOMEN.higherLower, wcbbBlindResume = WOMEN.blindResume, wcbbWhoLed = WOMEN.whoLed, wcbbWhoseTeam = WOMEN.whoseTeam;

/* ------------------------------------------------------------------ college football: four games on each team's stat leaders */

/** What each stored category is called, and how big a season has to be to be worth asking about. */
export const CFB_CATEGORIES: Record<string, { label: string; short: string; min: number }> = {
  passingYards: { label: 'Passing yards', short: 'passing yards', min: 2200 },
  rushingYards: { label: 'Rushing yards', short: 'rushing yards', min: 1000 },
  receivingYards: { label: 'Receiving yards', short: 'receiving yards', min: 900 },
  sacks: { label: 'Sacks', short: 'sacks', min: 8 },
  interceptions: { label: 'Interceptions', short: 'interceptions', min: 5 },
  totalTackles: { label: 'Tackles', short: 'tackles', min: 95 },
};
const CATS = Object.keys(CFB_CATEGORIES);
const WHO_LED_CATS = ['rushingYards', 'receivingYards', 'totalTackles'];

const cardOf = (l: CfbLine) => ({ id: l.key, name: l.name, position: [l.position, l.season].filter(Boolean).join(' · '), team: l.team, teamName: l.teamName, teamColor: l.teamColor, logoUrl: l.logoUrl, img: l.img });
/** The stat as ESPN words it ("251 CAR, 1347 YDS, 12 TD"), or just the number for counts. */
const lineText = (l: CfbLine) => (l.display && /[A-Za-z]/.test(l.display) ? l.display : `${r1(l.value)} ${CFB_CATEGORIES[l.category]?.short ?? ''}`.trim());
const val = (l: CfbLine) => (l.category === 'sacks' ? r1(l.value) : Math.round(l.value));

type Card = ReturnType<typeof cardOf>;
type PickRound = { prompt: string; options: Card[]; notes: string[]; correct: number };
type HLRound = { a: CfbLine; b: CfbLine; label: string };

const FB = 'college football';
const CFB_META = { sport: 'cfb' as const };

/** Known names only: a category's biggest seasons, by the player's best one. */
function starsOf(data: CfbData, cat: string, n: number) {
  const rows = data.lines.filter((l) => l.category === cat && l.value >= CFB_CATEGORIES[cat].min);
  const ids = starIds(rows, (l) => l.playerId, (l) => l.value, n);
  return rows.filter((l) => ids.has(l.playerId));
}

const cfbPick = (meta: { slug: string; name: string; tagline: string; howTo: string[] }, build: (rng: Rng, data: CfbData) => PickRound | null, rounds = 6): MiniGame<{ rounds: PickRound[] }, number[], CfbData> => ({
  ...meta, ...CFB_META,
  generate: (seed, data) => { const rng = createRng(seed); return { rounds: tries(rounds, () => build(rng, data), FB) }; },
  publicView: (p) => ({ rounds: p.rounds.map((r) => ({ prompt: r.prompt, options: r.options })) }),
  score(p, answer) {
    if (!Array.isArray(answer) || answer.length !== p.rounds.length) throw new Error('Answer every round.');
    const detail = p.rounds.map((r, i) => ({ prompt: r.prompt, pick: answer[i], correct: r.correct, right: answer[i] === r.correct, options: r.options.map((o, k) => ({ ...o, note: r.notes[k] })) }));
    const right = detail.filter((d) => d.right).length;
    return { score: right, summary: `${right}/${p.rounds.length}`, detail, perfect: right === p.rounds.length };
  },
});

export const cfbHigherLower: MiniGame<{ rounds: HLRound[] }, ('a' | 'b')[], CfbData> = {
  slug: 'cfb-higher-lower', ...CFB_META,
  name: 'Higher or Lower: College Football',
  tagline: 'Two real college seasons, one stat. Passing, rushing, receiving or defense. Ten calls.',
  howTo: ['Each round shows two players, each in one season, and one stat.', 'Tap the player with more. Ties count either way.', 'Ten rounds. The reveal shows every number. Stats are from ESPN.'],
  generate(seed, data) {
    const rng = createRng(seed);
    const pools = new Map(CATS.map((c) => [c, starsOf(data, c, 120)]));
    const used = new Set<number>();
    return { rounds: tries(10, () => {
      const cat = rng.pick(CATS), pool = pools.get(cat)!;
      if (pool.length < 20) return null;
      const a = rng.pick(pool);
      if (used.has(a.playerId)) return null;
      const slack = Math.max(a.value * 0.18, cat === 'sacks' || cat === 'interceptions' ? 1.5 : 60);
      const near = pool.filter((b) => b.playerId !== a.playerId && !used.has(b.playerId) && val(b) !== val(a) && Math.abs(b.season - a.season) <= 8 && Math.abs(b.value - a.value) <= slack);
      if (!near.length) return null;
      const b = rng.pick(near); used.add(a.playerId); used.add(b.playerId);
      return { a, b, label: CFB_CATEGORIES[cat].label };
    }, FB) };
  },
  publicView: (p) => ({ rounds: p.rounds.map((r) => ({ a: cardOf(r.a), b: cardOf(r.b), label: r.label })) }),
  score(p, answer) {
    if (!Array.isArray(answer) || answer.length !== p.rounds.length) throw new Error('Answer every round.');
    const detail = p.rounds.map((r, i) => {
      const av = val(r.a), bv = val(r.b);
      const ok = av === bv || (answer[i] === 'a' ? av > bv : bv > av);
      return { a: `${r.a.name} (${r.a.season})`, b: `${r.b.name} (${r.b.season})`, aImg: r.a.img, bImg: r.b.img, aTeam: r.a.team, bTeam: r.b.team, aColor: r.a.teamColor, bColor: r.b.teamColor, aLogo: r.a.logoUrl, bLogo: r.b.logoUrl, label: r.label, av, bv, pick: answer[i], ok };
    });
    const right = detail.filter((d) => d.ok).length;
    return { score: right, summary: `${right}/${p.rounds.length}`, detail, perfect: right === p.rounds.length };
  },
};

export const cfbBlindResume = cfbPick({
  slug: 'cfb-blind-resume', name: 'Blind Résumé: College Football',
  tagline: 'A real college stat line. Four players from that season. Whose year was it?',
  howTo: ['Each round shows one season\'s stat line in one category.', 'Pick the player who put it up. All four were among their teams\' leaders that year.', 'Six rounds.'],
}, (rng, data) => {
  const cat = rng.pick(CATS);
  const t = rng.pick(starsOf(data, cat, 120).filter((l) => l.value >= CFB_CATEGORIES[cat].min * 1.15));
  if (!t) return null;
  const same = distinctBy(data.lines.filter((l) => l.season === t.season && l.category === cat && l.playerId !== t.playerId && l.value >= CFB_CATEGORIES[cat].min * 0.55), (l) => l.playerId);
  if (same.length < 3) return null;
  const { list, correct } = deal(rng, t, rng.shuffle(same).slice(0, 3));
  return { prompt: `${t.season} ${CFB_CATEGORIES[cat].label.toLowerCase()}: ${lineText(t)}. Whose season?`, options: list.map(cardOf), notes: list.map(lineText), correct };
});

export const cfbWhoLed = cfbPick({
  slug: 'cfb-who-led', name: 'Who Led? College Football',
  tagline: 'One team, one season, one stat. Which teammate led the way?',
  howTo: ['Each round names a team-season and a stat: rushing, receiving or tackles.', 'Pick the player who led that team in it. All four were among the team\'s leaders.', 'Six rounds.'],
}, (rng, data) => {
  const any = rng.pick(data.lines.filter((l) => WHO_LED_CATS.includes(l.category) && l.rank === 1));
  if (!any) return null;
  const crew = data.lines.filter((l) => l.teamId === any.teamId && l.season === any.season && l.category === any.category).sort((a, b) => a.rank - b.rank);
  if (crew.length < 4 || val(crew[0]) === val(crew[1])) return null;
  const { list, correct } = deal(rng, crew[0], crew.slice(1, 4));
  return { prompt: `Who led ${any.teamName} in ${CFB_CATEGORIES[any.category].short} in ${any.season}?`, options: list.map(cardOf), notes: list.map((l) => lineText(l)), correct };
});

export const cfbWhoseTeam = cfbPick({
  slug: 'cfb-whose-team', name: 'Whose Team? College Football',
  tagline: 'One player, one season. Which school was he playing for?',
  howTo: ['Each round names a player and a season.', 'Pick the school he played for that year. Four schools from that season.', 'Six rounds.'],
}, (rng, data) => {
  const cat = rng.pick(CATS);
  const t = rng.pick(starsOf(data, cat, 120).filter((l) => l.value >= CFB_CATEGORIES[cat].min * 1.1));
  if (!t) return null;
  const hers = new Set(data.lines.filter((l) => l.playerId === t.playerId && l.season === t.season).map((l) => l.teamId));
  if (hers.size !== 1) return null;
  const teams = distinctBy(data.lines.filter((l) => l.season === t.season && l.teamId !== t.teamId), (l) => l.teamId);
  if (teams.length < 3) return null;
  const asTeam = (l: CfbLine) => ({ id: `${l.teamId}:${l.season}`, name: l.teamName, position: String(l.season), team: l.team, teamName: l.teamName, teamColor: l.teamColor, logoUrl: l.logoUrl, img: l.logoUrl });
  const decoys = rng.shuffle(teams).slice(0, 3);
  const { list, correct } = deal(rng, t, decoys);
  return { prompt: `Which school did ${t.name} play for in ${t.season}?`, options: list.map(asTeam), notes: list.map((l, k) => (k === correct ? lineText(t) : '')), correct };
});

/** Registered college games, in hub order. */
export const collegeGames = [
  cfbHigherLower, cfbBlindResume, cfbWhoLed, cfbWhoseTeam,
  cbbHigherLower, cbbBlindResume, cbbWhoLed, cbbWhoseTeam,
  wcbbHigherLower, wcbbBlindResume, wcbbWhoLed, wcbbWhoseTeam,
];
