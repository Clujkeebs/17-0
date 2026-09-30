import { and, eq, ne } from 'drizzle-orm';
import { db, schema } from '@/db';
import { slugify } from '@/lib/site';

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, '').replace(/[^a-z]/g, '');

interface EspnAthlete { id: string; fullName: string; headshot?: { href?: string } }
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
  const espnIndex = new Map<string, { teamId: number; a: EspnAthlete }>();
  let coachesChanged = 0, coachesSeen = 0;
  for (const t of teams) {
    const code = t.logoUrl?.match(/\/nfl\/500\/([a-z]+)\.png/)?.[1] ?? t.abbreviation.toLowerCase();
    try {
      const res = await fetchImpl(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${code}/roster`, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) { console.warn(`[espn] ${code} ${res.status}`); continue; }
      const body = (await res.json()) as { athletes?: { items?: EspnAthlete[] }[]; coach?: EspnCoach[] };
      for (const a of (body.athletes ?? []).flatMap((g) => g.items ?? [])) espnIndex.set(norm(a.fullName), { teamId: t.id, a });
      const hc = body.coach?.[0];
      if (hc) coachesSeen++;
      if (hc) coachesChanged += await setHeadCoach(t.id, `${hc.firstName} ${hc.lastName}`.trim(), hc.experience);
    } catch (e) { console.warn(`[espn] ${code} failed`, (e as Error).message); }
  }
  if (espnIndex.size < 1000) { console.warn(`[espn] only ${espnIndex.size} athletes indexed; skipping roster moves`); }
  const players = await db.select({ id: schema.players.id, fullName: schema.players.fullName, teamId: schema.players.teamId, imageUrl: schema.players.imageUrl })
    .from(schema.players).where(eq(schema.players.isActive, true));
  let matched = 0, moved = 0;
  for (const p of players) {
    const hit = espnIndex.get(norm(p.fullName));
    if (!hit) continue;
    matched++;
    const set: Partial<typeof schema.players.$inferInsert> = { espnId: hit.a.id };
    if (!p.imageUrl) set.imageUrl = hit.a.headshot?.href ?? `https://a.espncdn.com/i/headshots/nfl/players/full/${hit.a.id}.png`;
    if (espnIndex.size >= 1000 && p.teamId !== hit.teamId) { set.teamId = hit.teamId; moved++; }
    await db.update(schema.players).set(set).where(eq(schema.players.id, p.id));
  }
  console.log(`[espn] matched ${matched}/${players.length}, moved ${moved} to current teams, head coaches seen ${coachesSeen}, changed ${coachesChanged}`);
  return { matched, moved, coachesChanged };
}

async function setHeadCoach(teamId: number, fullName: string, experience?: number): Promise<number> {
  const slug = slugify(fullName);
  const [current] = await db.select().from(schema.coaches).where(eq(schema.coaches.teamId, teamId)).limit(1);
  if (current?.slug === slug) return 0;
  await db.update(schema.coaches).set({ teamId: null }).where(and(eq(schema.coaches.teamId, teamId), ne(schema.coaches.slug, slug)));
  const [existing] = await db.select().from(schema.coaches).where(eq(schema.coaches.slug, slug)).limit(1);
  if (existing) await db.update(schema.coaches).set({ teamId, yearsWithTeam: existing.teamId === teamId ? existing.yearsWithTeam : 0 }).where(eq(schema.coaches.id, existing.id));
  else await db.insert(schema.coaches).values({ slug, fullName, teamId, yearsWithTeam: Math.max(0, Math.min(experience ?? 0, 1)), coachImpactScore: 65 });
  return 1;
}
