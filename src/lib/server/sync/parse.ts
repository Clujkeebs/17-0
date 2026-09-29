import { slugify } from '@/lib/site';
import { ATTRIBUTE_KEYS, type AttributeKey } from '@/lib/game/attributes';
import type { FeedPlayer } from './types';

/**
 * EA stat ids that differ from our attribute keys. Everything else is matched case-insensitively
 * against ATTRIBUTE_KEYS after stripping non-alphanumerics; unknown stats are ignored.
 */
const STAT_ALIASES: Record<string, AttributeKey> = {
  ballcarriervision: 'bcVision',
  bcv: 'bcVision',
  carryingvision: 'bcVision',
  throwaccuracy: 'throwAccuracyMid',
  shortaccuracy: 'throwAccuracyShort',
  mediumaccuracy: 'throwAccuracyMid',
  midaccuracy: 'throwAccuracyMid',
  deepaccuracy: 'throwAccuracyDeep',
  throwaccuracymedium: 'throwAccuracyMid',
  throwaccuracymed: 'throwAccuracyMid',
  catchintraffic: 'catchInTraffic',
  cit: 'catchInTraffic',
  spectacularcatch: 'spectacularCatch',
  runblocking: 'runBlock',
  passblocking: 'passBlock',
  blockshed: 'blockShedding',
  powermove: 'powerMoves',
  finessemove: 'finesseMoves',
  mancover: 'manCoverage',
  zonecover: 'zoneCoverage',
  presscoverage: 'press',
  kickaccuracy: 'kickAccuracy',
  kickpower: 'kickPower',
  jumpingability: 'jumping',
  playrec: 'playRecognition',
  hitpower: 'hitPower',
};

const ROUTE_PARTS = ['shortrouterunning', 'mediumrouterunning', 'deeprouterunning'];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const KEY_LOOKUP: Record<string, AttributeKey> = Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [norm(k), k]));

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  if (isObj(v)) return num(v.value ?? v.rating ?? v.val);
  return null;
}

function str(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return String(v);
  if (isObj(v)) return str(v.shortLabel ?? v.abbreviation ?? v.label ?? v.name ?? v.value ?? null);
  return null;
}

/** "6'2\"", "6-2", "74", 74 -> inches. */
export function parseHeight(v: unknown): number | null {
  if (typeof v === 'number') return v > 0 && v < 100 ? Math.round(v) : null;
  if (typeof v !== 'string') return null;
  const m = v.match(/^\s*(\d)\s*['\-\s]\s*(\d{1,2})/);
  if (m) return Number(m[1]) * 12 + Number(m[2]);
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n < 100 ? Math.round(n) : null;
}

/** Stats arrive as { id: { value } }, { id: value }, or [{ id, value }]. */
export function parseStats(stats: unknown): Record<string, number> {
  const raw: Record<string, number> = {};
  if (Array.isArray(stats)) {
    for (const s of stats) {
      if (!isObj(s)) continue;
      const id = str(s.id ?? s.key ?? s.name);
      const val = num(s.value ?? s.rating);
      if (id && val != null) raw[norm(id)] = val;
    }
  } else if (isObj(stats)) {
    for (const [id, v] of Object.entries(stats)) {
      const val = num(v);
      if (val != null) raw[norm(id)] = val;
    }
  }
  const out: Record<string, number> = {};
  for (const [id, val] of Object.entries(raw)) {
    const key = KEY_LOOKUP[id] ?? STAT_ALIASES[id];
    if (key && !(key in out)) out[key] = Math.round(val);
  }
  if (out.routeRunning === undefined) {
    const parts = ROUTE_PARTS.map((p) => raw[p]).filter((v): v is number => v != null);
    if (parts.length) out.routeRunning = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  }
  if (out.runBlock === undefined && raw.runblockpower != null && raw.runblockfinesse != null) {
    out.runBlock = Math.round((raw.runblockpower + raw.runblockfinesse) / 2);
  }
  if (out.passBlock === undefined && raw.passblockpower != null && raw.passblockfinesse != null) {
    out.passBlock = Math.round((raw.passblockpower + raw.passblockfinesse) / 2);
  }
  return out;
}

/** Find the list of player items in whatever envelope the payload uses. */
export function extractItems(payload: unknown): Json[] {
  if (Array.isArray(payload)) {
    // Either a list of items, or a list of pages ({ items }).
    if (payload.every((p) => isObj(p) && Array.isArray(p.items))) return payload.flatMap((p) => extractItems(p));
    return payload.filter(isObj);
  }
  if (!isObj(payload)) return [];
  for (const k of ['items', 'players', 'results', 'data', 'ratings']) {
    const v = payload[k];
    if (Array.isArray(v)) return extractItems(v);
    if (isObj(v)) { const inner = extractItems(v); if (inner.length) return inner; }
  }
  return [];
}

/** Normalize one EA item. Returns null when the item lacks a name, position or overall. */
export function parseItem(item: Json): FeedPlayer | null {
  const first = str(item.firstName) ?? '';
  const last = str(item.lastName) ?? '';
  const fullName = (str(item.fullName) ?? str(item.name) ?? `${first} ${last}`).replace(/\s+/g, ' ').trim();
  const position = str(item.position ?? item.positionShort ?? item.pos)?.toUpperCase() ?? null;
  const overall = num(item.overallRating ?? item.overall ?? item.ovr);
  if (!fullName || !position || overall == null) return null;
  const [f, ...rest] = fullName.split(' ');
  const slug = slugify(fullName);
  const id = str(item.id ?? item.playerId ?? item.maddenId);
  const team = item.team;
  const teamLabel = isObj(team) ? str(team.label ?? team.name ?? team.abbreviation) : str(team ?? item.teamName ?? item.teamLabel);
  const archetype = str(isObj(item.archetype) ? item.archetype.label : item.archetype);
  return {
    maddenId: id ? `ea-${id}` : `ea-${slug}-${slugify(teamLabel ?? 'fa')}`,
    fullName,
    firstName: first || f,
    lastName: last || rest.join(' ') || f,
    slug,
    position,
    teamLabel,
    overallRating: Math.round(overall),
    attributes: parseStats(item.stats ?? item.attributes ?? item.ratings),
    archetype,
    heightInches: parseHeight(item.height),
    weightLbs: num(item.weight),
    college: str(item.college),
    jerseyNumber: num(item.jerseyNum ?? item.jerseyNumber ?? item.jersey),
    age: num(item.age),
    yearsPro: num(item.yearsPro ?? item.experience),
    imageUrl: str(item.avatarUrl ?? item.headshotUrl ?? item.imageUrl),
  };
}

/** Pure: raw feed payload (single page, array of pages, or array of items) -> normalized players. */
export function parseRatings(payload: unknown): FeedPlayer[] {
  const out: FeedPlayer[] = [];
  const seen = new Set<string>();
  for (const item of extractItems(payload)) {
    const p = parseItem(item);
    if (!p || seen.has(p.maddenId)) continue;
    seen.add(p.maddenId);
    out.push(p);
  }
  return out;
}
