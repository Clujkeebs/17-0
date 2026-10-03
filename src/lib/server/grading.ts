import { and, eq, inArray, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { getFormulas, getSlotWeights } from './config';
import { invalidatePrefix } from './redis';
import { earnForResult } from './points';
import { recordEntry } from './challenges';
import { loadSession, type SpinPayload } from './games';
import { positionGroup, type Attributes, type PositionGroup } from '@/lib/game/attributes';
import { FORMATS, gradeRoster, isFantasy, slotAccepts, type Pick } from '@/lib/game/seventeen';
import { fantasyValue } from '@/lib/game/fantasy';
import { getAllTimeFloor, getFantasyFloor } from './calibrate';
import { LEGEND_FRANCHISE } from '@/lib/game/legends';
import { BUILD_ELIGIBLE, TRAITS, bestPossible, gradeTraitBuild, traitValue } from '@/lib/game/build';

export class GradeError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

export interface Ctx { sessionId: string; token: string; userId?: string | null; username?: string | null }

async function openSession(ctx: Ctx, gameType: string) {
  const s = await loadSession(ctx.sessionId, ctx.token);
  if (!s || s.gameType !== gameType) throw new GradeError('Session not found. Spin again.', 403);
  if (s.completed) throw new GradeError('This roster was already graded.', 409);
  if (s.expiresAt < new Date()) throw new GradeError('Session expired. Spin again.', 410);
  return s;
}

export async function saveResult(...args: Parameters<typeof saveResultTx>) {
  const id = await saveResultTx(...args);
  const [s, ctx, gameType, , score, perfect] = args;
  // A challenge game joins its challenge's board (and may pay a head-to-head win). Never blocks the result.
  const challengeId = (s.spinPayload as { challengeId?: unknown } | undefined)?.challengeId;
  if (typeof challengeId === 'string') await recordEntry(challengeId, id, score, ctx.userId, ctx.username).catch((e) => console.warn('[challenge] entry failed', (e as Error).message));
  // Signed-in results change the leaderboards; clear their cache so the player sees themselves immediately.
  if (ctx.userId) await Promise.all([s.isDaily ? invalidatePrefix(`lb:daily:${gameType}:`) : null, s.isDaily ? invalidatePrefix(`lb:week:${gameType}:`) : null, invalidatePrefix('lb:all:')]).catch(() => {});
  // Points never block a result: a failed grant is logged and the game still saves.
  if (ctx.userId) await earnForResult(ctx.userId, gameType, s.isDaily, perfect, id).catch((e) => console.warn('[points] earn failed', (e as Error).message));
  return id;
}

async function saveResultTx(s: { id: string; isDaily: boolean; dailyDate: string | null; spinPayload?: unknown }, ctx: Ctx, gameType: string, resultData: unknown, score: number, perfect: boolean) {
  return db.transaction(async (tx) => {
    const done = await tx.update(schema.gameSessions).set({ completed: true })
      .where(and(eq(schema.gameSessions.id, s.id), eq(schema.gameSessions.completed, false))).returning({ id: schema.gameSessions.id });
    if (!done.length) throw new GradeError('This roster was already graded.', 409);
    let flagged = false;
    if (ctx.userId && perfect) {
      const [st] = await tx.select({
        n: dsql<number>`count(*)::int`,
        perfect: dsql<number>`count(*) filter (where (result_data->>'wins')::int = 17 or (result_data->>'rating')::float >= 97)::int`,
      }).from(schema.gameResults).where(eq(schema.gameResults.userId, ctx.userId));
      flagged = st.n >= 9 && (st.perfect + 1) / (st.n + 1) > 0.9;
    }
    const [row] = await tx.insert(schema.gameResults).values({
      sessionId: s.id, userId: ctx.userId ?? null, username: ctx.username ?? null, gameType,
      isDaily: s.isDaily, dailyDate: s.dailyDate, resultData: resultData as object, score, flagged,
    }).returning({ id: schema.gameResults.id });
    return row.id;
  });
}

export async function gradeSeventeen(ctx: Ctx) {
  const s = await openSession(ctx, '17-0');
  const payload = s.spinPayload as SpinPayload;
  const format = payload.format ?? '6', pool = payload.pool ?? 'current';
  const slotKeys = FORMATS[format].slots.map((d) => d.key);
  const picks = (payload.picks ?? []).map((x) => ({ slot: x.slot ?? '', id: x.id, teamId: x.teamId }));
  if (picks.length !== slotKeys.length || new Set(picks.map((p) => p.slot)).size !== slotKeys.length || !slotKeys.every((sl) => picks.some((p) => p.slot === sl))) {
    throw new GradeError(`Fill all ${slotKeys.length} slots.`);
  }
  const playerIds = picks.filter((p) => !p.id.startsWith('coach:')).map((p) => p.id);
  const coachIds = picks.filter((p) => p.id.startsWith('coach:')).map((p) => Number(p.id.slice(6)));
  if (playerIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id)) || coachIds.some((n) => !Number.isInteger(n))) throw new GradeError('Invalid pick.');
  const teamRows = await db.select({ id: schema.teams.id, abbr: schema.teams.abbreviation }).from(schema.teams);
  const [players, coaches, formulas, weights, hist] = await Promise.all([
    playerIds.length ? db.select().from(schema.players).where(inArray(schema.players.id, playerIds)) : [],
    coachIds.length ? db.select().from(schema.coaches).where(inArray(schema.coaches.id, coachIds)) : [],
    getFormulas(), getSlotWeights(),
    playerIds.length && pool === 'all-time' ? db.select().from(schema.nflLegends).where(inArray(schema.nflLegends.id, playerIds)) : [],
  ]);
  const usedTeams = new Set<number>();
  const full: Pick[] = picks.map((p) => {
    if (p.id.startsWith('coach:')) {
      const c = coaches.find((x) => x.id === Number(p.id.slice(6)));
      if (!c || c.teamId === null) throw new GradeError('Unknown coach.');
      return { slot: p.slot, teamId: c.teamId, name: c.fullName, group: 'HC' as const, coachImpact: c.coachImpactScore };
    }
    const hl = hist.find((x) => x.id === p.id);
    if (hl) {
      // A history legend counts only for his franchise.
      if (hl.teamId !== p.teamId) throw new GradeError(`${hl.fullName} is not on one of your spun teams.`);
      return { slot: p.slot, teamId: hl.teamId, name: hl.fullName, group: hl.group as PositionGroup, legendGrade: hl.grade, overall: Math.round(hl.grade) };
    }
    const pl = players.find((x) => x.id === p.id);
    if (!pl) throw new GradeError('Unknown player.');
    // A legend has no current team; in All-time mode he counts for his franchise, which must be the team he was drafted from.
    let teamId = pl.teamId;
    if (pl.isAllTimeGreat) {
      const abbr = teamRows.find((t) => t.id === p.teamId)?.abbr;
      if (pool !== 'all-time' || !abbr || LEGEND_FRANCHISE[pl.slug] !== abbr) throw new GradeError(`${pl.fullName} is not on one of your spun teams.`);
      teamId = p.teamId;
    }
    if (teamId === null) throw new GradeError('Unknown player.');
    return { slot: p.slot, teamId, name: pl.fullName, group: positionGroup(pl.position), attributes: pl.attributes as Attributes, overall: pl.overallRating,
      ...(isFantasy(format) ? { fantasy: fantasyValue(pl.fantasyPpg, pl.fantasyGames, pl.fantasyProjPpg, pl.fantasyRecent) } : {}) };
  });
  for (const p of full) {
    if (!payload.teams.includes(p.teamId)) throw new GradeError(`${p.name} is not on one of your spun teams.`);
    if (usedTeams.has(p.teamId)) throw new GradeError('One pick per team.');
    usedTeams.add(p.teamId);
    if (!slotAccepts(p.slot, p.group, format)) throw new GradeError(`${p.name} cannot play ${p.slot}.`);
  }
  // Daily results must be identical for identical rosters, so seed from the date plus the roster.
  const seed = s.isDaily || payload.challengeId ? `${s.seed}:${[...playerIds, ...coachIds].sort().join(',')}` : s.id;
  const opponents = teamRows.filter((t) => !usedTeams.has(t.id)).map((t) => t.abbr);
  const floor = isFantasy(format) ? await getFantasyFloor() : pool === 'all-time' ? await getAllTimeFloor(format) : undefined;
  const result = gradeRoster(seed, full, formulas, weights, opponents, format, floor);
  const resultData = { ...result, hard: !!payload.hard, format, pool, picks: full.map(({ slot, name, teamId, group, overall, fantasy }) => ({ slot, name, teamId, group, overall, ...(fantasy !== undefined ? { fantasy } : {}) })) };
  const id = await saveResult(s, ctx, '17-0', resultData, result.score, result.wins === 17);
  return { id, result: resultData, daily: s.isDaily };
}

