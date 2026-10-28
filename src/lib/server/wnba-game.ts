import { firstAllowed, spinKey } from '@/lib/game/spin-order';
import { createHash } from 'node:crypto';
import { and, eq, gte, inArray, lte, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { token as newToken } from './request';
import { saveResult } from './grading';
import { getWnbaFloor } from './wnba-floor';
import { eraTeams, lineValue, seasonGames, spanOf, wnbaReady } from './wnba-data';
import { getOffset } from './difficulty-offset';
import { modeKey } from '@/lib/game/difficulty';
import { dailyDateET, dailySeed } from '@/lib/game/daily';
import {
  WNBA_ERAS, WNBA_ERA_PICKS_MAX, WNBA_ERA_RESPINS, WNBA_GAME, WNBA_GAMES, WNBA_MIN_GP, WNBA_ROUNDS, WNBA_SLOTS, WNBA_TEAM_RESPINS, gradeWnbaRoster, wnbaFit, wnbaPosition, wnbaSeasonLabel, wnbaSlots,
  type WnbaMode, type WnbaPick, type WnbaSlot, type WnbaSpin,
} from '@/lib/game/fortyfour';

export { WNBA_GAME, wnbaReady };
export class WnbaError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

export interface WnbaPayload {
  mode?: WnbaMode;
  hard: boolean;
  eraRespinsUsed: number;
  teamRespinsUsed: number;
  /** Re-spins used in the current round; with the seed and round they fix the next draw (see spin-order.ts). */
  roundEra?: number;
  roundTeam?: number;
  /** Set when this game is someone's challenge: same seed, same setup, graded from the roster (see challenges.ts). */
  challengeId?: string;
  /** The board on the clock. Decided server-side from the seed, never by the client. */
  current: { era: WnbaSpin; teamId: number } | null;
  picks: { playerId: number; teamId: number; season: number; slot: WnbaSlot; era: WnbaSpin }[];
}

export interface WnbaBoardPlayer { id: number; /** Already on your roster from another team or era: shown, but he cannot be drafted twice. */ onRoster?: boolean; name: string; position: string; season: number; seasonLabel: string; value: number; ppg: number; rpg: number; apg: number; headshot: string | null; fits: WnbaSlot[] }
export interface WnbaTeamView { id: number; era: WnbaSpin; eraLabel: string; name: string; location: string; abbreviation: string; color: string; logoUrl: string | null; players: WnbaBoardPlayer[] }
export interface WnbaState {
  sessionId: string; index: number; total: number; done: boolean; hard: boolean; mode: WnbaMode;
  /** Eras already drafted from: each can be used once. */
  usedEras: WnbaSpin[];
  eraRespinsLeft: number; teamRespinsLeft: number;
  team: WnbaTeamView | null;
  roster: { slot: WnbaSlot; pick: (WnbaBoardPlayer & { teamName: string; teamColor: string; logoUrl: string | null; fit: number }) | null }[];
}

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

/* ------------------------------------------------------------------ data */

/** The franchise's identity in an era: its name and colors from its latest season in that span. */
async function teamInEra(teamId: number, era: WnbaSpin, nowSeason: number | null) {
  const e = spanOf(era, nowSeason);
  const [t] = await db.select().from(schema.wnbaTeamSeasons)
    .where(and(eq(schema.wnbaTeamSeasons.teamId, teamId), gte(schema.wnbaTeamSeasons.season, e.from), lte(schema.wnbaTeamSeasons.season, e.to)))
    .orderBy(dsql`${schema.wnbaTeamSeasons.season} desc`).limit(1);
  return t;
}

/** Every qualifying player for a franchise in an era, at his best season there. */
async function board(teamId: number, era: WnbaSpin): Promise<WnbaTeamView | null> {
  const { nowSeason } = await eraTeams();
  const e = spanOf(era, nowSeason);
  const t = await teamInEra(teamId, era, nowSeason);
  if (!t) return null;
  const games = await seasonGames();
  const rows = await db.select({ ps: schema.wnbaPlayerSeasons, p: schema.wnbaPlayers }).from(schema.wnbaPlayerSeasons)
    .innerJoin(schema.wnbaPlayers, eq(schema.wnbaPlayers.id, schema.wnbaPlayerSeasons.playerId))
    .where(and(eq(schema.wnbaPlayerSeasons.teamId, teamId), gte(schema.wnbaPlayerSeasons.season, e.from), lte(schema.wnbaPlayerSeasons.season, e.to), gte(schema.wnbaPlayerSeasons.gp, WNBA_MIN_GP)));
  const scored = rows.map((r) => ({ ...r, value: lineValue(r.ps, games) }));
  const best = new Map<number, (typeof scored)[number]>();
  for (const r of scored) { const b = best.get(r.p.id); if (!b || r.value > b.value) best.set(r.p.id, r); }
  const players = [...best.values()].sort((a, b) => b.value - a.value).map(({ ps, p, value }) => ({
    id: p.id, name: p.fullName, position: wnbaPosition(p.position, ps), season: ps.season, seasonLabel: wnbaSeasonLabel(ps.season), value,
    ppg: ps.ppg, rpg: ps.rpg, apg: ps.apg, headshot: p.headshot, fits: wnbaSlots(wnbaPosition(p.position, ps), ps.apg),
  }));
  return { id: teamId, era, eraLabel: e.label, name: t.name, location: t.location, abbreviation: t.abbreviation, color: t.color ?? '#555555', logoUrl: t.logoUrl, players };
}

/* ------------------------------------------------------------------ spins */

/** Eras that have given all the picks they can (one each; Right now has no eras). */
export function fullEras(p: Pick<WnbaPayload, 'picks' | 'mode'>): Set<WnbaSpin> {
  if (p.mode === 'now') return new Set();
  const n = new Map<WnbaSpin, number>();
  for (const x of p.picks) n.set(x.era, (n.get(x.era) ?? 0) + 1);
  return new Set([...n].filter(([, c]) => c >= WNBA_ERA_PICKS_MAX).map(([e]) => e));
}

/**
 * The board for a round is a pure function of the seed, the round and the re-spins used, so a session cannot
 * be refreshed into a better draw and everyone on Today sees the same first spin.
 */
async function draw(seed: string, round: number, p: WnbaPayload, keepEra?: WnbaSpin, keepTeam?: number): Promise<{ era: WnbaSpin; teamId: number }> {
  const asked = keepEra;
  const { teams } = await eraTeams();
  if (p.mode === 'now') keepEra = 'now';
  const used = new Set(p.picks.map((x) => x.teamId));
  const full = fullEras(p);
  const canUse = (e: WnbaSpin) => !full.has(e) && teams[e].some((t) => !used.has(t));
  const allEras = WNBA_ERAS.map((e) => e.key) as WnbaSpin[];
  const kind = keepTeam !== undefined && !asked ? 'era' : asked ? 'team' : 'spin';
  const key = spinKey('44', seed, round, kind, kind === 'era' ? p.roundEra ?? 0 : kind === 'team' ? p.roundTeam ?? 0 : 0);
  const teamIn = (e: WnbaSpin, not?: number) => firstAllowed(`${key}:${e}`, teams[e], (t) => !used.has(t) && t !== not);
  // Era re-spin: a different era, keeping the franchise when it played in one (only the era changes).
  if (kind === 'era') {
    const other = (e: WnbaSpin) => e !== p.current?.era && canUse(e);
    const withTeam = firstAllowed(`${key}:keep`, allEras, (e) => other(e) && teams[e].includes(keepTeam!));
    if (withTeam) return { era: withTeam, teamId: keepTeam! };
    const e = firstAllowed(key, allEras, other);
    const t = e !== undefined ? teamIn(e) : undefined;
    if (e !== undefined && t !== undefined) return { era: e, teamId: t };
  }
  const era = keepEra ?? firstAllowed(key, allEras, canUse);
  const teamId = era !== undefined ? teamIn(era, keepEra ? p.current?.teamId : undefined) : undefined;
  if (era === undefined || teamId === undefined) throw new WnbaError('No franchises left to spin. Start a new game.', 409);
  return { era, teamId };
}

/* ------------------------------------------------------------------ state */

async function state(sessionId: string, p: WnbaPayload): Promise<WnbaState> {
  const index = p.picks.length, done = index >= WNBA_ROUNDS;
  const team = !done && p.current ? await board(p.current.teamId, p.current.era) : null;
  const hide = <T extends { value: number; ppg: number; rpg: number; apg: number }>(x: T): T => (p.hard ? { ...x, value: -1, ppg: -1, rpg: -1, apg: -1 } : x);
  const mine = new Set(p.picks.map((x) => x.playerId));
  const view = team ? { ...team, players: (p.hard ? [...team.players].sort((a, b) => a.name.localeCompare(b.name)) : team.players).map(hide).map((x) => (mine.has(x.id) ? { ...x, onRoster: true } : x)) } : null;
  const pickedTeams = await Promise.all(p.picks.map(async (x) => ({ x, t: await board(x.teamId, x.era) })));
  const roster = WNBA_SLOTS.map((slot) => {
    const hit = pickedTeams.find(({ x }) => x.slot === slot);
    if (!hit) return { slot, pick: null };
    const pl = hit.t?.players.find((y) => y.id === hit.x.playerId);
    if (!pl || !hit.t) return { slot, pick: null };
    return { slot, pick: { ...hide(pl), teamName: `${hit.t.location} ${hit.t.name}`.trim(), teamColor: hit.t.color, logoUrl: hit.t.logoUrl, fit: wnbaFit(pl.position, slot, pl.apg) } };
  });
  const usedEras = [...fullEras(p)];
  // An era re-spin needs somewhere to go: on the last pick only one era is left.
  const otherEras = WNBA_ERAS.filter((e) => e.key !== p.current?.era && !usedEras.includes(e.key)).length;
  return {
    sessionId, index, total: WNBA_ROUNDS, done, hard: p.hard, mode: p.mode ?? 'eras', usedEras,
    eraRespinsLeft: p.hard || p.mode === 'now' || !otherEras ? 0 : WNBA_ERA_RESPINS - p.eraRespinsUsed,
    teamRespinsLeft: p.hard ? 0 : WNBA_TEAM_RESPINS - p.teamRespinsUsed,
    team: view, roster,
  };
}

async function open(sessionId: string, tok: string) {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !tok) throw new WnbaError('Session not found. Start a new game.', 403);
  const [s] = await db.select().from(schema.gameSessions).where(eq(schema.gameSessions.id, sessionId)).limit(1);
  if (!s || s.gameType !== WNBA_GAME || s.token !== hashToken(tok)) throw new WnbaError('Session not found. Start a new game.', 403);
  if (s.completed) throw new WnbaError('This game is already graded.', 409);
  if (s.expiresAt < new Date()) throw new WnbaError('Session expired. Start a new game.', 410);
  return s;
}
const save = (id: string, p: WnbaPayload) => db.update(schema.gameSessions).set({ spinPayload: p }).where(eq(schema.gameSessions.id, id));

