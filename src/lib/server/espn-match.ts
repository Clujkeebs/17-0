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
export function pickEspnMatch<C extends EspnCandidate>(player: { position: string; espnId: string | null; teamId?: number | null }, candidates: C[]): C | null {
  const fam = positionFamily(player.position);
  const fits = candidates.filter((c) => c.family === null || fam === null || c.family === fam);
  const known = player.espnId ? fits.find((c) => c.id === player.espnId) : undefined;
  if (known) return known;
  if (fits.length === 1) return fits[0];
  // EA and ESPN sometimes disagree on a player's job (Travis Hunter CB vs WR, a DT used at FB).
  // A lone namesake on the player's own team is that player; accepting it never moves anyone.
  if (fits.length === 0 && candidates.length === 1 && player.teamId != null && candidates[0].teamId === player.teamId) return candidates[0];
  return null;
}

const SUFFIX = /\b(jr|sr|ii|iii|iv|v)\b\.?/g;
/** Last name, lowercased and stripped of suffixes and punctuation ("Ray-Ray McCloud III" -> "mccloud"). */
export function lastNameKey(full: string): string {
  const parts = full.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(SUFFIX, '').trim().split(/\s+/);
  return (parts[parts.length - 1] ?? '').replace(/[^a-z]/g, '');
}

/**
 * Fallback when ESPN spells the first name differently (Cam / Cameron Heyward, Chigoziem / Chig Okonkwo):
 * the only same-family athlete with this last name on the player's own team.
 */
export function pickSameTeamNamesake<C extends EspnCandidate>(player: { position: string }, sameTeamSameLast: C[]): C | null {
  const fam = positionFamily(player.position);
  const fits = sameTeamSameLast.filter((c) => c.family === null || fam === null || c.family === fam);
  return fits.length === 1 ? fits[0] : null;
}

/**
 * Same idea for a player with no team (released by an earlier run): last name, position family and first initial
 * must all agree, and only one athlete in the league may fit.
 */
export function pickLeagueNamesake<C extends EspnCandidate & { a: { fullName: string } }>(player: { fullName: string; position: string }, sameLast: C[]): C | null {
  const fam = positionFamily(player.position);
  const initial = player.fullName.trim().charAt(0).toLowerCase();
  const fits = sameLast.filter((c) => (c.family === null || fam === null || c.family === fam) && c.a.fullName.trim().charAt(0).toLowerCase() === initial);
  return fits.length === 1 ? fits[0] : null;
}
