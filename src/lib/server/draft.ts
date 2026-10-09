import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { loadSession, publicTeams, type GameType, type PublicTeam, type SpinPayload } from './games';
import { FORMATS, MAX_RESPINS, respinsFor, type FormatKey, type PoolKey } from '@/lib/game/seventeen';
import { TRAITS, traitValue } from '@/lib/game/build';
import { getTeams } from './data';
import { firstAllowed, spinKey } from '@/lib/game/spin-order';

/**
 * The 53 runs long enough that a team can come up with nobody left for your open spots (its only punter is
 * already yours). Such a board is swapped, deterministically, for the next franchise that has someone eligible.
 */
async function ensurePlayable(gameType: GameType, p: SpinPayload): Promise<SpinPayload> {
  const format = p.format ?? '6';
  if (gameType !== '17-0' || !FORMATS[format].repeatTeams) return p;
  const picks = p.picks ?? [], index = picks.length;
  if (index >= p.teams.length) return p;
  const open = FORMATS[format].slots.map((d) => d.key).filter((k) => !picks.some((x) => x.slot === k));
  const taken = new Set(picks.map((x) => x.id));
  const ids = (await getTeams()).map((t) => t.id).sort((a, b) => a - b);
  const start = Math.max(0, ids.indexOf(p.teams[index]));
  for (let i = 0; i < ids.length; i++) {
    const id = ids[(start + i) % ids.length];
    const [t] = await publicTeams([id], gameType, p.position, teamOpts(p));
    if (t?.players.some((x) => !taken.has(x.id) && x.slots?.some((k) => open.includes(k)))) {
      if (id === p.teams[index]) return p;
      const teams = [...p.teams]; teams[index] = id;
      return { ...p, teams };
    }
  }
  return p;
}

export class DraftError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

export interface DraftState {
  sessionId: string;
  index: number;            // which team is on the clock (0-based)
  total: number;            // teams in this game
  team: PublicTeam | null;  // current team, null when the draft is complete
  respinsLeft: number;
  picks: { teamId: number; id: string; slot?: string; trait?: string; value?: number; name: string; position: string; ovr: number; fpts?: number; team: string; teamColor: string; logoUrl: string | null }[];
  done: boolean;
  hard: boolean;
  /** 17-0 only: roster size, player pool and the slots to fill, in order. */
  format?: FormatKey;
  pool?: PoolKey;
  slots?: { key: string; label: string; hint: string }[];
}

/** Hard mode has no re-rolls. */
const respinsLeft = (p: SpinPayload) => (p.hard ? 0 : Math.max(0, (p.format ? respinsFor(p.format) : MAX_RESPINS) - p.respinsUsed));
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
  const hide = <T extends { ovr: number; attrs?: unknown; fpts?: number; line?: string }>(x: T): T => (p.hard ? { ...x, ovr: -1, attrs: undefined, line: undefined, ...(x.fpts !== undefined ? { fpts: -1 } : {}) } : x);
  const order = <T extends { name: string }>(list: T[]) => (p.hard ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list);
  // When teams come around again (the 53), players already on your roster are off the board.
  const taken = new Set(picks.map((x) => x.id));
  const team = done ? null : current ? { ...current, players: order(current.players.filter((x) => !taken.has(x.id)).map(hide)) } : null;
  return {
    sessionId, index, total: p.teams.length, done, hard: !!p.hard,
    team,
    respinsLeft: respinsLeft(p),
    ...(gameType === '17-0' ? { format: teamOpts(p).format, pool: teamOpts(p).pool, slots: FORMATS[teamOpts(p).format].slots.map(({ key, label, hint }) => ({ key, label, hint })) } : {}),
    picks: picks.map((x, i) => {
      const t = pastTeams[i];
      const pl = t?.players.find((y) => y.id === x.id);
      const tr = p.position && x.trait ? TRAITS[p.position].find((t) => t.key === x.trait) : undefined;
      return { ...x, value: !p.hard && tr && pl?.attrs ? traitValue(pl.attrs as never, tr) : undefined, name: pl?.name ?? 'Unknown', position: pl?.position ?? '', ovr: p.hard ? -1 : pl?.ovr ?? 0, ...(pl?.fpts !== undefined ? { fpts: p.hard ? -1 : pl.fpts } : {}), team: t ? `${t.city} ${t.name}` : '', teamColor: t?.color ?? '#999', logoUrl: t?.logoUrl ?? null };
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
  const next: SpinPayload = { ...p, teams: [...p.teams], reserves: [...p.reserves], respinsUsed: p.respinsUsed + 1 };
  const repeat = gameType === '17-0' && FORMATS[teamOpts(p).format].repeatTeams;
  const n = p.roundRespins?.[index] ?? 0;
  // The n-th re-spin of this round comes from one seeded order of every team, so Today's re-spins match for everyone.
  const pick = p.respinPool && firstAllowed(spinKey(gameType, s.seed, index, 'team', n), p.respinPool, (t) => t !== p.teams[index] && (repeat || !p.teams.includes(t)));
  if (pick !== undefined) {
    next.teams[index] = pick;
    next.roundRespins = [...(p.roundRespins ?? [])];
    next.roundRespins[index] = n + 1;
  } else {
    // Sessions started before re-spins were keyed by round use the old shared reserve list.
    // When teams repeat (the 53), a reserve can be the team already on the clock; trade it for a later one.
    const later = next.reserves.findIndex((t, i) => i > p.respinsUsed && t !== p.teams[index]);
    if (next.reserves[p.respinsUsed] === p.teams[index] && later > 0) [next.reserves[p.respinsUsed], next.reserves[later]] = [next.reserves[later], next.reserves[p.respinsUsed]];
    next.teams[index] = next.reserves[p.respinsUsed];
  }
  const ready = await ensurePlayable(gameType, next);
  await db.update(schema.gameSessions).set({ spinPayload: ready }).where(eq(schema.gameSessions.id, s.id));
  return draftState(s.id, gameType, ready);
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
  if (picks.some((x) => x.id === playerId)) throw new DraftError(`${player.name} is already on your roster.`);
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
  const next = await ensurePlayable(gameType, { ...p, picks: [...picks, { teamId: team.id, id: player.id, slot: chosenSlot, trait: chosenTrait }] });
  await db.update(schema.gameSessions).set({ spinPayload: next }).where(eq(schema.gameSessions.id, s.id));
  return draftState(s.id, gameType, next);
}
