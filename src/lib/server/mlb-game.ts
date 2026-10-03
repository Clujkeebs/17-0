import { createHash } from 'node:crypto';
import { and, eq, gte, inArray, lte, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { token as newToken } from './request';
import { getRedis } from './redis';
import { saveResult } from './grading';
import { getMlbFloor } from './mlb-floor';
import { latestMlbSeason } from './mlb-sync';
import { createRng } from '@/lib/game/prng';
import { dailyDateET, dailySeed } from '@/lib/game/daily';
import {
  MLB_ERAS, MLB_ERA_RESPINS, MLB_ROUNDS, MLB_SLOTS, MLB_TEAM_RESPINS, draftSlots, gradeMlbRoster, isPitchSlot, mlbEraOf, mlbFit,
  type MlbEraKey, type MlbKind, type MlbMode, type MlbPick, type MlbSlot,
} from '@/lib/game/onesixtytwo';

export const MLB_GAME = '162-0';
export class MlbError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

/** Club colors by Stats API franchise id (ids follow a franchise through moves). */
export const MLB_COLORS: Record<number, string> = {
  108: '#BA0021', 109: '#A71930', 110: '#DF4601', 111: '#BD3039', 112: '#0E3386', 113: '#C6011F', 114: '#00385D', 115: '#33006F',
  116: '#0C2340', 117: '#EB6E1F', 118: '#004687', 119: '#005A9C', 120: '#AB0003', 121: '#002D72', 133: '#003831', 134: '#27251F',
  135: '#2F241D', 136: '#0C2C56', 137: '#FD5A1E', 138: '#C41E3A', 139: '#092C5C', 140: '#003278', 141: '#134A8E', 142: '#002B5C',
  143: '#E81828', 144: '#CE1141', 145: '#27251F', 146: '#00A3E0', 147: '#0C2340', 158: '#12284B',
};
export const mlbLogo = (teamId: number) => `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
export const mlbHeadshot = (playerId: number) => `https://img.mlbstatic.com/mlb-photos/image/upload/w_120,q_auto:best/v1/people/${playerId}/headshot/67/current`;

/** A spin lands on an era, or on 'now' (this season only) in Right now mode. */
export type SpinEra = MlbEraKey | 'now';
/** Years and label for a spin era. */
export function span(era: SpinEra) {
  if (era === 'now') { const y = latestMlbSeason(); return { key: 'now' as const, label: String(y), from: y, to: y }; }
  return mlbEraOf(era)!;
}

export interface MlbPayload {
  mode?: MlbMode;
  hard: boolean;
  eraRespinsUsed: number;
  teamRespinsUsed: number;
  current: { era: SpinEra; teamId: number } | null;
  picks: { playerId: number; teamId: number; season: number; slot: MlbSlot; era: SpinEra }[];
}

export interface MlbBoardPlayer { id: number; name: string; position: string; kind: MlbKind; season: number; value: number; line: string; headshot: string; fits: MlbSlot[] }
export interface MlbTeamView { id: number; era: SpinEra; eraLabel: string; name: string; location: string; abbreviation: string; color: string; logoUrl: string; players: MlbBoardPlayer[] }
export interface MlbState {
  sessionId: string; index: number; total: number; done: boolean; hard: boolean; mode: MlbMode;
  eraRespinsLeft: number; teamRespinsLeft: number;
  team: MlbTeamView | null;
  roster: { slot: MlbSlot; pick: (MlbBoardPlayer & { teamName: string; teamColor: string; logoUrl: string; fit: number }) | null }[];
}

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
const f3 = (x: number) => x.toFixed(3).replace(/^0/, '');

/** The line a board row shows. */
export function lineText(kind: MlbKind, l: Record<string, number>): string {
  if (kind === 'bat') return `${f3(l.avg)}/${f3(l.obp)}/${f3(l.slg)}, ${l.hr} HR${l.sb >= 10 ? `, ${l.sb} SB` : ''}`;
  if (kind === 'sp') return `${l.w} W, ${l.era.toFixed(2)} ERA, ${l.so} K`;
  return `${l.sv} SV, ${l.era.toFixed(2)} ERA, ${l.so} K`;
}

/* ------------------------------------------------------------------ data */

/** Franchises with a real board in each era (eleven qualifying players, at least two pitchers), cached for an hour. */
async function eraTeams(): Promise<Record<SpinEra, number[]>> {
  const r = getRedis();
  const cached = await r.get('mlb:era-teams').catch(() => null);
  if (cached) return JSON.parse(cached);
  const out = {} as Record<SpinEra, number[]>;
  for (const e of [...MLB_ERAS, span('now')]) {
    const rows = await db.select({ teamId: schema.mlbPlayerSeasons.teamId, n: dsql<number>`count(distinct ${schema.mlbPlayerSeasons.playerId})::int`, pit: dsql<number>`count(distinct ${schema.mlbPlayerSeasons.playerId}) filter (where ${schema.mlbPlayerSeasons.kind} <> 'bat')::int` })
      .from(schema.mlbPlayerSeasons)
      .where(and(gte(schema.mlbPlayerSeasons.season, e.from), lte(schema.mlbPlayerSeasons.season, e.to)))
      .groupBy(schema.mlbPlayerSeasons.teamId);
    out[e.key] = rows.filter((x) => x.n >= 11 && x.pit >= 2).map((x) => x.teamId).sort((a, b) => a - b);
  }
  if (Object.values(out).every((v) => v.length)) await r.set('mlb:era-teams', JSON.stringify(out), 'EX', 3600).catch(() => {});
  return out;
}

/** 162-0 opens once every era has enough franchises to spin. */
export async function mlbReady(mode: MlbMode = 'eras'): Promise<boolean> {
  try { const t = await eraTeams(); return mode === 'now' ? t.now.length >= 20 : MLB_ERAS.every((e) => t[e.key].length >= 12); } catch { return false; }
}

async function teamInEra(teamId: number, era: SpinEra) {
  const e = span(era);
  const [t] = await db.select().from(schema.mlbTeamSeasons)
    .where(and(eq(schema.mlbTeamSeasons.teamId, teamId), gte(schema.mlbTeamSeasons.season, e.from), lte(schema.mlbTeamSeasons.season, e.to)))
    .orderBy(dsql`${schema.mlbTeamSeasons.season} desc`).limit(1);
  return t;
}

/** Every qualifying player for a franchise in an era, at his best season there. */
async function board(teamId: number, era: SpinEra): Promise<MlbTeamView | null> {
  const e = span(era);
  const t = await teamInEra(teamId, era);
  if (!t) return null;
  const rows = await db.select({ ps: schema.mlbPlayerSeasons, p: schema.mlbPlayers }).from(schema.mlbPlayerSeasons)
    .innerJoin(schema.mlbPlayers, eq(schema.mlbPlayers.id, schema.mlbPlayerSeasons.playerId))
    .where(and(eq(schema.mlbPlayerSeasons.teamId, teamId), gte(schema.mlbPlayerSeasons.season, e.from), lte(schema.mlbPlayerSeasons.season, e.to)));
  const best = new Map<number, (typeof rows)[number]>();
  for (const r of rows) { const b = best.get(r.p.id); if (!b || r.ps.value > b.ps.value) best.set(r.p.id, r); }
  const players = [...best.values()].sort((a, b) => b.ps.value - a.ps.value).map(({ ps, p }) => {
    const kind = ps.kind as MlbKind;
    return { id: p.id, name: p.fullName, position: ps.position, kind, season: ps.season, value: ps.value, line: lineText(kind, ps.line as Record<string, number>), headshot: mlbHeadshot(p.id), fits: draftSlots(ps.position, kind) };
  });
  return { id: teamId, era, eraLabel: e.label, name: t.name, location: t.location, abbreviation: t.abbreviation, color: MLB_COLORS[teamId] ?? '#1F2A44', logoUrl: mlbLogo(teamId), players };
}

/* ------------------------------------------------------------------ spins */

async function draw(seed: string, round: number, p: MlbPayload, keepEra?: SpinEra): Promise<{ era: SpinEra; teamId: number }> {
  const teams = await eraTeams();
  if (p.mode === 'now') keepEra = 'now';
  const rng = createRng(`162:${seed}:${round}:${p.eraRespinsUsed}:${p.teamRespinsUsed}`);
  const used = new Set(p.picks.map((x) => x.teamId));
  const eras = MLB_ERAS.filter((e) => teams[e.key].some((t) => !used.has(t)));
  const era: SpinEra = keepEra ?? rng.pick(eras.map((e) => e.key));
  const open = teams[era].filter((t) => !used.has(t) && t !== (keepEra ? p.current?.teamId : -1));
  if (!open.length) throw new MlbError('No franchises left to spin. Start a new game.', 409);
  return { era, teamId: rng.pick(open) };
}

/* ------------------------------------------------------------------ state */

async function state(sessionId: string, p: MlbPayload): Promise<MlbState> {
  const index = p.picks.length, done = index >= MLB_ROUNDS;
  const team = !done && p.current ? await board(p.current.teamId, p.current.era) : null;
  const hide = <T extends { value: number; line: string }>(x: T): T => (p.hard ? { ...x, value: -1, line: '' } : x);
  const view = team ? { ...team, players: (p.hard ? [...team.players].sort((a, b) => a.name.localeCompare(b.name)) : team.players).map(hide) } : null;
  const pickedTeams = await Promise.all(p.picks.map(async (x) => ({ x, t: await board(x.teamId, x.era) })));
  const roster = MLB_SLOTS.map((slot) => {
    const hit = pickedTeams.find(({ x }) => x.slot === slot);
    const pl = hit?.t?.players.find((y) => y.id === hit.x.playerId);
    if (!hit?.t || !pl) return { slot, pick: null };
    return { slot, pick: { ...hide(pl), teamName: `${hit.t.location} ${hit.t.name}`.trim(), teamColor: hit.t.color, logoUrl: hit.t.logoUrl, fit: mlbFit(pl.position, pl.kind, slot) } };
  });
  return {
    sessionId, index, total: MLB_ROUNDS, done, hard: p.hard, mode: p.mode ?? 'eras',
    eraRespinsLeft: p.hard || p.mode === 'now' ? 0 : MLB_ERA_RESPINS - p.eraRespinsUsed,
    teamRespinsLeft: p.hard ? 0 : MLB_TEAM_RESPINS - p.teamRespinsUsed,
    team: view, roster,
  };
}

async function open(sessionId: string, tok: string) {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !tok) throw new MlbError('Session not found. Start a new game.', 403);
  const [s] = await db.select().from(schema.gameSessions).where(eq(schema.gameSessions.id, sessionId)).limit(1);
  if (!s || s.gameType !== MLB_GAME || s.token !== hashToken(tok)) throw new MlbError('Session not found. Start a new game.', 403);
  if (s.completed) throw new MlbError('This game is already graded.', 409);
  if (s.expiresAt < new Date()) throw new MlbError('Session expired. Start a new game.', 410);
  return s;
}
const save = (id: string, p: MlbPayload) => db.update(schema.gameSessions).set({ spinPayload: p }).where(eq(schema.gameSessions.id, id));