export async function startWnba(opts: { userId?: string | null; daily?: boolean; hard?: boolean; mode?: WnbaMode; challenge?: { seed: string; challengeId: string } }) {
  // 44-0 drafts from the current season only (the All-time eras were retired); sessions already under way keep their mode.
  const mode: WnbaMode = 'now';
  if (!(await wnbaReady(mode))) throw new WnbaError(mode === 'now' ? '44-0 needs a few more weeks of this season before it can open.' : '44-0 is still loading the league history. Try again in a few minutes.', 503);
  const date = dailyDateET();
  const seed = opts.daily ? dailySeed(`${WNBA_GAME}:`, date) : opts.challenge?.seed ?? newToken(12);
  const p: WnbaPayload = { mode, hard: !!opts.hard, eraRespinsUsed: 0, teamRespinsUsed: 0, current: null, picks: [], ...(opts.challenge && !opts.daily ? { challengeId: opts.challenge.challengeId } : {}) };
  p.current = await draw(seed, 0, p);
  const tok = newToken();
  const [row] = await db.insert(schema.gameSessions).values({
    userId: opts.userId ?? null, gameType: WNBA_GAME, seed, spinPayload: p, token: hashToken(tok),
    isDaily: !!opts.daily, dailyDate: opts.daily ? date : null, expiresAt: new Date(Date.now() + 6 * 3600_000),
  }).returning();
  return { ...(await state(row.id, p)), token: tok, daily: row.isDaily, date: row.dailyDate };
}

