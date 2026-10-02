import { and, eq, isNull, ne } from 'drizzle-orm';
import { db, schema } from '@/db';
import { slugify } from '@/lib/site';
import { lastNameKey, pickEspnMatch, pickLeagueNamesake, pickSameTeamNamesake, positionFamily, type EspnCandidate } from './espn-match';

const MAX_RELEASES = 100;

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, '').replace(/[^a-z]/g, '');

interface EspnAthlete { id: string; fullName: string; headshot?: { href?: string }; position?: { abbreviation?: string }; jersey?: string }
interface EspnCoach { id: string; firstName: string; lastName: string; experience?: number }

/**
 * Keeps rosters current week to week using ESPN's public team rosters:
 * - moves players to the team ESPN lists them on (trades, signings, releases between EA rating updates),
 * - fills ESPN ids and headshots,
 * - updates each team's head coach.
 * Safe to re-run. Players ESPN does not list keep their EA team.
 */
export async function backfillEspnHeadshots(fetchImpl: typeof fetch = fetch) {
  const teams = await db.select().from(schema.teams);
  // Name -> every ESPN athlete with that name. Names repeat across the league (two DeVonta Smiths), so never key on name alone.
  const espnIndex = new Map<string, (EspnCandidate & { a: EspnAthlete })[]>();
  let athletes = 0;
  let coachesChanged = 0, coachesSeen = 0;
  for (const t of teams) {
    const code = t.logoUrl?.match(/\/nfl\/500\/([a-z]+)\.png/)?.[1] ?? t.abbreviation.toLowerCase();
    try {
      const res = await fetchImpl(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${code}/roster`, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) { console.warn(`[espn] ${code} ${res.status}`); continue; }
      const body = (await res.json()) as { athletes?: { items?: EspnAthlete[] }[]; coach?: EspnCoach[] };
      for (const a of (body.athletes ?? []).flatMap((g) => g.items ?? [])) {
        const key = norm(a.fullName);
        const list = espnIndex.get(key) ?? [];
        list.push({ id: a.id, teamId: t.id, family: positionFamily(a.position?.abbreviation), a });
        espnIndex.set(key, list); athletes++;
      }
      const hc = body.coach?.[0];
      if (hc) coachesSeen++;
      if (hc) {
        coachesChanged += await setHeadCoach(t.id, `${hc.firstName} ${hc.lastName}`.trim(), hc.experience);
        const img = await coachHeadshot(hc.id, fetchImpl);
        if (img) await db.update(schema.coaches).set({ imageUrl: img }).where(eq(schema.coaches.teamId, t.id));
      }
    } catch (e) { console.warn(`[espn] ${code} failed`, (e as Error).message); }
  }
  if (athletes < 1000) { console.warn(`[espn] only ${athletes} athletes indexed; skipping roster moves`); }
  const players = await db.select({ id: schema.players.id, fullName: schema.players.fullName, position: schema.players.position, teamId: schema.players.teamId, espnId: schema.players.espnId, imageUrl: schema.players.imageUrl, legend: schema.players.isAllTimeGreat, version: schema.players.maddenVersion })
    .from(schema.players).where(eq(schema.players.isActive, true));
  const abbr = new Map(teams.map((t) => [t.id, t.abbreviation]));
  // Second chance for spelling differences (Cam vs Cameron Heyward): last name, by team and league-wide.
  const byTeamLast = new Map<string, (EspnCandidate & { a: EspnAthlete })[]>();
  const byLast = new Map<string, (EspnCandidate & { a: EspnAthlete })[]>();
  for (const list of espnIndex.values()) for (const c of list) {
    const last = lastNameKey(c.a.fullName), k = `${c.teamId}:${last}`;
    byTeamLast.set(k, [...(byTeamLast.get(k) ?? []), c]);
    byLast.set(last, [...(byLast.get(last) ?? []), c]);
  }
  // Each ESPN athlete is one person, so the first row to claim him wins. Rows with real EA ratings go first;
  // seed placeholders only get what is left, and one that finds its player taken is a duplicate.
  const isPlaceholder = (p: (typeof players)[number]) => !!p.version?.startsWith('seed-');
  const claimed = new Set<string>();
  const free = <C extends { id: string }>(list: C[]) => list.filter((c) => !claimed.has(c.id));
  const hits = new Map<string, EspnCandidate & { a: EspnAthlete }>();
  const fuzzyNames: string[] = [];
  for (const placeholders of [false, true]) {
    const group = players.filter((p) => isPlaceholder(p) === placeholders);
    for (const p of group) {
      const cands = espnIndex.get(norm(p.fullName));
      const hit = cands ? pickEspnMatch(p, free(cands)) : null;
      if (hit) { claimed.add(hit.id); hits.set(p.id, hit); }
    }
    for (const p of group) {
      if (hits.has(p.id) || espnIndex.has(norm(p.fullName)) || p.legend) continue;
      const last = lastNameKey(p.fullName);
      const hit = p.teamId != null
        ? pickSameTeamNamesake(p, free(byTeamLast.get(`${p.teamId}:${last}`) ?? []))
        : pickLeagueNamesake(p, free(byLast.get(last) ?? []));
      if (hit) { claimed.add(hit.id); hits.set(p.id, hit); fuzzyNames.push(`${p.fullName} = ${hit.a.fullName} (${abbr.get(hit.teamId)})`); }
    }
  }
  const movedNames: string[] = [], clashNames: string[] = [], released: { id: string; label: string; placeholder: boolean }[] = [];
  let matched = 0, moved = 0, ambiguous = 0;
  for (const p of players) {
    const cands = espnIndex.get(norm(p.fullName));
    const hit = hits.get(p.id);
    if (!hit) {
      const label = `${p.fullName} (${p.position}, ${abbr.get(p.teamId ?? -1) ?? 'FA'})`;
      if (cands && isPlaceholder(p) && !p.legend && free(cands).length === 0) released.push({ id: p.id, label: `${label}, duplicate`, placeholder: true });
      else if (cands) { ambiguous++; clashNames.push(`${p.fullName} (${p.position}): ESPN has ${cands.map((c) => `${c.a.position?.abbreviation ?? '?'} ${abbr.get(c.teamId)}`).join(', ')}`); }
      else if (!p.legend && (p.teamId != null || isPlaceholder(p))) released.push({ id: p.id, label, placeholder: isPlaceholder(p) });
      continue;
    }
    matched++;
    const set: Partial<typeof schema.players.$inferInsert> = { espnId: hit.a.id };
    // ESPN has the number a player wears now, which changes with trades; EA's can be a season old.
    const jersey = Number(hit.a.jersey);
    if (hit.a.jersey && Number.isInteger(jersey) && jersey >= 0 && jersey <= 99) set.jerseyNumber = jersey;
    // A changed ESPN id means the old one belonged to someone else (a namesake), so its headshot goes too.
    if (!p.imageUrl || (p.espnId && p.espnId !== hit.a.id)) set.imageUrl = hit.a.headshot?.href ?? `https://a.espncdn.com/i/headshots/nfl/players/full/${hit.a.id}.png`;
    if (athletes >= 1000 && p.teamId !== hit.teamId) { set.teamId = hit.teamId; moved++; movedNames.push(`${p.fullName} (${p.position}) ${abbr.get(p.teamId ?? -1) ?? 'FA'} -> ${abbr.get(hit.teamId)}`); }
    await db.update(schema.players).set(set).where(eq(schema.players.id, p.id));
  }
  // Current players on no ESPN roster (IR included) were cut, retired or are unsigned: they become free agents,
  // so 17-0 stops offering them for their old team. A huge count means ESPN returned bad data, so do nothing.
  const releasing = athletes >= 1000 && released.length <= MAX_RELEASES;
  // Placeholder rows from the seed file (never confirmed by the EA feed) are usually a second spelling of a real
  // player (Cam / Cameron Heyward) with generated ratings, so they are retired rather than kept as free agents.
  if (releasing) for (const r of released) await db.update(schema.players).set(r.placeholder ? { teamId: null, isActive: false } : { teamId: null }).where(eq(schema.players.id, r.id));
  else if (released.length) console.warn(`[espn] ${released.length} players on no ESPN roster; over the ${MAX_RELEASES} limit or roster data too thin, so none released`);
  // Players ESPN rosters don't list by the same name (suffixes, nicknames): try ESPN search.
  let searched = 0;
  const missing = await db.select({ id: schema.players.id, fullName: schema.players.fullName }).from(schema.players)
    .where(and(eq(schema.players.isActive, true), isNull(schema.players.imageUrl)));
  for (const p of missing.slice(0, 400)) {
    const hit = await searchEspnAthlete(p.fullName, fetchImpl);
    if (hit) { await db.update(schema.players).set({ espnId: hit, imageUrl: `https://a.espncdn.com/i/headshots/nfl/players/full/${hit}.png` }).where(eq(schema.players.id, p.id)); searched++; }
  }
  // Full roster audit, readable in the worker's deploy logs. Player names are public, so this logs no PII.
  const faNames = released.filter((r) => !r.placeholder).map((r) => r.label);
  const retiredNames = released.filter((r) => r.placeholder).map((r) => r.label);
  for (const [label, list] of [['moved', movedNames], ['matched by last name', fuzzyNames], ['name clash, left alone', clashNames],
    [releasing ? 'on no ESPN roster, now free agents' : 'on no ESPN roster, kept EA team', faNames],
    [releasing ? 'placeholder rows retired' : 'placeholder rows on no ESPN roster, kept', retiredNames]] as const) {
    for (let i = 0; i < list.length; i += 25) console.log(`[espn] ${label} (${list.length}): ${list.slice(i, i + 25).join('; ')}`);
  }
  console.log(`[espn] search filled ${searched}/${missing.length} missing headshots`);
  console.log(`[espn] matched ${matched}/${players.length}, moved ${moved} to current teams, skipped ${ambiguous} name clashes, ${releasing ? 'released' : 'kept'} ${released.length} not on a roster, head coaches seen ${coachesSeen}, changed ${coachesChanged}`);
  return { matched, moved, coachesChanged };
}

async function setHeadCoach(teamId: number, fullName: string, experience?: number): Promise<number> {
  const slug = slugify(fullName);
  const [current] = await db.select().from(schema.coaches).where(eq(schema.coaches.teamId, teamId)).limit(1);
  if (current?.slug === slug) return 0;
  await db.update(schema.coaches).set({ teamId: null }).where(and(eq(schema.coaches.teamId, teamId), ne(schema.coaches.slug, slug)));
  const [existing] = await db.select().from(schema.coaches).where(eq(schema.coaches.slug, slug)).limit(1);
  if (existing) await db.update(schema.coaches).set({ teamId, yearsWithTeam: existing.teamId === teamId ? existing.yearsWithTeam : 0 }).where(eq(schema.coaches.id, existing.id));
  else await db.insert(schema.coaches).values({ slug, fullName, teamId, yearsWithTeam: Math.max(0, Math.min(experience ?? 0, 1)), coachImpactScore: 85 });
  return 1;
}

async function urlOk(url: string, fetchImpl: typeof fetch) {
  try { const r = await fetchImpl(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) }); return r.ok; } catch { return false; }
}

