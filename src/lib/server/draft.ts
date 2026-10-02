import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { loadSession, publicTeams, type GameType, type PublicTeam, type SpinPayload } from './games';
import { FORMATS, MAX_RESPINS, type FormatKey, type PoolKey } from '@/lib/game/seventeen';
import { TRAITS, traitValue } from '@/lib/game/build';

export class DraftError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

export interface DraftState {
  sessionId: string;
  index: number;            // which team is on the clock (0-based)
  total: number;            // teams in this game
  team: PublicTeam | null;  // current team, null when the draft is complete
  respinsLeft: number;
  picks: { teamId: number; id: string; slot?: string; trait?: string; value?: number; name: string; position: string; ovr: number; team: string; teamColor: string; logoUrl: string | null }[];
  done: boolean;
  hard: boolean;
  /** 17-0 only: roster size, player pool and the slots to fill, in order. */
  format?: FormatKey;
  pool?: PoolKey;
  slots?: { key: string; label: string; hint: string }[];
}

/** Hard mode has no re-rolls. */
const respinsLeft = (p: SpinPayload) => (p.hard ? 0 : Math.max(0, MAX_RESPINS - p.respinsUsed));
const teamOpts = (p: SpinPayload) => ({ format: p.format ?? '6', pool: p.pool ?? 'current' }) as const;

/** Builds the client view. Only the team currently on the clock is revealed; future teams stay server-side. */
export async function draftState(sessionId: string, gameType: GameType, p: SpinPayload): Promise<DraftState> {
  const picks = p.picks ?? [];
  const index = picks.length;
  const done = index >= p.teams.length;
  const pickedTeams = picks.map((x) => x.teamId);
  const [current, ...past] = await publicTeams(done ? pickedTeams : [p.teams[index], ...pickedTeams], gameType, p.position, teamOpts(p));
  const pastTeams = done ? [current, ...past] : past;
  // Hard mode: overalls and trait ratings never leave the server until the result page, and the list is
  // alphabetical so its order cannot leak the ranking.
  const hide = <T extends { ovr: number; attrs?: unknown }>(x: T): T => (p.hard ? { ...x, ovr: -1, attrs: undefined } : x);
  const order = <T extends { name: string }>(list: T[]) => (p.hard ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list);
  const team = done ? null : current ? { ...current, players: order(current.players.map(hide)) } : null;
  return {
    sessionId, index, total: p.teams.length, done, hard: !!p.hard,
    team,
    respinsLeft: respinsLeft(p),
    ...(gameType === '17-0' ? { format: teamOpts(p).format, pool: teamOpts(p).pool, slots: FORMATS[teamOpts(p).format].slots.map(({ key, label, hint }) => ({ key, label, hint })) } : {}),
    picks: picks.map((x, i) => {
      const t = pastTeams[i];
      const pl = t?.players.find((y) => y.id === x.id);
      const tr = p.position && x.trait ? TRAITS[p.position].find((t) => t.key === x.trait) : undefined;
      return { ...x, value: !p.hard && tr && pl?.attrs ? traitValue(pl.attrs as never, tr) : undefined, name: pl?.name ?? 'Unknown', position: pl?.position ?? '', ovr: p.hard ? -1 : pl?.ovr ?? 0, team: t ? `${t.city} ${t.name}` : '', teamColor: t?.color ?? '#999', logoUrl: t?.logoUrl ?? null };
    }),
  };
}

async function open(sessionId: string, token: string, gameType: GameType) {
  const s = await loadSession(sessionId, token);
  if (!s || s.gameType !== gameType) throw new DraftError('Session not found. Start a new game.', 403);
  if (s.completed) throw new DraftError('This game is already graded.', 409);
  if (s.expiresAt < new Date()) throw new DraftError('Session expired. Start a new game.', 410);
  return s;
}

export async function respinCurrent(sessionId: string, token: string, gameType: GameType) {
  const s = await open(sessionId, token, gameType);
  const p = s.spinPayload as SpinPayload;
  const index = (p.picks ?? []).length;
  if (index >= p.teams.length) throw new DraftError('The draft is complete.');
  if (p.hard) throw new DraftError('Hard mode has no re-rolls.');
  if (respinsLeft(p) <= 0) throw new DraftError('No re-spins left.');
  const next: SpinPayload = { ...p, teams: [...p.teams], respinsUsed: p.respinsUsed + 1 };
  next.teams[index] = p.reserves[p.respinsUsed];
  await db.update(schema.gameSessions).set({ spinPayload: next }).where(eq(schema.gameSessions.id, s.id));
  return draftState(s.id, gameType, next);
}

export async function pickPlayer(sessionId: string, token: string, gameType: GameType, playerId: string, slot?: string, trait?: string) {
  const s = await open(sessionId, token, gameType);
  const p = s.spinPayload as SpinPayload;
  const picks = p.picks ?? [];
  const index = picks.length;
  if (index >= p.teams.length) throw new DraftError('The draft is complete.');
  const [team] = await publicTeams([p.teams[index]], gameType, p.position, teamOpts(p));
  const player = team.players.find((x) => x.id === playerId);
  if (!player) throw new DraftError(`That player is not on the ${team.name}.`);
  let chosenSlot: string | undefined;
  if (gameType === '17-0') {
    const open = FORMATS[teamOpts(p).format].slots.map((d) => d.key).filter((x) => !picks.some((y) => y.slot === x));
    const fits = (player.slots ?? []).filter((x) => open.includes(x));
    chosenSlot = slot && fits.includes(slot) ? slot : fits[0];
    if (!chosenSlot) throw new DraftError(`Your ${player.slots?.[0] ?? 'slot'} spot is already filled.`);
  }
  let chosenTrait: string | undefined;
  if (gameType === 'build-a-player') {
    const open = TRAITS[p.position!].filter((t) => !picks.some((y) => y.trait === t.key));
    const t = open.find((x) => x.key === trait);
    if (!t) throw new DraftError('Pick an open trait for this player.');
    chosenTrait = t.key;
  }
  const next: SpinPayload = { ...p, picks: [...picks, { teamId: team.id, id: player.id, slot: chosenSlot, trait: chosenTrait }] };
  await db.update(schema.gameSessions).set({ spinPayload: next }).where(eq(schema.gameSessions.id, s.id));
  return draftState(s.id, gameType, next);
}
