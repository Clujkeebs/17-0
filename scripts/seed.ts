/**
 * Idempotent seed. Safe to re-run: teams/coaches upsert by slug, players upsert by slug but never
 * overwrite a row that the live ratings sync has already claimed, configs and ad slots only insert
 * when absent.   Usage: npx tsx scripts/seed.ts
 */
import { and, eq, inArray, sql as dsql } from 'drizzle-orm';
import { db, schema, sql } from '../src/db';
import { slugify } from '../src/lib/site';
import { coachImpact, DEFAULT_FORMULAS } from '../src/lib/game/formulas';
import { SLOT_WEIGHTS } from '../src/lib/game/seventeen';
import { TEAMS } from '../data/seed/teams';
import { COACHES } from '../data/seed/coaches';
import { PLAYERS } from '../data/seed/players';
import { generateAttributes } from '../data/seed/attributes';

const SEED_VERSION = 'seed-2027';
const espnHeadshot = (id: string) => `https://a.espncdn.com/i/headshots/nfl/players/full/${id}.png`;

function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  const suffixes = new Set(['Jr.', 'Sr.', 'II', 'III', 'IV', 'V']);
  const first = parts[0];
  const rest = parts.slice(1);
  const last = rest.filter((p) => !suffixes.has(p)).join(' ') || rest.join(' ') || first;
  return { firstName: first, lastName: last };
}

async function seedTeams() {
  for (const t of TEAMS) {
    const values = {
      slug: t.slug, name: t.name, abbreviation: t.abbreviation, city: t.city, conference: t.conference,
      division: t.division, logoUrl: t.logoUrl, primaryColor: t.primaryColor,
    };
    await db.insert(schema.teams).values(values).onConflictDoUpdate({ target: schema.teams.slug, set: values });
  }
  const rows = await db.select({ id: schema.teams.id, abbreviation: schema.teams.abbreviation }).from(schema.teams);
  return new Map(rows.map((r) => [r.abbreviation, r.id]));
}

async function seedPlayers(teamIds: Map<string, number>) {
  const seen = new Set<string>();
  let upserted = 0;
  for (const p of PLAYERS) {
    const slug = slugify(p.fullName);
    if (seen.has(slug)) { console.warn(`[seed] duplicate slug skipped: ${slug}`); continue; }
    seen.add(slug);
    const teamId = p.team ? teamIds.get(p.team) ?? null : null;
    if (p.team && teamId == null) throw new Error(`Unknown team ${p.team} for ${p.fullName}`);
    const { firstName, lastName } = splitName(p.fullName);
    const values = {
      maddenId: `seed-${slug}`, slug, espnId: p.espnId ?? null, fullName: p.fullName, firstName, lastName,
      position: p.position, teamId, heightInches: p.heightInches, weightLbs: p.weightLbs, college: p.college,
      jerseyNumber: p.jerseyNumber, age: p.age, yearsPro: p.yearsPro, overallRating: p.overall,
      attributes: generateAttributes(p.position, p.overall, p.fullName), archetype: p.archetype,
      imageUrl: p.espnId ? espnHeadshot(p.espnId) : null, isActive: true, isAllTimeGreat: !!p.isAllTimeGreat,
      maddenVersion: SEED_VERSION,
    };
    const { maddenId: _m, slug: _s, ...updatable } = values;
    const res = await db.insert(schema.players).values(values).onConflictDoUpdate({
      target: schema.players.slug,
      set: updatable,
      // Rows claimed by a real sync keep their feed data.
      setWhere: eq(schema.players.maddenVersion, SEED_VERSION),
    }).returning({ id: schema.players.id });
    if (res[0]) upserted++;
  }

  // One history row per seed player, only if that player has none for the seed version yet.
  const seedRows = await db.select({ id: schema.players.id, overallRating: schema.players.overallRating, attributes: schema.players.attributes })
    .from(schema.players).where(eq(schema.players.maddenVersion, SEED_VERSION));
  const existing = await db.select({ playerId: schema.maddenRatingsHistory.playerId }).from(schema.maddenRatingsHistory)
    .where(eq(schema.maddenRatingsHistory.maddenVersion, SEED_VERSION));
  const has = new Set(existing.map((r) => r.playerId));
  const missing = seedRows.filter((r) => !has.has(r.id));
  for (let i = 0; i < missing.length; i += 200) {
    await db.insert(schema.maddenRatingsHistory).values(missing.slice(i, i + 200).map((r) => ({
      playerId: r.id, maddenVersion: SEED_VERSION, overallRating: r.overallRating, attributes: r.attributes,
    })));
  }
  return { upserted, historyInserted: missing.length };
}

