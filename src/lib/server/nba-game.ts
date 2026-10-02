import { createHash } from 'node:crypto';
import { and, eq, gte, inArray, lte, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { token as newToken } from './request';
import { getRedis } from './redis';
import { saveResult } from './grading';
import { getNbaFloor } from './nba-floor';
import { createRng } from '@/lib/game/prng';
import { dailyDateET, dailySeed } from '@/lib/game/daily';
import {
  ERAS, ERA_RESPINS, NBA_ROUNDS, NBA_SLOTS, TEAM_RESPINS, eraOf, fitMultiplier, gradeNbaRoster, naturalSlots, seasonLabel,
  type EraKey, type NbaPick, type NbaSlot,
} from '@/lib/game/eightytwo';

export const NBA_GAME = '82-0';
export class NbaError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

/** A player needs this many games with a franchise in a season to show up on its board. */
const MIN_GP = 20;

export interface NbaPayload {
  hard: boolean;
  eraRespinsUsed: number;
  teamRespinsUsed: number;
  /** The board on the clock. Decided server-side from the seed, never by the client. */
  current: { era: EraKey; teamId: number } | null;
  picks: { playerId: number; teamId: number; season: number; slot: NbaSlot; era: EraKey }[];
}

export interface NbaBoardPlayer { id: number; name: string; position: string; season: number; seasonLabel: string; value: number; ppg: number; rpg: number; apg: number; headshot: string | null; fits: NbaSlot[] }
export interface NbaTeamView { id: number; era: EraKey; eraLabel: string; name: string; location: string; abbreviation: string; color: string; logoUrl: string | null; players: NbaBoardPlayer[] }
export interface NbaState {
  sessionId: string; index: number; total: number; done: boolean; hard: boolean;
  eraRespinsLeft: number; teamRespinsLeft: number;
  team: NbaTeamView | null;
  roster: { slot: NbaSlot; pick: (NbaBoardPlayer & { teamName: string; teamColor: string; logoUrl: string | null; fit: number }) | null }[];
}

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

/* ------------------------------------------------------------------ data */

/** Franchises with a real board in each era (at least five qualifying players), cached for an hour. */
async function eraTeams(): Promise<Record<EraKey, number[]>> {
  const r = getRedis();
  const cached = await r.get('nba:era-teams').catch(() => null);
  if (cached) return JSON.parse(cached);
  const out = {} as Record<EraKey, number[]>;
  for (const e of ERAS) {
    const rows = await db.select({ teamId: schema.nbaPlayerSeasons.teamId, n: dsql<number>`count(distinct ${schema.nbaPlayerSeasons.playerId})::int` })
      .from(schema.nbaPlayerSeasons)
      .where(and(gte(schema.nbaPlayerSeasons.season, e.from), lte(schema.nbaPlayerSeasons.season, e.to), gte(schema.nbaPlayerSeasons.gp, MIN_GP)))
      .groupBy(schema.nbaPlayerSeasons.teamId);
    out[e.key] = rows.filter((x) => x.n >= 5).map((x) => x.teamId).sort((a, b) => a - b);
  }
  if (Object.values(out).every((v) => v.length)) await r.set('nba:era-teams', JSON.stringify(out), 'EX', 3600).catch(() => {});
  return out;
}

/** 82-0 opens once every era has enough franchises to spin. */
export async function nbaReady(): Promise<boolean> {
  try { const t = await eraTeams(); return ERAS.every((e) => t[e.key].length >= 10); } catch { return false; }
}

/** The franchise's identity in an era: its name and colors from its latest season in that span. */
async function teamInEra(teamId: number, era: EraKey) {
  const e = eraOf(era)!;
  const [t] = await db.select().from(schema.nbaTeamSeasons)
    .where(and(eq(schema.nbaTeamSeasons.teamId, teamId), gte(schema.nbaTeamSeasons.season, e.from), lte(schema.nbaTeamSeasons.season, e.to)))
    .orderBy(dsql`${schema.nbaTeamSeasons.season} desc`).limit(1);
  return t;
}

/** Every qualifying player for a franchise in an era, at his best season there. */
async function board(teamId: number, era: EraKey): Promise<NbaTeamView | null> {
  const e = eraOf(era)!;
  const t = await teamInEra(teamId, era);
  if (!t) return null;
  const rows = await db.select({ ps: schema.nbaPlayerSeasons, p: schema.nbaPlayers }).from(schema.nbaPlayerSeasons)
    .innerJoin(schema.nbaPlayers, eq(schema.nbaPlayers.id, schema.nbaPlayerSeasons.playerId))
    .where(and(eq(schema.nbaPlayerSeasons.teamId, teamId), gte(schema.nbaPlayerSeasons.season, e.from), lte(schema.nbaPlayerSeasons.season, e.to), gte(schema.nbaPlayerSeasons.gp, MIN_GP)));
  const best = new Map<number, (typeof rows)[number]>();
  for (const r of rows) { const b = best.get(r.p.id); if (!b || r.ps.value > b.ps.value) best.set(r.p.id, r); }
  const players = [...best.values()].sort((a, b) => b.ps.value - a.ps.value).map(({ ps, p }) => ({
    id: p.id, name: p.fullName, position: p.position, season: ps.season, seasonLabel: seasonLabel(ps.season), value: ps.value,
    ppg: ps.ppg, rpg: ps.rpg, apg: ps.apg, headshot: p.headshot, fits: naturalSlots(p.position),
  }));
  return { id: teamId, era, eraLabel: e.label, name: t.name, location: t.location, abbreviation: t.abbreviation, color: t.color ?? '#555555', logoUrl: t.logoUrl, players };
}

/* ------------------------------------------------------------------ spins */

/**
 * The board for a round is a pure function of the seed, the round and the re-spins used, so a session cannot
 * be refreshed into a better draw and everyone on Today sees the same first spin.
 */
async function draw(seed: string, round: number, p: NbaPayload, keepEra?: EraKey): Promise<{ era: EraKey; teamId: number }> {
  const teams = await eraTeams();
  const rng = createRng(`82:${seed}:${round}:${p.eraRespinsUsed}:${p.teamRespinsUsed}`);
  const used = new Set(p.picks.map((x) => x.teamId));
  const eras = ERAS.filter((e) => teams[e.key].some((t) => !used.has(t)));
  const era = keepEra ?? rng.pick(eras.map((e) => e.key));
  const open = teams[era].filter((t) => !used.has(t) && t !== (keepEra ? p.current?.teamId : -1));
  if (!open.length) throw new NbaError('No franchises left to spin. Start a new game.', 409);
  return { era, teamId: rng.pick(open) };
}

/* ------------------------------------------------------------------ state */

async function state(sessionId: string, p: NbaPayload): Promise<NbaState> {
  const index = p.picks.length, done = index >= NBA_ROUNDS;
  const team = !done && p.current ? await board(p.current.teamId, p.current.era) : null;
  const hide = <T extends { value: number; ppg: number; rpg: number; apg: number }>(x: T): T => (p.hard ? { ...x, value: -1, ppg: -1, rpg: -1, apg: -1 } : x);
  const view = team ? { ...team, players: (p.hard ? [...team.players].sort((a, b) => a.name.localeCompare(b.name)) : team.players).map(hide) } : null;
  const pickedTeams = await Promise.all(p.picks.map(async (x) => ({ x, t: await board(x.teamId, x.era) })));
  const roster = NBA_SLOTS.map((slot) => {
    const hit = pickedTeams.find(({ x }) => x.slot === slot);
    if (!hit) return { slot, pick: null };
    const pl = hit.t?.players.find((y) => y.id === hit.x.playerId);
    if (!pl || !hit.t) return { slot, pick: null };
    const fit = fitMultiplier(pl.position, slot);
    return { slot, pick: { ...hide(pl), teamName: `${hit.t.location} ${hit.t.name}`.trim(), teamColor: hit.t.color, logoUrl: hit.t.logoUrl, fit } };
  });
  return {
    sessionId, index, total: NBA_ROUNDS, done, hard: p.hard,
    eraRespinsLeft: p.hard ? 0 : ERA_RESPINS - p.eraRespinsUsed, teamRespinsLeft: p.hard ? 0 : TEAM_RESPINS - p.teamRespinsUsed,
    team: view, roster,
  };
}

async function open(sessionId: string, tok: string) {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !tok) throw new NbaError('Session not found. Start a new game.', 403);
  const [s] = await db.select().from(schema.gameSessions).where(eq(schema.gameSessions.id, sessionId)).limit(1);
  if (!s || s.gameType !== NBA_GAME || s.token !== hashToken(tok)) throw new NbaError('Session not found. Start a new game.', 403);
  if (s.completed) throw new NbaError('This game is already graded.', 409);
  if (s.expiresAt < new Date()) throw new NbaError('Session expired. Start a new game.', 410);
  return s;
}
const save = (id: string, p: NbaPayload) => db.update(schema.gameSessions).set({ spinPayload: p }).where(eq(schema.gameSessions.id, id));

