/**
 * Who a row on a draft board really is. One real person can have several rows: an All-time legend for each franchise
 * he starred for, a current player and his prime, the same player in two eras or two teams. A roster may hold him once.
 *
 * Two rows are the same person when they share a key. The key is the ESPN athlete id when the row has one, because two
 * different people can share a name (the Bills' QB and the Jaguars' linebacker are both Josh Allen) but never an id.
 * Rows with no id fall back to the name, folded to letters only, so "Ja'Marr" and "JaMarr" match, and to his position group
 * when the row has one, so two unlisted players who share a name but not a position stay apart.
 */
export const nameKey = (name: string) => name.toLowerCase().normalize('NFKD').replace(/[^a-z]/g, '');

export function personKey(p: { espnId?: string | number | null; name: string; group?: string }): string {
  const id = p.espnId == null || p.espnId === '' ? NaN : Number(p.espnId);
  return Number.isFinite(id) && id > 0 ? `e${id}` : `n${nameKey(p.name)}${p.group ? `:${p.group}` : ''}`;
}

/** The people already on a roster, from the keys stored with each pick (picks made before keys existed carry none). */
export const peopleOn = (picks: readonly { pid?: string }[]): Set<string> => new Set(picks.map((x) => x.pid).filter((x): x is string => !!x));
