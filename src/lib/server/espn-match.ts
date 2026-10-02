import { positionGroup } from '@/lib/game/attributes';

/** Broad position families. EA and ESPN label positions differently (LE vs DE, OLB edge vs LB), so match loosely. */
export type Family = 'QB' | 'RB' | 'REC' | 'OL' | 'FRONT' | 'DB' | 'K';

const ESPN_EXTRA: Record<string, Family> = { PK: 'K', LS: 'OL', OT: 'OL', ATH: 'REC' };

export function positionFamily(raw?: string | null): Family | null {
  if (!raw) return null;
  const up = raw.toUpperCase();
  if (ESPN_EXTRA[up]) return ESPN_EXTRA[up];
  switch (positionGroup(up)) {
    case 'QB': return 'QB';
    case 'RB': return 'RB';
    case 'WR': case 'TE': return 'REC';
    case 'OL': return 'OL';
    case 'DL': case 'EDGE': case 'LB': return 'FRONT';
    case 'CB': case 'S': return 'DB';
    case 'K': return 'K';
  }
}

export interface EspnCandidate { id: string; teamId: number; family: Family | null }

/**
 * Picks the ESPN athlete that is this player, among everyone ESPN lists under the same name.
 * Only same-family candidates count; a known ESPN id wins; otherwise exactly one candidate must remain.
 * Returns null when it is ambiguous, so a namesake never moves a player to the wrong team.
 */
export function pickEspnMatch<C extends EspnCandidate>(player: { position: string; espnId: string | null }, candidates: C[]): C | null {
  const fam = positionFamily(player.position);
  const fits = candidates.filter((c) => c.family === null || fam === null || c.family === fam);
  const known = player.espnId ? fits.find((c) => c.id === player.espnId) : undefined;
  if (known) return known;
  return fits.length === 1 ? fits[0] : null;
}