export async function startNba(opts: { userId?: string | null; daily?: boolean; hard?: boolean }) {
  if (!(await nbaReady())) throw new NbaError('82-0 is still loading its history. Try again in a few minutes.', 503);
  const date = dailyDateET();
  const seed = opts.daily ? dailySeed(`${NBA_GAME}:`, date) : newToken(12);
  const p: NbaPayload = { hard: !!opts.hard, eraRespinsUsed: 0, teamRespinsUsed: 0, current: null, picks: [] };
  p.current = await draw(seed, 0, p);
  const tok = newToken();
  const [row] = await db.insert(schema.gameSessions).values({
    userId: opts.userId ?? null, gameType: NBA_GAME, seed, spinPayload: p, token: hashToken(tok),
    isDaily: !!opts.daily, dailyDate: opts.daily ? date : null, expiresAt: new Date(Date.now() + 6 * 3600_000),
  }).returning();
  return { ...(await state(row.id, p)), token: tok, daily: row.isDaily, date: row.dailyDate };
}

export async function respinNba(sessionId: string, tok: string, what: 'era' | 'team') {
  const s = await open(sessionId, tok);
  const p = s.spinPayload as NbaPayload;
  if (p.hard) throw new NbaError('Hard mode has no re-spins.');
  if (!p.current || p.picks.length >= NBA_ROUNDS) throw new NbaError('The draft is complete.');
  if (what === 'era' && p.eraRespinsUsed >= ERA_RESPINS) throw new NbaError('Your era re-spin is used.');
  if (what === 'team' && p.teamRespinsUsed >= TEAM_RESPINS) throw new NbaError('Your team re-spin is used.');
  const next: NbaPayload = { ...p, eraRespinsUsed: p.eraRespinsUsed + (what === 'era' ? 1 : 0), teamRespinsUsed: p.teamRespinsUsed + (what === 'team' ? 1 : 0) };
  next.current = await draw(s.seed, p.picks.length, next, what === 'team' ? p.current.era : undefined);
  await save(s.id, next);
  return state(s.id, next);
}

