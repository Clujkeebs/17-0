import { and, eq, inArray, isNotNull, or } from 'drizzle-orm';
import { db, schema } from '@/db';
import { GROUP_RAW } from './data';
import { resolvePlayerImage } from './images';
import { positionGroup } from '@/lib/game/attributes';
import { fantasyValue } from '@/lib/game/fantasy';
import type { FPlayer, FPos } from '@/lib/fantasy/rank';

let cache: { at: number; players: FPlayer[] } | null = null;

/** Every current skill player with Sleeper points or a projection, with his blended value. Cached ten minutes. */
export async function loadFantasyPlayers(): Promise<FPlayer[]> {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.players;
  const raws = [...GROUP_RAW.QB, ...GROUP_RAW.RB, ...GROUP_RAW.WR, ...GROUP_RAW.TE];
  const [rows, teams] = await Promise.all([
    db.select().from(schema.players).where(and(eq(schema.players.isActive, true), eq(schema.players.isAllTimeGreat, false), inArray(schema.players.position, raws),
      or(isNotNull(schema.players.fantasyPpg), isNotNull(schema.players.fantasyProjPpg)))),
    db.select().from(schema.teams),
  ]);
  const tmap = new Map(teams.map((t) => [t.id, t]));
  const players: FPlayer[] = rows.filter((p) => p.teamId != null).map((p) => {
    const t = tmap.get(p.teamId!);
    return {
      id: p.id, slug: p.slug, name: p.fullName, pos: positionGroup(p.position) as FPos, team: t?.abbreviation ?? '', teamColor: t?.primaryColor ?? '#0A0A0A', logoUrl: t?.logoUrl ?? null,
      img: resolvePlayerImage(p), value: fantasyValue(p.fantasyPpg, p.fantasyGames, p.fantasyProjPpg, p.fantasyRecent),
      recent: p.fantasyRecent, ppg: p.fantasyPpg, proj: p.fantasyProjPpg, games: p.fantasyGames ?? 0, popularity: p.sleeperRank, trend: p.fantasyTrend ?? 0,
    };
  }).filter((p) => p.value > 0);
  cache = { at: Date.now(), players };
  return players;
}
