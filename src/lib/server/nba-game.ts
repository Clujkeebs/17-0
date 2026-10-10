import { firstAllowed, spinKey } from '@/lib/game/spin-order';
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
  ERAS, ERA_PICKS_MAX, ERA_RESPINS, NBA_ROUNDS, NBA_SLOTS, TEAM_RESPINS, eraOf, fitMultiplier, gradeNbaRoster, naturalSlots, seasonLabel,
  type EraKey, type NbaPick, type NbaSlot,
} from '@/lib/game/eightytwo';

export const NBA_GAME = '82-0';
export class NbaError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

/** A player needs this many games with a franchise in a season to show up on its board. */
const MIN_GP = 20;

/** Classic grades real per-game stats across eras; Standard grades today's NBA 2K overalls on current rosters. */
export type NbaEdition = 'classic' | 'standard';
export const NBA_EDITIONS: NbaEdition[] = ['classic', 'standard'];
/** Standard has no eras to re-spin, so both re-spins go to teams. */
const STANDARD_TEAM_RESPINS = 2;

export interface NbaPayload {
  edition?: NbaEdition;
  hard: boolean;
  eraRespinsUsed: number;
  teamRespinsUsed: number;
  /** Re-spins used in the current round; with the seed and round they fix the next draw (see spin-order.ts). */
  roundEra?: number;
  roundTeam?: number;
  /** The board on the clock. Decided server-side from the seed, never by the client. */
  current: { era: EraKey; teamId: number } | null;
  picks: { playerId: number; teamId: number; season: number; slot: NbaSlot; era: EraKey }[];
  challengeId?: string;
}

export interface NbaBoardPlayer { id: number; name: string; position: string; season: number; seasonLabel: string; value: number; ppg: number; rpg: number; apg: number; headshot: string | null; fits: NbaSlot[] }
export interface NbaTeamView { id: number; era: EraKey; eraLabel: string; name: string; location: string; abbreviation: string; color: string; logoUrl: string | null; players: NbaBoardPlayer[] }
export interface NbaState {
  sessionId: string; index: number; total: number; done: boolean; hard: boolean;
  /** Eras already drafted from (Classic): each can be used once. */
  usedEras: EraKey[];
  eraRespinsLeft: number; teamRespinsLeft: number; edition: NbaEdition;
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

/** Franchises with at least five 2K-rated players on their current roster, cached for an hour. */
async function teams2k(): Promise<number[]> {
  const r = getRedis();
  const cached = await r.get('nba:2k-teams').catch(() => null);
  if (cached) return JSON.parse(cached);
  const rows = await db.select({ teamId: schema.nbaPlayers.rating2kTeamId, n: dsql<number>`count(*)::int` }).from(schema.nbaPlayers)
    .where(dsql`${schema.nbaPlayers.rating2k} is not null and ${schema.nbaPlayers.rating2kTeamId} is not null`).groupBy(schema.nbaPlayers.rating2kTeamId);
  const out = rows.filter((x) => x.n >= 5 && x.teamId != null).map((x) => x.teamId!).sort((a, b) => a - b);
  if (out.length) await r.set('nba:2k-teams', JSON.stringify(out), 'EX', 3600).catch(() => {});
  return out;
}

/** 82-0 opens once every era has enough franchises to spin; Standard once 2K ratings cover most teams. */
export async function nbaReady(edition: NbaEdition = 'classic'): Promise<boolean> {
  try {
    if (edition === 'standard') return (await teams2k()).length >= 20;
    const t = await eraTeams(); return ERAS.every((e) => t[e.key].length >= 10);
  } catch { return false; }
}

/** A current roster graded on NBA 2K overalls, with last season's line for context. */
async function board2k(teamId: number): Promise<NbaTeamView | null> {
  const [t] = await db.select().from(schema.nbaTeamSeasons).where(eq(schema.nbaTeamSeasons.teamId, teamId)).orderBy(dsql`${schema.nbaTeamSeasons.season} desc`).limit(1);
  if (!t) return null;
  const rows = await db.select().from(schema.nbaPlayers).where(and(eq(schema.nbaPlayers.rating2kTeamId, teamId), dsql`${schema.nbaPlayers.rating2k} is not null`));
  const lines = rows.length ? await db.select().from(schema.nbaPlayerSeasons).where(and(inArray(schema.nbaPlayerSeasons.playerId, rows.map((r) => r.id)), eq(schema.nbaPlayerSeasons.season, t.season))) : [];
  const players = rows.sort((a, b) => b.rating2k! - a.rating2k!).map((p) => {
    const l = lines.find((x) => x.playerId === p.id);
    const pos = p.rating2kPosition ?? p.position;
    return { id: p.id, name: p.fullName, position: pos, season: t.season, seasonLabel: 'NBA 2K', value: p.rating2k!, ppg: l?.ppg ?? 0, rpg: l?.rpg ?? 0, apg: l?.apg ?? 0, headshot: p.headshot, fits: naturalSlots(pos, l?.apg) };
  });
  return { id: teamId, era: '2020s', eraLabel: '2K', name: t.name, location: t.location, abbreviation: t.abbreviation, color: t.color ?? '#555555', logoUrl: t.logoUrl, players };
}
const boardFor = (p: NbaPayload, teamId: number, era: EraKey) => (p.edition === 'standard' ? board2k(teamId) : board(teamId, era));

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
    ppg: ps.ppg, rpg: ps.rpg, apg: ps.apg, headshot: p.headshot, fits: naturalSlots(p.position, ps.apg),
  }));
  return { id: teamId, era, eraLabel: e.label, name: t.name, location: t.location, abbreviation: t.abbreviation, color: t.color ?? '#555555', logoUrl: t.logoUrl, players };
}