export async function pickNba(sessionId: string, tok: string, playerId: number, slot?: NbaSlot) {
  const s = await open(sessionId, tok);
  const p = s.spinPayload as NbaPayload;
  if (!p.current || p.picks.length >= NBA_ROUNDS) throw new NbaError('The draft is complete.');
  const team = await board(p.current.teamId, p.current.era);
  const pl = team?.players.find((x) => x.id === playerId);
  if (!team || !pl) throw new NbaError('That player is not on this board.');
  const taken = new Set(p.picks.map((x) => x.slot));
  const openSlots = NBA_SLOTS.filter((x) => !taken.has(x));
  // Out of position is allowed; it just costs value. Default to a natural open spot.
  const chosen = slot && openSlots.includes(slot) ? slot : pl.fits.find((x) => openSlots.includes(x)) ?? openSlots[0];
  const next: NbaPayload = { ...p, picks: [...p.picks, { playerId, teamId: team.id, season: pl.season, slot: chosen, era: p.current.era }] };
  next.current = next.picks.length < NBA_ROUNDS ? await draw(s.seed, next.picks.length, next) : null;
  await save(s.id, next);
  return state(s.id, next);
}

/** Moves a drafted player to another slot, swapping with whoever is there. Allowed until the season is played. */
export async function moveNba(sessionId: string, tok: string, from: NbaSlot, to: NbaSlot) {
  const s = await open(sessionId, tok);
  const p = s.spinPayload as NbaPayload;
  if (!p.picks.some((x) => x.slot === from)) throw new NbaError('Nobody is in that slot.');
  const next: NbaPayload = { ...p, picks: p.picks.map((x) => (x.slot === from ? { ...x, slot: to } : x.slot === to ? { ...x, slot: from } : x)) };
  await save(s.id, next);
  return state(s.id, next);
}


export async function gradeNba(ctx: { sessionId: string; token: string; userId?: string | null; username?: string | null }) {
  const s = await open(ctx.sessionId, ctx.token);
  const p = s.spinPayload as NbaPayload;
  if (p.picks.length < NBA_ROUNDS) throw new NbaError(`Fill all ${NBA_ROUNDS} spots.`);
  const ids = p.picks.map((x) => x.playerId);
  const rows = await db.select({ ps: schema.nbaPlayerSeasons, p: schema.nbaPlayers }).from(schema.nbaPlayerSeasons)
    .innerJoin(schema.nbaPlayers, eq(schema.nbaPlayers.id, schema.nbaPlayerSeasons.playerId)).where(inArray(schema.nbaPlayerSeasons.playerId, ids));
  const picks: NbaPick[] = p.picks.map((x) => {
    const r = rows.find((y) => y.p.id === x.playerId && y.ps.teamId === x.teamId && y.ps.season === x.season);
    if (!r) throw new NbaError('Unknown player.');
    return { slot: x.slot, name: r.p.fullName, position: r.p.position, teamId: x.teamId, season: x.season, value: r.ps.value };
  });
  const seed = s.isDaily ? `${s.seed}:${p.picks.map((x) => `${x.playerId}@${x.slot}`).sort().join(',')}` : s.id;
  const result = gradeNbaRoster(seed, picks, await getNbaFloor());
  const teams = await Promise.all(p.picks.map((x) => teamInEra(x.teamId, x.era)));
  const resultData = { ...result, hard: p.hard, edition: 'classic', teams: p.picks.map((x, i) => ({ slot: x.slot, team: teams[i] ? `${teams[i]!.location} ${teams[i]!.name}`.trim() : '', abbr: teams[i]?.abbreviation ?? '', logoUrl: teams[i]?.logoUrl ?? null, era: x.era })) };
  const id = await saveResult(s, ctx, NBA_GAME, resultData, result.score, result.wins === 82);
  return { id, result: resultData, daily: s.isDaily };
}
