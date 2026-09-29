import type { ExistingPlayer, FeedPlayer, PlayerDiff, ValidationResult } from './types';

export const DROP_FLAG_THRESHOLD = 15;
export const MIN_TEAM_SIZE = 53;

const sameAttrs = (a: Record<string, number>, b: Record<string, number>) => {
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
};

/**
 * Match feed players to existing rows by maddenId, then by slug for rows still holding seed data
 * (so the first real sync takes over the placeholder rows instead of duplicating them).
 */
export function matchExisting(incoming: FeedPlayer[], existing: ExistingPlayer[]) {
  const byId = new Map(existing.map((e) => [e.maddenId, e]));
  const seedBySlug = new Map(existing.filter((e) => e.maddenVersion.startsWith('seed')).map((e) => [e.slug, e]));
  const claimed = new Set<string>();
  const pairs: { incoming: FeedPlayer; existing: ExistingPlayer | null }[] = [];
  for (const p of incoming) {
    let match = byId.get(p.maddenId) ?? null;
    if (match && claimed.has(match.id)) match = null;
    if (!match) {
      const s = seedBySlug.get(p.slug);
      if (s && !claimed.has(s.id)) match = s;
    }
    if (match) claimed.add(match.id);
    pairs.push({ incoming: p, existing: match });
  }
  return { pairs, claimed };
}

export function diffPlayers(existing: ExistingPlayer[], incoming: FeedPlayer[]): PlayerDiff {
  const { pairs, claimed } = matchExisting(incoming, existing);
  const diff: PlayerDiff = { added: [], changed: [], unchanged: [], missing: [] };
  for (const { incoming: p, existing: e } of pairs) {
    if (!e) { diff.added.push(p); continue; }
    const attributesChanged = !sameAttrs(e.attributes ?? {}, p.attributes);
    const ovrDelta = p.overallRating - e.overallRating;
    // A seed row being claimed always counts as changed so it gets a real history row.
    if (ovrDelta !== 0 || attributesChanged || e.maddenId !== p.maddenId || !e.isActive) {
      diff.changed.push({ incoming: p, existing: e, ovrDelta, attributesChanged });
    } else {
      diff.unchanged.push({ incoming: p, existing: e });
    }
  }
  diff.missing = existing.filter((e) => !claimed.has(e.id) && e.isActive && !e.isAllTimeGreat);
  return diff;
}

/**
 * Sanity checks before anything is written. Errors abort the sync; warnings are recorded only.
 * `previous` is the current set of rows so rating drops and feed shrinkage can be detected.
 */
export function validate(incoming: FeedPlayer[], previous: ExistingPlayer[] = []): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const flaggedDrops: ValidationResult['flaggedDrops'] = [];

  if (incoming.length === 0) errors.push('Feed parsed to zero players');

  const ids = new Set<string>();
  for (const p of incoming) {
    if (!Number.isInteger(p.overallRating) || p.overallRating < 0 || p.overallRating > 99) {
      errors.push(`OVR out of range for ${p.fullName} (${p.maddenId}): ${p.overallRating}`);
    }
    if (!p.fullName.trim()) errors.push(`Missing name for ${p.maddenId}`);
    if (ids.has(p.maddenId)) errors.push(`Duplicate maddenId ${p.maddenId}`);
    ids.add(p.maddenId);
    for (const [k, v] of Object.entries(p.attributes)) {
      if (v < 0 || v > 99) { warnings.push(`Attribute ${k}=${v} out of range for ${p.fullName}`); break; }
    }
  }

  // A feed far smaller than what we already hold is almost certainly a partial scrape.
  const activeReal = previous.filter((e) => e.isActive && !e.isAllTimeGreat && !e.maddenVersion.startsWith('seed')).length;
  if (activeReal > 200 && incoming.length < activeReal * 0.5) {
    errors.push(`Feed has ${incoming.length} players vs ${activeReal} active; refusing to deactivate half the league`);
  }

  const { pairs } = matchExisting(incoming, previous);
  for (const { incoming: p, existing: e } of pairs) {
    if (e && e.overallRating - p.overallRating > DROP_FLAG_THRESHOLD) {
      flaggedDrops.push({ maddenId: p.maddenId, fullName: p.fullName, from: e.overallRating, to: p.overallRating });
    }
  }
  if (flaggedDrops.length) {
    warnings.push(`${flaggedDrops.length} player(s) dropped more than ${DROP_FLAG_THRESHOLD} OVR: ${flaggedDrops.slice(0, 10).map((d) => `${d.fullName} ${d.from}->${d.to}`).join(', ')}`);
  }

  const perTeam = new Map<string, number>();
  for (const p of incoming) if (p.teamLabel) perTeam.set(p.teamLabel, (perTeam.get(p.teamLabel) ?? 0) + 1);
  const small = [...perTeam].filter(([, n]) => n < MIN_TEAM_SIZE);
  if (small.length) warnings.push(`${small.length} team(s) under ${MIN_TEAM_SIZE} players: ${small.map(([t, n]) => `${t}=${n}`).join(', ')}`);

  return { ok: errors.length === 0, errors, warnings, flaggedDrops };
}