export async function startMlb(opts: { userId?: string | null; daily?: boolean; hard?: boolean; mode?: MlbMode }) {
  // Today is one shared Eras board; Right now is a Casual option.
  const mode: MlbMode = opts.daily ? 'eras' : opts.mode ?? 'eras';
  if (!(await mlbReady(mode))) throw new MlbError(mode === 'now' ? 'Right now needs a few more weeks of this season. Try Eras.' : '162-0 is still loading its history. Try again in a few minutes.', 503);
  const date = dailyDateET();
  const seed = opts.daily ? dailySeed(`${MLB_GAME}:`, date) : newToken(12);
  const p: MlbPayload = { mode, hard: !!opts.hard, eraRespinsUsed: 0, teamRespinsUsed: 0, current: null, picks: [] };
  p.current = await draw(seed, 0, p);
  const tok = newToken();
  const [row] = await db.insert(schema.gameSessions).values({
    userId: opts.userId ?? null, gameType: MLB_GAME, seed, spinPayload: p, token: hashToken(tok),
    isDaily: !!opts.daily, dailyDate: opts.daily ? date : null, expiresAt: new Date(Date.now() + 6 * 3600_000),
  }).returning();
  return { ...(await state(row.id, p)), token: tok, daily: row.isDaily, date: row.dailyDate };
}