export async function respinWnba(sessionId: string, tok: string, what: 'era' | 'team') {
  const s = await open(sessionId, tok);
  const p = s.spinPayload as WnbaPayload;
  if (p.hard) throw new WnbaError('Hard mode has no re-spins.');
  if (!p.current || p.picks.length >= WNBA_ROUNDS) throw new WnbaError('The draft is complete.');
  if (what === 'era' && (p.mode === 'now' || p.eraRespinsUsed >= WNBA_ERA_RESPINS)) throw new WnbaError(p.mode === 'now' ? 'Right now has no eras to re-spin.' : 'Your era re-spins are used.');
  if (what === 'era' && !WNBA_ERAS.some((e) => e.key !== p.current!.era && !fullEras(p).has(e.key))) throw new WnbaError('Every other era is already on your roster.');
  if (what === 'team' && p.teamRespinsUsed >= WNBA_TEAM_RESPINS) throw new WnbaError('Your team re-spins are used.');
  const next: WnbaPayload = { ...p, eraRespinsUsed: p.eraRespinsUsed + (what === 'era' ? 1 : 0), teamRespinsUsed: p.teamRespinsUsed + (what === 'team' ? 1 : 0) };
  // The draw is keyed on this round's re-spins so far (before this one), so the n-th re-spin is the same for everyone.
  next.roundEra = p.roundEra ?? 0; next.roundTeam = p.roundTeam ?? 0;
  next.current = await draw(s.seed, p.picks.length, next, what === 'team' ? p.current.era : undefined, what === 'era' ? p.current.teamId : undefined);
  if (what === 'era') next.roundEra = (p.roundEra ?? 0) + 1; else next.roundTeam = (p.roundTeam ?? 0) + 1;
  await save(s.id, next);
  return state(s.id, next);
}