/* ------------------------------------------------------------------ spins */

/** Eras that have given all the picks they can (Classic: one each, like the original game). */
export function fullEras(p: Pick<NbaPayload, 'picks'>): Set<EraKey> {
  const n = new Map<EraKey, number>();
  for (const x of p.picks) n.set(x.era, (n.get(x.era) ?? 0) + 1);
  return new Set([...n].filter(([, c]) => c >= ERA_PICKS_MAX).map(([e]) => e));
}

/**
 * The board for a round is a pure function of the seed, the round and the re-spins used, so a session cannot
 * be refreshed into a better draw and everyone on Today sees the same first spin.
 */
async function draw(seed: string, round: number, p: NbaPayload, keepEra?: EraKey, keepTeam?: number): Promise<{ era: EraKey; teamId: number }> {
  const asked = keepEra;
  const teams = p.edition === 'standard' ? { ...Object.fromEntries(ERAS.map((e) => [e.key, [] as number[]])), '2020s': await teams2k() } as Record<EraKey, number[]> : await eraTeams();
  if (p.edition === 'standard') keepEra = '2020s';
  const used = new Set(p.picks.map((x) => x.teamId));
  const full = p.edition === 'standard' ? new Set<string>() : fullEras(p);
  const canUse = (e: EraKey) => !full.has(e) && teams[e].some((t) => !used.has(t));
  const allEras = ERAS.map((e) => e.key) as EraKey[];
  const kind = keepTeam !== undefined && !asked ? 'era' : asked ? 'team' : 'spin';
  const key = spinKey('82', seed, round, kind, kind === 'era' ? p.roundEra ?? 0 : kind === 'team' ? p.roundTeam ?? 0 : 0);
  const teamIn = (e: EraKey, not?: number) => firstAllowed(`${key}:${e}`, teams[e], (t) => !used.has(t) && t !== not);
  // Era re-spin: a different era, keeping the franchise when it played in one (only the era changes).
  if (kind === 'era') {
    const other = (e: EraKey) => e !== p.current?.era && canUse(e);
    const withTeam = firstAllowed(`${key}:keep`, allEras, (e) => other(e) && teams[e].includes(keepTeam!));
    if (withTeam) return { era: withTeam, teamId: keepTeam! };
    const e = firstAllowed(key, allEras, other);
    const t = e !== undefined ? teamIn(e) : undefined;
    if (e !== undefined && t !== undefined) return { era: e, teamId: t };
  }
  const era = keepEra ?? firstAllowed(key, allEras, canUse);
  const teamId = era !== undefined ? teamIn(era, keepEra ? p.current?.teamId : undefined) : undefined;
  if (era === undefined || teamId === undefined) throw new NbaError('No franchises left to spin. Start a new game.', 409);
  return { era, teamId };
}

