import { createRng } from '@/lib/game/prng';
import type { GameData, GPlayer, GTeam, MiniGame } from '../types';

export const NTT_CLUES = 6;
const ord = (n: number) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const byOvr = (a: GPlayer, b: GPlayer) => b.ovr - a.ovr || a.name.localeCompare(b.name);

interface Puzzle { seed: string; team: GTeam; clues: string[]; teams: ReturnType<typeof teamList> }
type Answer = number[];

function teamList(data: GameData) {
  return [...data.teams].sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name))
    .map((t) => ({ id: t.id, abbr: t.abbr, name: `${t.city} ${t.name}`, color: t.color }));
}

export const nameThatTeam: MiniGame<Puzzle, Answer> = {
  slug: 'name-that-team',
  name: 'Name That Team',
  tagline: 'Six clues, one mystery roster. The fewer you need, the better.',
  howTo: ['You start with one clue about a mystery NFL team.', 'Guess any team. Miss and the next clue drops.', 'Solve on clue one for 6 points, clue six for 1. Six misses scores 0.'],
  generate(seed, data) {
    const rng = createRng(seed);
    const roster = new Map<number, GPlayer[]>();
    for (const p of data.players) { const r = roster.get(p.teamId) ?? []; r.push(p); roster.set(p.teamId, r); }
    for (const r of roster.values()) r.sort(byOvr);
    const eligible = data.teams.filter((t) => (roster.get(t.id)?.length ?? 0) >= 3);
    if (!eligible.length) throw new Error('Not enough roster data to build a puzzle.');
    const team = rng.pick(eligible);
    const r = roster.get(team.id)!;
    const avg = (t: GTeam) => { const top = (roster.get(t.id) ?? []).slice(0, 22); return top.reduce((s, p) => s + p.ovr, 0) / top.length; };
    const ranked = [...eligible].sort((a, b) => avg(b) - avg(a) || a.id - b.id);
    const rank = ranked.findIndex((t) => t.id === team.id) + 1;
    const collegeStar = r.slice(0, 5).find((p) => p.college);
    const nameStar = r[0];
    const clues = [
      `Its highest rated player is a ${r[0].position} at ${r[0].ovr} overall.`,
      `It plays in the ${team.division.startsWith(team.conference) ? team.division : `${team.conference} ${team.division}`}.`,
      `Its three best players: ${r.slice(0, 3).map((p) => `${p.position} ${p.ovr}`).join(', ')}.`,
      `Its core roster ranks ${ord(rank)} of ${ranked.length} in average overall.`,
      collegeStar ? `One of its five best players went to ${collegeStar.college}.` : `Its fifth best player is a ${r[Math.min(4, r.length - 1)].position}.`,
      `${nameStar.name} plays here.`,
    ];
    return { seed, team, clues, teams: teamList(data) };
  },
  publicView: (p) => ({ seed: p.seed, first: p.clues[0], total: NTT_CLUES, teams: p.teams }),
  check(p, guess) {
    const guesses = (guess as { guesses?: unknown })?.guesses;
    if (!Array.isArray(guesses) || guesses.length < 1 || guesses.length > NTT_CLUES || !guesses.every((g) => Number.isInteger(g))) throw new Error('Pick a team.');
    const last = guesses[guesses.length - 1] as number;
    const correct = last === p.team.id;
    const done = correct || guesses.length >= NTT_CLUES;
    return { correct, clues: p.clues.slice(0, Math.min(NTT_CLUES, correct ? guesses.length : guesses.length + 1)), done };
  },
  maxChecks: 6,
  // Ranked: each check carries the full guess list; the longest one is the truth.
  applyChecks(answer, checks) {
    const lists = (checks as { guesses: number[] }[]).map((c) => c.guesses);
    return lists.length ? lists.reduce((a, b) => (b.length > a.length ? b : a)) : answer;
  },
  score(p, answer) {
    if (!Array.isArray(answer) || answer.length < 1 || answer.length > NTT_CLUES || !answer.every((g) => Number.isInteger(g))) throw new Error('Make at least one guess.');
    const hit = answer.indexOf(p.team.id);
    const used = hit >= 0 ? hit + 1 : NTT_CLUES;
    const score = hit >= 0 ? NTT_CLUES + 1 - used : 0;
    return {
      score,
      summary: hit >= 0 ? `${used} clue${used === 1 ? '' : 's'}` : 'Missed',
      detail: { team: { id: p.team.id, abbr: p.team.abbr, name: `${p.team.city} ${p.team.name}`, color: p.team.color }, clues: p.clues, used, solved: hit >= 0, guesses: answer.slice(0, used) },
      perfect: hit === 0,
    };
  },
};
