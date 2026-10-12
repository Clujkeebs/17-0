/**
 * Start or sit: which of two to four players to play this week. A player's expected points a game blend what he has
 * done lately (last four games), over the season, and what he is projected for, using whichever of the three exist.
 * The verdict says how clear the call is. Pure and deterministic, so it can be tested without any data.
 */
export interface SSPlayer { id: string; name: string; pos: string; team: string; recent: number | null; ppg: number | null; proj: number | null; games: number; rostered?: number | null; trend?: number }
export interface SSLine { id: string; name: string; expected: number; parts: { recent: number | null; ppg: number | null; proj: number | null }; notes: string[] }
export type Confidence = 'Clear' | 'Lean' | 'Toss-up';
export interface SSVerdict { lines: SSLine[]; pick: SSLine; margin: number; confidence: Confidence; summary: string }

/** Recent form counts most, then the season, then the projection (which carries the load early in a season). */
const WEIGHTS = { recent: 0.5, ppg: 0.3, proj: 0.2 } as const;
const r1 = (n: number) => Math.round(n * 10) / 10;

export function expectedPoints(p: Pick<SSPlayer, 'recent' | 'ppg' | 'proj'>): number | null {
  let sum = 0, w = 0;
  for (const k of ['recent', 'ppg', 'proj'] as const) { const v = p[k]; if (v != null && Number.isFinite(v)) { sum += v * WEIGHTS[k]; w += WEIGHTS[k]; } }
  return w ? r1(sum / w) : null;
}

function notesFor(p: SSPlayer, expected: number): string[] {
  const out: string[] = [];
  if (p.recent != null && p.ppg != null && p.ppg > 0) {
    const swing = (p.recent - p.ppg) / p.ppg;
    if (swing >= 0.15) out.push(`Hot: ${r1(p.recent)} a game over his last four, up from ${r1(p.ppg)} on the season.`);
    else if (swing <= -0.15) out.push(`Cooling off: ${r1(p.recent)} a game over his last four, down from ${r1(p.ppg)} on the season.`);
    else out.push(`Steady: ${r1(p.recent)} over his last four, ${r1(p.ppg)} on the season.`);
  } else if (p.recent != null) out.push(`${r1(p.recent)} a game over his last four.`);
  else if (p.ppg != null) out.push(`${r1(p.ppg)} a game on the season.`);
  if (p.proj != null) out.push(`Projected for ${r1(p.proj)} a game.`);
  if (p.games > 0 && p.games < 4) out.push(`Only ${p.games} game${p.games === 1 ? '' : 's'} played, so the numbers are thin.`);
  if (p.trend && p.trend > 0) out.push('Being added across leagues right now.');
  if (p.rostered != null && p.rostered >= 90) out.push(`Rostered in ${Math.round(p.rostered)}% of leagues.`);
  if (!out.length) out.push(`Expected ${expected} points.`);
  return out;
}

/** The call between two to four players. Players with no numbers at all are left out. */
export function startSit(players: SSPlayer[]): SSVerdict | null {
  const lines: SSLine[] = players.flatMap((p) => {
    const expected = expectedPoints(p);
    return expected == null ? [] : [{ id: p.id, name: p.name, expected, parts: { recent: p.recent, ppg: p.ppg, proj: p.proj }, notes: notesFor(p, expected) }];
  }).sort((a, b) => b.expected - a.expected);
  if (lines.length < 2) return null;
  const [best, next] = lines;
  const margin = r1(best.expected - next.expected);
  const rel = next.expected > 0 ? margin / next.expected : 1;
  const confidence: Confidence = margin >= 2.5 || rel >= 0.15 ? 'Clear' : margin >= 1 || rel >= 0.06 ? 'Lean' : 'Toss-up';
  const summary = confidence === 'Toss-up'
    ? `${best.name} ${best.expected} against ${next.name} ${next.expected}. Go with your gut, or whoever has the better matchup.`
    : `${best.name} is expected to score ${best.expected} a game, ${margin} more than ${next.name}.`;
  return { lines, pick: best, margin, confidence, summary };
}