export async function respinMlb(sessionId: string, tok: string, what: 'era' | 'team') {
  const s = await open(sessionId, tok);
  const p = s.spinPayload as MlbPayload;
  if (p.hard) throw new MlbError('Hard mode has no re-spins.');
  if (!p.current || p.picks.length >= MLB_ROUNDS) throw new MlbError('The draft is complete.');
  if (what === 'era' && (p.mode === 'now' || p.eraRespinsUsed >= MLB_ERA_RESPINS)) throw new MlbError(p.mode === 'now' ? 'Right now has no eras to re-spin.' : 'Your era re-spins are used.');
  if (what === 'team' && p.teamRespinsUsed >= MLB_TEAM_RESPINS) throw new MlbError('Your team re-spins are used.');
  const next: MlbPayload = { ...p, eraRespinsUsed: p.eraRespinsUsed + (what === 'era' ? 1 : 0), teamRespinsUsed: p.teamRespinsUsed + (what === 'team' ? 1 : 0) };
  next.current = await draw(s.seed, p.picks.length, next, what === 'team' ? p.current.era : undefined);
  await save(s.id, next);
  return state(s.id, next);
}

export async function pickMlb(sessionId: string, tok: string, playerId: number, slot?: MlbSlot) {
  const s = await open(sessionId, tok);
  const p = s.spinPayload as MlbPayload;
  if (!p.current || p.picks.length >= MLB_ROUNDS) throw new MlbError('The draft is complete.');
  const team = await board(p.current.teamId, p.current.era);
  const pl = team?.players.find((x) => x.id === playerId);
  if (!team || !pl) throw new MlbError('That player is not on this board.');
  const taken = new Set(p.picks.map((x) => x.slot));
  // His own position, or DH for a hitter. Pitchers keep their role. If nobody on this board fits an open
  // spot, anyone may play out of position (at the fit cost) so a draft can never get stuck.
  const stuck = !team.players.some((x) => x.fits.some((f) => !taken.has(f)));
  const openSlots = stuck ? MLB_SLOTS.filter((x) => !taken.has(x) && mlbFit(pl.position, pl.kind, x) > 0) : pl.fits.filter((x) => !taken.has(x));
  if (!openSlots.length) throw new MlbError(`${pl.fits.join(' and ')} ${pl.fits.length > 1 ? 'are' : 'is'} filled. Take someone at an open spot.`);
  const best = [...openSlots].sort((a, b) => mlbFit(pl.position, pl.kind, b) - mlbFit(pl.position, pl.kind, a))[0];
  const chosen = slot && openSlots.includes(slot) ? slot : best;
  const next: MlbPayload = { ...p, picks: [...p.picks, { playerId, teamId: team.id, season: pl.season, slot: chosen, era: p.current.era }] };
  next.current = next.picks.length < MLB_ROUNDS ? await draw(s.seed, next.picks.length, next) : null;
  await save(s.id, next);
  return state(s.id, next);
}