/* ------------------------------------------------------------------ state */

async function state(sessionId: string, p: NbaPayload): Promise<NbaState> {
  const index = p.picks.length, done = index >= NBA_ROUNDS;
  const team = !done && p.current ? await boardFor(p, p.current.teamId, p.current.era) : null;
  const hide = <T extends { value: number; ppg: number; rpg: number; apg: number }>(x: T): T => (p.hard ? { ...x, value: -1, ppg: -1, rpg: -1, apg: -1 } : x);
  const view = team ? { ...team, players: (p.hard ? [...team.players].sort((a, b) => a.name.localeCompare(b.name)) : team.players).map(hide) } : null;
  const pickedTeams = await Promise.all(p.picks.map(async (x) => ({ x, t: await boardFor(p, x.teamId, x.era) })));
  const roster = NBA_SLOTS.map((slot) => {
    const hit = pickedTeams.find(({ x }) => x.slot === slot);
    if (!hit) return { slot, pick: null };
    const pl = hit.t?.players.find((y) => y.id === hit.x.playerId);
    if (!pl || !hit.t) return { slot, pick: null };
    const fit = fitMultiplier(pl.position, slot, pl.apg);
    return { slot, pick: { ...hide(pl), teamName: `${hit.t.location} ${hit.t.name}`.trim(), teamColor: hit.t.color, logoUrl: hit.t.logoUrl, fit } };
  });
  const usedEras = p.edition === 'standard' ? [] : [...fullEras(p)];
  // An era re-spin needs somewhere to go: on the last pick only one era is left.
  const otherEras = ERAS.filter((e) => e.key !== p.current?.era && !usedEras.includes(e.key)).length;
  return {
    sessionId, index, total: NBA_ROUNDS, done, hard: p.hard, usedEras,
    eraRespinsLeft: p.hard || p.edition === 'standard' || !otherEras ? 0 : ERA_RESPINS - p.eraRespinsUsed,
    teamRespinsLeft: p.hard ? 0 : (p.edition === 'standard' ? STANDARD_TEAM_RESPINS : TEAM_RESPINS) - p.teamRespinsUsed,
    edition: p.edition ?? 'classic',
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

export async function startNba(opts: { userId?: string | null; daily?: boolean; hard?: boolean; edition?: NbaEdition; challenge?: { seed: string; challengeId: string } }) {
  // Today is one shared Classic board; Standard is a Casual option.
  const edition: NbaEdition = opts.daily ? 'classic' : opts.edition ?? 'classic';
  if (!(await nbaReady(edition))) throw new NbaError(edition === 'standard' ? 'NBA 2K ratings are still loading. Try Classic for now.' : '82-0 is still loading its history. Try again in a few minutes.', 503);
  const date = dailyDateET();
  const seed = opts.daily ? dailySeed(`${NBA_GAME}:`, date) : opts.challenge?.seed ?? newToken(12);
  const p: NbaPayload = { edition, hard: !!opts.hard, eraRespinsUsed: 0, teamRespinsUsed: 0, current: null, picks: [], ...(opts.challenge && !opts.daily ? { challengeId: opts.challenge.challengeId } : {}) };
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
  if (what === 'era' && (p.edition === 'standard' || p.eraRespinsUsed >= ERA_RESPINS)) throw new NbaError(p.edition === 'standard' ? 'Standard has no eras to re-spin.' : 'Your era re-spin is used.');
  if (what === 'era' && !ERAS.some((e) => e.key !== p.current!.era && !fullEras(p).has(e.key))) throw new NbaError('Every other era is already on your roster.');
  if (what === 'team' && p.teamRespinsUsed >= (p.edition === 'standard' ? STANDARD_TEAM_RESPINS : TEAM_RESPINS)) throw new NbaError('Your team re-spins are used.');
  const next: NbaPayload = { ...p, eraRespinsUsed: p.eraRespinsUsed + (what === 'era' ? 1 : 0), teamRespinsUsed: p.teamRespinsUsed + (what === 'team' ? 1 : 0) };
  // The draw is keyed on this round's re-spins so far (before this one), so the n-th re-spin is the same for everyone.
  next.roundEra = p.roundEra ?? 0; next.roundTeam = p.roundTeam ?? 0;
  next.current = await draw(s.seed, p.picks.length, next, what === 'team' ? p.current.era : undefined, what === 'era' ? p.current.teamId : undefined);
  if (what === 'era') next.roundEra = (p.roundEra ?? 0) + 1; else next.roundTeam = (p.roundTeam ?? 0) + 1;
  await save(s.id, next);
  return state(s.id, next);
}

export async function pickNba(sessionId: string, tok: string, playerId: number, slot?: NbaSlot) {
  const s = await open(sessionId, tok);
  const p = s.spinPayload as NbaPayload;
  if (!p.current || p.picks.length >= NBA_ROUNDS) throw new NbaError('The draft is complete.');
  const team = await boardFor(p, p.current.teamId, p.current.era);
  const pl = team?.players.find((x) => x.id === playerId);
  if (!team || !pl) throw new NbaError('That player is not on this board.');
  const taken = new Set(p.picks.map((x) => x.slot));
  const openSlots = NBA_SLOTS.filter((x) => !taken.has(x));
  // Out of position is allowed; it just costs value. Default to a natural open spot.
  const chosen = slot && openSlots.includes(slot) ? slot : pl.fits.find((x) => openSlots.includes(x)) ?? openSlots[0];
  const next: NbaPayload = { ...p, picks: [...p.picks, { playerId, teamId: team.id, season: pl.season, slot: chosen, era: p.current.era }], roundEra: 0, roundTeam: 0 };
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
  const standard = p.edition === 'standard';
  const rated = standard ? await db.select().from(schema.nbaPlayers).where(inArray(schema.nbaPlayers.id, ids)) : [];
  const rows = await db.select({ ps: schema.nbaPlayerSeasons, p: schema.nbaPlayers }).from(schema.nbaPlayerSeasons)
    .innerJoin(schema.nbaPlayers, eq(schema.nbaPlayers.id, schema.nbaPlayerSeasons.playerId)).where(inArray(schema.nbaPlayerSeasons.playerId, ids));
  // Standard plays today's rosters: a player's latest season says whether he runs the point.
  const lastApg = new Map<number, number>();
  for (const r of [...rows].sort((a, b) => a.ps.season - b.ps.season)) lastApg.set(r.p.id, r.ps.apg);
  const picks: NbaPick[] = p.picks.map((x) => {
    if (standard) {
      const r = rated.find((y) => y.id === x.playerId);
      if (!r || r.rating2k == null) throw new NbaError('Unknown player.');
      return { slot: x.slot, name: r.fullName, position: r.rating2kPosition ?? r.position, teamId: x.teamId, season: x.season, value: r.rating2k, apg: lastApg.get(r.id) };
    }
    const r = rows.find((y) => y.p.id === x.playerId && y.ps.teamId === x.teamId && y.ps.season === x.season);
    if (!r) throw new NbaError('Unknown player.');
    return { slot: x.slot, name: r.p.fullName, position: r.p.position, teamId: x.teamId, season: x.season, value: r.ps.value, apg: r.ps.apg };
  });
  const seed = s.isDaily || p.challengeId ? `${s.seed}:${p.picks.map((x) => `${x.playerId}@${x.slot}`).sort().join(',')}` : s.id;
  const result = gradeNbaRoster(seed, picks, await getNbaFloor(standard ? 'standard' : 'classic'));
  const teams = await Promise.all(p.picks.map((x) => teamInEra(x.teamId, x.era)));
  const resultData = { ...result, hard: p.hard, edition: standard ? 'standard' : 'classic', teams: p.picks.map((x, i) => ({ slot: x.slot, team: teams[i] ? `${teams[i]!.location} ${teams[i]!.name}`.trim() : '', abbr: teams[i]?.abbreviation ?? '', logoUrl: teams[i]?.logoUrl ?? null, era: x.era })) };
  const id = await saveResult(s, ctx, NBA_GAME, resultData, result.score, result.wins === 82);
  return { id, result: resultData, daily: s.isDaily };
}
