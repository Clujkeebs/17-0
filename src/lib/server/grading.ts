import { and, eq, inArray, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { getFormulas, getSlotWeights } from './config';
import { loadSession, type SpinPayload } from './games';
import { positionGroup, type Attributes } from '@/lib/game/attributes';
import { SLOTS, gradeRoster, slotAccepts, type Pick, type Slot } from '@/lib/game/seventeen';
import { BUILD_CATEGORIES, BUILD_ELIGIBLE, gradeBuild, type BuildChoices } from '@/lib/game/build';

export class GradeError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

interface Ctx { sessionId: string; token: string; userId?: string | null; username?: string | null }

async function openSession(ctx: Ctx, gameType: string) {
  const s = await loadSession(ctx.sessionId, ctx.token);
  if (!s || s.gameType !== gameType) throw new GradeError('Session not found. Spin again.', 403);
  if (s.completed) throw new GradeError('This roster was already graded.', 409);
  if (s.expiresAt < new Date()) throw new GradeError('Session expired. Spin again.', 410);
  return s;
}

async function saveResult(s: { id: string; isDaily: boolean; dailyDate: string | null }, ctx: Ctx, gameType: string, resultData: unknown, score: number, perfect: boolean) {
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

export async function gradeSeventeen(ctx: Ctx, picks: { slot: Slot; id: string }[]) {
  const s = await openSession(ctx, '17-0');
  const payload = s.spinPayload as SpinPayload;
  if (picks.length !== 6 || new Set(picks.map((p) => p.slot)).size !== 6 || !SLOTS.every((sl) => picks.some((p) => p.slot === sl))) {
    throw new GradeError('Fill all six slots.');
  }
  const playerIds = picks.filter((p) => !p.id.startsWith('coach:')).map((p) => p.id);
  const coachIds = picks.filter((p) => p.id.startsWith('coach:')).map((p) => Number(p.id.slice(6)));
  if (playerIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id)) || coachIds.some((n) => !Number.isInteger(n))) throw new GradeError('Invalid pick.');
  const [players, coaches, formulas, weights] = await Promise.all([
    playerIds.length ? db.select().from(schema.players).where(inArray(schema.players.id, playerIds)) : [],
    coachIds.length ? db.select().from(schema.coaches).where(inArray(schema.coaches.id, coachIds)) : [],
    getFormulas(), getSlotWeights(),
  ]);
  const usedTeams = new Set<number>();
  const full: Pick[] = picks.map((p) => {
    if (p.id.startsWith('coach:')) {
      const c = coaches.find((x) => x.id === Number(p.id.slice(6)));
      if (!c || c.teamId === null) throw new GradeError('Unknown coach.');
      return { slot: p.slot, teamId: c.teamId, name: c.fullName, group: 'HC' as const, coachImpact: c.coachImpactScore };
    }
    const pl = players.find((x) => x.id === p.id);
    if (!pl || pl.teamId === null) throw new GradeError('Unknown player.');
    return { slot: p.slot, teamId: pl.teamId, name: pl.fullName, group: positionGroup(pl.position), attributes: pl.attributes as Attributes, overall: pl.overallRating };
  });
  for (const p of full) {
    if (!payload.teams.includes(p.teamId)) throw new GradeError(`${p.name} is not on one of your spun teams.`);
    if (usedTeams.has(p.teamId)) throw new GradeError('One pick per team.');
    usedTeams.add(p.teamId);
    if (!slotAccepts(p.slot, p.group)) throw new GradeError(`${p.name} cannot play ${p.slot}.`);
  }
  // Daily results must be identical for identical rosters, so seed from the date plus the roster.
  const seed = s.isDaily ? `${s.seed}:${[...playerIds, ...coachIds].sort().join(',')}` : s.id;
  const result = gradeRoster(seed, full, formulas, weights);
  const resultData = { ...result, picks: full.map(({ slot, name, teamId, group, overall }) => ({ slot, name, teamId, group, overall })) };
  const id = await saveResult(s, ctx, '17-0', resultData, result.score, result.wins === 17);
  return { id, result: resultData, daily: s.isDaily };
}

export async function gradeBuildAPlayer(ctx: Ctx, playerIds: string[], choices: BuildChoices) {
  const s = await openSession(ctx, 'build-a-player');
  const payload = s.spinPayload as SpinPayload;
  const position = payload.position!;
  if (playerIds.length !== payload.teams.length || playerIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) throw new GradeError('Pick one player from each team.');
  const rows = await db.select().from(schema.players).where(inArray(schema.players.id, playerIds));
  const sources = playerIds.map((id) => {
    const p = rows.find((r) => r.id === id);
    if (!p || p.teamId === null) throw new GradeError('Unknown player.');
    if (!payload.teams.includes(p.teamId)) throw new GradeError(`${p.fullName} is not on one of your spun teams.`);
    if (!BUILD_ELIGIBLE[position].includes(positionGroup(p.position))) throw new GradeError(`${p.fullName} does not play ${position}.`);
    return { name: p.fullName, teamId: p.teamId, attributes: p.attributes as Attributes };
  });
  if (new Set(sources.map((x) => x.teamId)).size !== sources.length) throw new GradeError('One player per team.');
  for (const cat of BUILD_CATEGORIES[position]) {
    const idx = choices[cat];
    if (idx === undefined || !Number.isInteger(idx) || idx < 0 || idx >= sources.length) throw new GradeError('Choose a source for every attribute.');
  }
  const seed = s.isDaily ? `${s.seed}:${JSON.stringify(choices)}:${playerIds.join(',')}` : s.id;
  const result = gradeBuild(position, sources, choices, seed);
  const resultData = {
    position, ...result,
    sources: sources.map((x) => ({ name: x.name, teamId: x.teamId })),
    choices,
  };
  const id = await saveResult(s, ctx, 'build-a-player', resultData, result.score, result.rating >= 97);
  return { id, result: resultData, daily: s.isDaily };
}
