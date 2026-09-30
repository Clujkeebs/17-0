import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { loadSession, publicTeams, type GameType, type PublicTeam, type SpinPayload } from './games';
import { MAX_RESPINS, SLOTS, type Slot } from '@/lib/game/seventeen';
import { TRAITS, traitValue } from '@/lib/game/build';

export class DraftError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

export interface DraftState {
  sessionId: string;
  index: number;            // which team is on the clock (0-based)
  total: number;            // teams in this game
  team: PublicTeam | null;  // current team, null when the draft is complete
  respinsLeft: number;
  picks: { teamId: number; id: string; slot?: Slot; trait?: string; value?: number; name: string; position: string; ovr: number; team: string; teamColor: string; logoUrl: string | null }[];
  done: boolean;
}

/** Builds the client view. Only the team currently on the clock is revealed; future teams stay server-side. */
export async function draftState(sessionId: string, gameType: GameType, p: SpinPayload): Promise<DraftState> {
  const picks = p.picks ?? [];
  const index = picks.length;
  const done = index >= p.teams.length;
  const pickedTeams = picks.map((x) => x.teamId);
  const [current, ...past] = await publicTeams(done ? pickedTeams : [p.teams[index], ...pickedTeams], gameType, p.position);
  const pastTeams = done ? [current, ...past] : past;
  return {
    sessionId, index, total: p.teams.length, done,
    team: done ? null : current,
    respinsLeft: MAX_RESPINS - p.respinsUsed,
    picks: picks.map((x, i) => {
      const t = pastTeams[i];
      const pl = t?.players.find((y) => y.id === x.id);
      const tr = p.position && x.trait ? TRAITS[p.position].find((t) => t.key === x.trait) : undefined;
      return { ...x, value: tr && pl?.attrs ? traitValue(pl.attrs as never, tr) : undefined, name: pl?.name ?? 'Unknown', position: pl?.position ?? '', ovr: pl?.ovr ?? 0, team: t ? `${t.city} ${t.name}` : '', teamColor: t?.color ?? '#999', logoUrl: t?.logoUrl ?? null };
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
  if (p.respinsUsed >= MAX_RESPINS) throw new DraftError('No re-spins left.');
  const next: SpinPayload = { ...p, teams: [...p.teams], respinsUsed: p.respinsUsed + 1 };
  next.teams[index] = p.reserves[p.respinsUsed];
  await db.update(schema.gameSessions).set({ spinPayload: next }).where(eq(schema.gameSessions.id, s.id));
  return draftState(s.id, gameType, next);
}

export async function pickPlayer(sessionId: string, token: string, gameType: GameType, playerId: string, slot?: Slot, trait?: string) {
  const s = await open(sessionId, token, gameType);
  const p = s.spinPayload as SpinPayload;
  const picks = p.picks ?? [];
  const index = picks.length;
  if (index >= p.teams.length) throw new DraftError('The draft is complete.');
  const [team] = await publicTeams([p.teams[index]], gameType, p.position);
  const player = team.players.find((x) => x.id === playerId);
  if (!player) throw new DraftError(`That player is not on the ${team.name}.`);
  let chosenSlot: Slot | undefined;
  if (gameType === '17-0') {
    const open = SLOTS.filter((x) => !picks.some((y) => y.slot === x));
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