async function seedCoaches(teamIds: Map<string, number>) {
  const avgRows = await db.select({ teamId: schema.players.teamId, avg: dsql<number>`avg(${schema.players.overallRating})::float` })
    .from(schema.players).where(eq(schema.players.isActive, true)).groupBy(schema.players.teamId);
  const avgs = new Map(avgRows.filter((r) => r.teamId != null).map((r) => [r.teamId as number, Number(r.avg)]));
  const leagueAvg = avgs.size ? [...avgs.values()].reduce((a, b) => a + b, 0) / avgs.size : 78;
  const now = new Date().toISOString();

  for (const c of COACHES) {
    const slug = slugify(c.fullName);
    const teamId = c.team ? teamIds.get(c.team) ?? null : null;
    const score = coachImpact({
      teamRosterAvgOvr: teamId != null ? avgs.get(teamId) ?? leagueAvg : leagueAvg,
      recent3yrWinPct: c.recent3yrWinPct, playoffAppearances3yr: c.playoffAppearances3yr,
      superBowlWins: c.superBowlWins, yearsWithTeam: c.yearsWithTeam,
    });
    const values = {
      slug, fullName: c.fullName, teamId, coachImpactScore: score, careerWins: c.careerWins, careerLosses: c.careerLosses,
      superBowlWins: c.superBowlWins, yearsWithTeam: c.yearsWithTeam, recent3yrWinPct: Math.round(c.recent3yrWinPct * 1000),
      playoffAppearances3yr: c.playoffAppearances3yr,
    };
    const [row] = await db.insert(schema.coaches).values({ ...values, impactHistory: [{ at: now, score }] })
      .onConflictDoUpdate({ target: schema.coaches.slug, set: values })
      .returning({ id: schema.coaches.id, impactHistory: schema.coaches.impactHistory });
    if (row && row.impactHistory.length === 0) {
      await db.update(schema.coaches).set({ impactHistory: [{ at: now, score }] }).where(eq(schema.coaches.id, row.id));
    }
  }
  return COACHES.length;
}

async function seedAds() {
  const slots = [
    { slotName: 'home-inline', minViewportWidth: 0 },
    { slotName: 'result-sidebar', minViewportWidth: 1024 },
    { slotName: 'result-inline', minViewportWidth: 0 },
    { slotName: 'player-inline', minViewportWidth: 0 },
  ];
  await db.insert(schema.adPlacements).values(slots.map((s) => ({ ...s, enabled: false }))).onConflictDoNothing({ target: schema.adPlacements.slotName });
}

async function seedConfigs() {
  const defaults = [
    { gameType: 'global', configKey: 'formulas', configValue: DEFAULT_FORMULAS },
    { gameType: '17-0', configKey: 'slot_weights', configValue: SLOT_WEIGHTS },
  ];
  let inserted = 0;
  for (const d of defaults) {
    const [exists] = await db.select({ id: schema.gameConfigs.id }).from(schema.gameConfigs)
      .where(and(eq(schema.gameConfigs.gameType, d.gameType), eq(schema.gameConfigs.configKey, d.configKey))).limit(1);
    if (!exists) { await db.insert(schema.gameConfigs).values({ ...d, version: 1, updatedBy: 'seed' }); inserted++; }
  }
  return inserted;
}

async function main() {
  const t0 = Date.now();
  const teamIds = await seedTeams();
  const players = await seedPlayers(teamIds);
  const coaches = await seedCoaches(teamIds);
  await seedAds();
  const configs = await seedConfigs();
  const [{ n }] = await db.select({ n: dsql<number>`count(*)::int` }).from(schema.players)
    .where(inArray(schema.players.maddenVersion, [SEED_VERSION]));
  console.log(`[seed] teams=${teamIds.size} players=${players.upserted} (seed rows=${n}, history+${players.historyInserted}) coaches=${coaches} configs+${configs} in ${Date.now() - t0}ms`);
}

main()
  .then(async () => { await sql.end({ timeout: 5 }); process.exit(0); })
  .catch(async (e) => { console.error('[seed] failed', e); await sql.end({ timeout: 5 }).catch(() => {}); process.exit(1); });
