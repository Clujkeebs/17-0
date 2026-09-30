import { createRng } from '@/lib/game/prng';
import { ATTRIBUTE_LABELS, POSITION_NAMES, type AttributeKey, type PositionGroup } from '@/lib/game/attributes';
import { card } from '../data';
import type { GPlayer, MiniGame } from '../types';

type Stat = 'ovr' | AttributeKey;
const STATS: Partial<Record<PositionGroup, Stat[]>> = {
  QB: ['ovr', 'throwPower', 'throwAccuracyDeep', 'speed', 'awareness'],
  RB: ['ovr', 'speed', 'trucking', 'jukeMove', 'breakTackle', 'acceleration'],
  WR: ['ovr', 'speed', 'catching', 'routeRunning', 'release', 'spectacularCatch'],
  TE: ['ovr', 'catching', 'runBlock', 'speed', 'strength'],
  EDGE: ['ovr', 'speed', 'powerMoves', 'finesseMoves', 'blockShedding'],
  LB: ['ovr', 'tackle', 'pursuit', 'playRecognition', 'speed'],
  CB: ['ovr', 'speed', 'manCoverage', 'zoneCoverage', 'press'],
  S: ['ovr', 'speed', 'zoneCoverage', 'hitPower', 'playRecognition'],
};
const N = 5;
const val = (p: GPlayer, k: Stat) => (k === 'ovr' ? p.ovr : p.attrs[k]);
const label = (k: Stat) => (k === 'ovr' ? 'Overall' : ATTRIBUTE_LABELS[k]);

interface Puzzle { group: PositionGroup; stat: Stat; players: { p: GPlayer; v: number }[] }
type Answer = string[];

export const rankEm: MiniGame<Puzzle, Answer> = {
  slug: 'rank-em',
  name: "Rank 'Em",
  tagline: 'Five players, one rating. Put them in order, best to worst.',
  howTo: ['Order the five players from highest to lowest in the listed rating.', 'Use the up and down buttons, or drag on desktop.', 'Each of the 10 pairs you order correctly is worth 10. Each exact slot adds 4.'],
  generate(seed, data) {
    const rng = createRng(seed);
    const groups = Object.keys(STATS) as PositionGroup[];
    let best: Puzzle | null = null;
    for (let attempt = 0; attempt < 60; attempt++) {
      const group = rng.pick(groups);
      const stat = rng.pick(STATS[group]!);
      const all = data.players.filter((p) => p.group === group && typeof val(p, stat) === 'number');
      const good = all.filter((p) => p.ovr >= 70);
      const pool = rng.shuffle(good.length >= N * 2 ? good : all);
      const picked: { p: GPlayer; v: number }[] = [];
      const used = new Set<number>();
      for (const p of pool) {
        const v = val(p, stat)!;
        if (used.has(v)) continue;
        used.add(v); picked.push({ p, v });
        if (picked.length === N) break;
      }
      if (picked.length === N) return { group, stat, players: picked };
      if (!best && pool.length >= N) best = { group, stat, players: pool.slice(0, N).map((p) => ({ p, v: val(p, stat)! })) };
    }
    if (best) return best;
    const any = rng.shuffle(data.players).slice(0, N);
    if (any.length < 2) throw new Error('Not enough players to build a puzzle.');
    return { group: any[0].group, stat: 'ovr', players: any.map((p) => ({ p, v: p.ovr })) };
  },
  publicView: (p) => ({ label: label(p.stat), groupName: POSITION_NAMES[p.group], players: p.players.map((x) => card(x.p)) }),
  score(p, answer) {
    const ids = p.players.map((x) => x.p.id);
    if (!Array.isArray(answer) || answer.length !== ids.length || new Set(answer).size !== ids.length || !answer.every((a) => ids.includes(a))) throw new Error('Order all five players.');
    const v = new Map(p.players.map((x) => [x.p.id, x.v]));
    let pairs = 0, total = 0;
    for (let i = 0; i < answer.length; i++) for (let j = i + 1; j < answer.length; j++) { total++; if (v.get(answer[i])! >= v.get(answer[j])!) pairs++; }
    const truth = [...p.players].sort((a, b) => b.v - a.v);
    let exact = 0;
    answer.forEach((id, i) => { if (v.get(id) === truth[i].v) exact++; });
    const detail = {
      label: label(p.stat),
      pairs, total, exact,
      truth: truth.map((x, i) => ({ id: x.p.id, name: x.p.name, team: x.p.team, teamColor: x.p.teamColor, logoUrl: x.p.logoUrl, img: x.p.img, v: x.v, yourSlot: answer.indexOf(x.p.id) + 1, ok: v.get(answer[i]) === x.v })),
    };
    return { score: pairs * 10 + exact * 4, summary: `${pairs}/${total} pairs`, detail, perfect: pairs === total };
  },
};
