import { createRng } from '@/lib/game/prng';
import { card } from '../data';
import type { GPlayer, MiniGame } from '../types';

export const ROUNDS = 5;
interface Round { p: GPlayer; choices: string[] }
interface Puzzle { seed: string; rounds: Round[] }
type Answer = string[];

export function funFact(p: GPlayer): string {
  const bits: string[] = [];
  if (p.yearsPro != null) bits.push(p.yearsPro === 0 ? 'Rookie season' : `Year ${p.yearsPro + 1} in the league`);
  if (p.age != null) bits.push(`${p.age} years old`);
  if (p.age != null && p.yearsPro != null) bits.push(`entered the NFL around age ${p.age - p.yearsPro}`);
  return bits.length ? `${bits.join(', ')}.` : `${p.position} for ${p.teamName}.`;
}

/** 100 per correct pick, plus 25 per consecutive correct pick beyond the first. */
export function streakPoints(oks: boolean[]): number {
  let streak = 0, pts = 0;
  for (const ok of oks) { if (ok) { streak++; pts += 100 + 25 * (streak - 1); } else streak = 0; }
  return pts;
}

export const wheresHeFrom: MiniGame<Puzzle, Answer> = {
  slug: 'wheres-he-from',
  name: "Where'd He Go?",
  tagline: 'Five pros. Four schools each. Name where he played on Saturdays.',
  howTo: ['Each round shows one current player and four colleges.', 'Pick his school. You see the answer right away.', 'Five rounds. 100 per hit, plus 25 more for every hit in a row.'],
  generate(seed, data) {
    const rng = createRng(seed);
    const withCollege = data.players.filter((p) => p.college);
    const counts = new Map<string, number>();
    for (const p of withCollege) counts.set(p.college!, (counts.get(p.college!) ?? 0) + 1);
    const colleges = [...counts.keys()].sort();
    if (colleges.length < 4) throw new Error('Not enough colleges to build a round.');
    const plausible = colleges.filter((c) => counts.get(c)! >= 3);
    const distractPool = plausible.length >= 4 ? plausible : colleges;
    let pool = withCollege.filter((p) => p.ovr >= 72).sort((a, b) => a.id.localeCompare(b.id));
    if (pool.length < ROUNDS) pool = [...withCollege].sort((a, b) => a.id.localeCompare(b.id));
    const picks = rng.shuffle(pool).slice(0, ROUNDS);
    const rounds = picks.map((p) => {
      // Prefer schools that produced players at the same position group.
      const samePos = [...new Set(withCollege.filter((x) => x.group === p.group && x.college !== p.college).map((x) => x.college!))].filter((c) => distractPool.includes(c)).sort();
      const src = samePos.length >= 3 ? samePos : distractPool.filter((c) => c !== p.college);
      const wrong = rng.shuffle(src).slice(0, 3);
      return { p, choices: rng.shuffle([p.college!, ...wrong]) };
    });
    return { seed, rounds };
  },
  publicView: (p) => ({ seed: p.seed, rounds: p.rounds.map((r) => ({ player: card(r.p), choices: r.choices })) }),
  check(p, guess) {
    const g = guess as { round?: unknown; pick?: unknown };
    const i = Number(g?.round);
    if (!Number.isInteger(i) || i < 0 || i >= p.rounds.length || typeof g.pick !== 'string') throw new Error('Pick a school.');
    const r = p.rounds[i];
    return { ok: g.pick === r.p.college, correct: r.p.college, fact: funFact(r.p) };
  },
  applyChecks(answer, checks) {
    const out = Array.isArray(answer) ? [...answer] : [];
    for (let r = 0; r < out.length; r++) { const c = (checks as { round: number; pick: string }[]).find((x) => x.round === r); if (c) out[r] = c.pick; }
    return out;
  },
  score(p, answer) {
    if (!Array.isArray(answer) || answer.length !== p.rounds.length || answer.some((a) => typeof a !== 'string')) throw new Error('Answer all five rounds.');
    const detail = p.rounds.map((r, i) => ({ name: r.p.name, team: r.p.team, teamColor: r.p.teamColor, logoUrl: r.p.logoUrl, img: r.p.img, pick: answer[i], correct: r.p.college, ok: answer[i] === r.p.college, fact: funFact(r.p) }));
    const right = detail.filter((d) => d.ok).length;
    const pts = streakPoints(detail.map((d) => d.ok));
    return { score: pts, summary: `${right}/${ROUNDS} · ${pts} pts`, detail, perfect: right === ROUNDS };
  },
};

