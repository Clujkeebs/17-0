import { createRng } from '@/lib/game/prng';
import { POSITION_NAMES, type PositionGroup } from '@/lib/game/attributes';
import type { GPlayer, MiniGame } from '../types';

const GROUPS: PositionGroup[] = ['QB', 'RB', 'WR', 'TE', 'EDGE', 'LB', 'CB', 'S'];
export const TOP_TEN_STRIKES = 3;
const byRank = (a: GPlayer, b: GPlayer) => b.ovr - a.ovr || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);

interface Puzzle { seed: string; group: PositionGroup; top: { id: string; name: string; team: string; ovr: number; teamColor?: string; logoUrl?: string | null; img?: string | null }[] }
interface Answer { guesses: string[] }

export const topTen: MiniGame<Puzzle, Answer> = {
  slug: 'top-ten',
  name: 'Top Ten',
  tagline: 'One position. The ten best in Madden 27. Name them before you strike out.',
  howTo: ['Type a player at the listed position and pick him from the list.', 'Hit on a top ten player and he lands on the board at his rank. Miss and it is a strike.', 'Three strikes ends it. Give up anytime.', '10 points a name, plus 5 for finding number one.'],
  generate(seed, data) {
    const rng = createRng(seed);
    const counts = GROUPS.map((g) => ({ g, n: data.players.filter((p) => p.group === g).length }));
    const full = counts.filter((c) => c.n >= 10).map((c) => c.g);
    const group = full.length ? rng.pick(full) : counts.reduce((a, b) => (b.n > a.n ? b : a)).g;
    const top = data.players.filter((p) => p.group === group).sort(byRank).slice(0, 10)
      .map((p) => ({ id: p.id, name: p.name, team: p.team, ovr: p.ovr, teamColor: p.teamColor, logoUrl: p.logoUrl, img: p.img }));
    return { seed, group, top };
  },
  publicView: (p) => ({ seed: p.seed, group: p.group, groupName: POSITION_NAMES[p.group], size: p.top.length }),
  check(p, guess, data) {
    const id = (guess as { id?: unknown })?.id;
    if (typeof id !== 'string' || id.length > 100) throw new Error('Pick a player from the list.');
    const rank = p.top.findIndex((t) => t.id === id);
    const pl = data.players.find((x) => x.id === id);
    if (!pl) throw new Error('Unknown player.');
    return rank >= 0 ? { id, hit: true, rank: rank + 1, name: pl.name, team: pl.team, ovr: pl.ovr, teamColor: pl.teamColor, logoUrl: pl.logoUrl, img: pl.img } : { id, hit: false, name: pl.name };
  },
  // Ranked: every checked name counts, including strikes.
  applyChecks(_answer, checks) {
    return { guesses: (checks as { id: string }[]).map((c) => c.id).slice(0, 40) };
  },
  score(p, answer) {
    const list = answer?.guesses;
    if (!Array.isArray(list) || list.length > 40 || list.some((g) => typeof g !== 'string')) throw new Error('Bad guess list.');
    const found = new Set<string>();
    const seen = new Set<string>();
    let strikes = 0;
    for (const g of list) {
      if (strikes >= TOP_TEN_STRIKES || found.size === p.top.length) break;
      if (seen.has(g)) continue;
      seen.add(g);
      if (p.top.some((t) => t.id === g)) found.add(g); else strikes++;
    }
    const gotOne = p.top.length > 0 && found.has(p.top[0].id);
    const score = found.size * 10 + (gotOne ? 5 : 0);
    const detail = { group: p.group, groupName: POSITION_NAMES[p.group], strikes, rows: p.top.map((t, i) => ({ rank: i + 1, ...t, found: found.has(t.id) })) };
    return { score, summary: `${found.size}/${p.top.length}`, detail, perfect: found.size === p.top.length };
  },
};