export async function gradeBuildAPlayer(ctx: Ctx) {
  const s = await openSession(ctx, 'build-a-player');
  const payload = s.spinPayload as SpinPayload;
  const position = payload.position!;
  const picks = payload.picks ?? [];
  if (picks.length !== payload.teams.length || picks.some((x) => !x.trait)) throw new GradeError('Fill all five traits first.');
  const rows = await db.select().from(schema.players).where(inArray(schema.players.id, picks.map((x) => x.id)));
  const traitPicks = picks.map((x) => {
    const p = rows.find((r) => r.id === x.id);
    if (!p) throw new GradeError('Unknown player.');
    const t = TRAITS[position].find((y) => y.key === x.trait)!;
    const attrs = p.attributes as Attributes;
    return { trait: t.key, value: traitValue(attrs, t), name: p.fullName, teamId: x.teamId, attributes: attrs };
  });
  const teamRosters = await db.select({ teamId: schema.players.teamId, position: schema.players.position, attributes: schema.players.attributes })
    .from(schema.players).where(and(inArray(schema.players.teamId, picks.map((x) => x.teamId)), eq(schema.players.isActive, true)));
  const eligible = BUILD_ELIGIBLE[position];
  const best = bestPossible(position, picks.map((x) => teamRosters.filter((r) => r.teamId === x.teamId && eligible.includes(positionGroup(r.position))).map((r) => r.attributes as Attributes)));
  const seed = s.isDaily ? `${s.seed}:${picks.map((x) => `${x.id}:${x.trait}`).join(',')}` : s.id;
  const result = gradeTraitBuild(position, traitPicks, best, seed);
  const resultData = { position, ...result, hard: !!payload.hard, sources: traitPicks.map((x) => ({ name: x.name, teamId: x.teamId, trait: x.trait })) };
  const id = await saveResult(s, ctx, 'build-a-player', resultData, result.score, result.rating >= 95);
  return { id, result: resultData, daily: s.isDaily };
}