/** Moves a drafted player to another spot, swapping with whoever is there. Hitters and pitchers never trade places. */
export async function moveMlb(sessionId: string, tok: string, from: MlbSlot, to: MlbSlot) {
  const s = await open(sessionId, tok);
  const p = s.spinPayload as MlbPayload;
  if (!p.picks.some((x) => x.slot === from)) throw new MlbError('Nobody is in that spot.');
  if (isPitchSlot(from) !== isPitchSlot(to)) throw new MlbError('Hitters and pitchers cannot swap.');
  const next: MlbPayload = { ...p, picks: p.picks.map((x) => (x.slot === from ? { ...x, slot: to } : x.slot === to ? { ...x, slot: from } : x)) };
  await save(s.id, next);
  return state(s.id, next);
}

export async function gradeMlb(ctx: { sessionId: string; token: string; userId?: string | null; username?: string | null }) {
  const s = await open(ctx.sessionId, ctx.token);
  const p = s.spinPayload as MlbPayload;
  if (p.picks.length < MLB_ROUNDS) throw new MlbError(`Fill all ${MLB_ROUNDS} spots.`);
  const rows = await db.select({ ps: schema.mlbPlayerSeasons, p: schema.mlbPlayers }).from(schema.mlbPlayerSeasons)
    .innerJoin(schema.mlbPlayers, eq(schema.mlbPlayers.id, schema.mlbPlayerSeasons.playerId)).where(inArray(schema.mlbPlayerSeasons.playerId, p.picks.map((x) => x.playerId)));
  const picks: MlbPick[] = p.picks.map((x) => {
    const r = rows.find((y) => y.p.id === x.playerId && y.ps.teamId === x.teamId && y.ps.season === x.season);
    if (!r) throw new MlbError('Unknown player.');
    return { slot: x.slot, name: r.p.fullName, position: r.ps.position, kind: r.ps.kind as MlbKind, teamId: x.teamId, season: x.season, value: r.ps.value };
  });
  for (const x of picks) if (mlbFit(x.position, x.kind, x.slot) === 0) throw new MlbError(`${x.name} cannot play ${x.slot}.`);
  const seed = s.isDaily ? `${s.seed}:${p.picks.map((x) => `${x.playerId}@${x.slot}`).sort().join(',')}` : s.id;
  const result = gradeMlbRoster(seed, picks, await getMlbFloor(p.mode ?? 'eras'));
  const teams = await Promise.all(p.picks.map((x) => teamInEra(x.teamId, x.era)));
  const resultData = { ...result, hard: p.hard, mode: p.mode ?? 'eras', teams: p.picks.map((x, i) => ({ slot: x.slot, team: teams[i] ? `${teams[i]!.location} ${teams[i]!.name}`.trim() : '', abbr: teams[i]?.abbreviation ?? '', logoUrl: mlbLogo(x.teamId), era: x.era })) };
  const id = await saveResult(s, ctx, MLB_GAME, resultData, result.score, result.wins === 162);
  return { id, result: resultData, daily: s.isDaily };
}
