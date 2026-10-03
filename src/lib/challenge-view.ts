/**
 * Side-by-side rosters for a challenge. Every draft game stores `slots` with a name and a letter grade, so one
 * adapter covers 17-0, 82-0 and 162-0. Pure, no data access.
 */
export interface RosterLine { slot: string; name: string; grade: number; letter: string }

export function rosterLines(resultData: unknown): RosterLine[] {
  const slots = (resultData as { slots?: unknown })?.slots;
  if (!Array.isArray(slots)) return [];
  return slots.filter((s) => s && typeof s === 'object').map((s) => {
    const x = s as { slot?: unknown; name?: unknown; grade?: unknown; letter?: unknown };
    return { slot: String(x.slot ?? ''), name: String(x.name ?? ''), grade: Number(x.grade ?? 0), letter: String(x.letter ?? '') };
  });
}

/** Pairs two rosters by slot, in the first roster's order, and says which side won each spot. */
export function faceOff(a: RosterLine[], b: RosterLine[]) {
  return a.map((x) => {
    const y = b.find((z) => z.slot === x.slot) ?? null;
    const edge = !y ? 'a' : x.grade > y.grade ? 'a' : y.grade > x.grade ? 'b' : 'even';
    return { slot: x.slot, a: x, b: y, edge: edge as 'a' | 'b' | 'even' };
  });
}

export const recordOf = (d: unknown) => { const r = d as { wins?: number; losses?: number }; return `${Number(r?.wins ?? 0)}-${Number(r?.losses ?? 0)}`; };

export const CHALLENGE_GAME_NAMES: Record<string, string> = { '17-0': '17-0', '82-0': '82-0', '162-0': '162-0' };

/** Short chips describing the setup everyone plays. */
export function setupChips(gameType: string, s: { hard?: boolean; format?: string; pool?: string; edition?: string; mode?: string }): string[] {
  const out: string[] = [];
  if (gameType === '17-0') {
    out.push(s.format === 'fantasy' ? 'Fantasy' : `${s.format ?? '6'}-man roster`);
    if (s.pool === 'all-time') out.push('All-time');
  }
  if (gameType === '82-0') out.push(s.edition === 'standard' ? 'Standard (2K)' : 'Classic eras');
  if (gameType === '162-0') out.push(s.mode === 'now' ? 'Right now' : 'Eras');
  if (s.hard) out.push('Hard mode');
  return out;
}