/** ESPN coach headshot: core API record first, then the CDN path convention. */
async function coachHeadshot(id: string, fetchImpl: typeof fetch): Promise<string | null> {
  try {
    const r = await fetchImpl(`https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/coaches/${id}`, { signal: AbortSignal.timeout(8000) });
    if (r.ok) { const b = (await r.json()) as { headshot?: { href?: string } }; if (b.headshot?.href) return b.headshot.href; }
  } catch { /* fall through */ }
  const cdn = `https://a.espncdn.com/i/headshots/nfl/coaches/full/${id}.png`;
  return (await urlOk(cdn, fetchImpl)) ? cdn : null;
}

/** ESPN site search for an NFL athlete by name; returns the athlete id when a headshot exists. */
async function searchEspnAthlete(name: string, fetchImpl: typeof fetch): Promise<string | null> {
  try {
    const r = await fetchImpl(`https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(name)}&limit=5&type=player`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const b = (await r.json()) as { items?: { id?: string; league?: string; sport?: string; displayName?: string }[] };
    const it = b.items?.find((x) => (x.league ?? '').toLowerCase() === 'nfl' || /nfl/i.test(String(x.league ?? x.sport ?? '')));
    if (!it?.id) return null;
    return (await urlOk(`https://a.espncdn.com/i/headshots/nfl/players/full/${it.id}.png`, fetchImpl)) ? it.id : null;
  } catch { return null; }
}