export async function pickWnba(sessionId: string, tok: string, playerId: number, slot?: WnbaSlot) {
  const s = await open(sessionId, tok);
  const p = s.spinPayload as WnbaPayload;
  if (!p.current || p.picks.length >= WNBA_ROUNDS) throw new WnbaError('The draft is complete.');
  const team = await board(p.current.teamId, p.current.era);
  const pl = team?.players.find((x) => x.id === playerId);
  if (!team || !pl) throw new WnbaError('That player is not on this board.');
  if (p.picks.some((x) => x.playerId === playerId)) throw new WnbaError(`${pl.name} is already on your roster. Take someone else.`);
  const taken = new Set(p.picks.map((x) => x.slot));
  const openSlots = WNBA_SLOTS.filter((x) => !taken.has(x));
  // Out of position is allowed; it just costs value. Default to a natural open spot.
  const chosen = slot && openSlots.includes(slot) ? slot : pl.fits.find((x) => openSlots.includes(x)) ?? openSlots[0];
  const next: WnbaPayload = { ...p, picks: [...p.picks, { playerId, teamId: team.id, season: pl.season, slot: chosen, era: p.current.era }], roundEra: 0, roundTeam: 0 };
  next.current = next.picks.length < WNBA_ROUNDS ? await draw(s.seed, next.picks.length, next) : null;
  await save(s.id, next);
  return state(s.id, next);
}

/** Moves a drafted player to another slot, swapping with whoever is there. Allowed until the season is played. */
export async function moveWnba(sessionId: string, tok: string, from: WnbaSlot, to: WnbaSlot) {
  const s = await open(sessionId, tok);
  const p = s.spinPayload as WnbaPayload;
  if (!p.picks.some((x) => x.slot === from)) throw new WnbaError('Nobody is in that slot.');
  const next: WnbaPayload = { ...p, picks: p.picks.map((x) => (x.slot === from ? { ...x, slot: to } : x.slot === to ? { ...x, slot: from } : x)) };
  await save(s.id, next);
  return state(s.id, next);
}

export async function gradeWnba(ctx: { sessionId: string; token: string; userId?: string | null; username?: string | null }) {
  const s = await open(ctx.sessionId, ctx.token);
  const p = s.spinPayload as WnbaPayload;
  if (p.picks.length < WNBA_ROUNDS) throw new WnbaError(`Fill all ${WNBA_ROUNDS} spots.`);
  const ids = p.picks.map((x) => x.playerId);
  const games = await seasonGames();
  const rows = await db.select({ ps: schema.wnbaPlayerSeasons, p: schema.wnbaPlayers }).from(schema.wnbaPlayerSeasons)
    .innerJoin(schema.wnbaPlayers, eq(schema.wnbaPlayers.id, schema.wnbaPlayerSeasons.playerId)).where(inArray(schema.wnbaPlayerSeasons.playerId, ids));
  const picks: WnbaPick[] = p.picks.map((x) => {
    const r = rows.find((y) => y.p.id === x.playerId && y.ps.teamId === x.teamId && y.ps.season === x.season);
    if (!r) throw new WnbaError('Unknown player.');
    return { slot: x.slot, name: r.p.fullName, position: wnbaPosition(r.p.position, r.ps), teamId: x.teamId, season: x.season, value: lineValue(r.ps, games), apg: r.ps.apg };
  });
  // Today (and any shared board) grades the roster, so identical picks always play out the same season.
  const seed = s.isDaily || p.challengeId ? `${s.seed}:${p.picks.map((x) => `${x.playerId}@${x.slot}`).sort().join(',')}` : s.id;
  const mode = p.mode ?? 'eras';
  const result = gradeWnbaRoster(seed, picks, (await getWnbaFloor(mode)) + (await getOffset(modeKey(WNBA_GAME, { mode }))));
  const { nowSeason } = await eraTeams();
  const teams = await Promise.all(p.picks.map((x) => teamInEra(x.teamId, x.era, nowSeason)));
  const resultData = { ...result, hard: p.hard, mode, teams: p.picks.map((x, i) => ({ slot: x.slot, team: teams[i] ? `${teams[i]!.location} ${teams[i]!.name}`.trim() : '', abbr: teams[i]?.abbreviation ?? '', logoUrl: teams[i]?.logoUrl ?? null, era: x.era })) };
  const id = await saveResult(s, ctx, WNBA_GAME, resultData, result.score, result.wins === WNBA_GAMES);
  return { id, result: resultData, daily: s.isDaily };
}
