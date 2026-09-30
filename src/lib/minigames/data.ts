import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { positionGroup } from '@/lib/game/attributes';
import type { GameData } from './types';

let cache: { at: number; data: GameData } | null = null;

/** All active players and teams, flattened for puzzle generation. In-memory for 10 minutes. */
export async function loadGameData(): Promise<GameData> {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.data;
  const [teams, players] = await Promise.all([
    db.select().from(schema.teams),
    db.select().from(schema.players).where(eq(schema.players.isActive, true)),
  ]);
  const tmap = new Map(teams.map((t) => [t.id, t]));
  const data: GameData = {
    teams: teams.map((t) => ({ id: t.id, abbr: t.abbreviation, name: t.name, city: t.city, color: t.primaryColor, logoUrl: t.logoUrl, conference: t.conference, division: t.division })),
    players: players.filter((p) => p.teamId && tmap.has(p.teamId)).map((p) => {
      const t = tmap.get(p.teamId!)!;
      return {
        id: p.id, name: p.fullName, slug: p.slug, position: p.position, group: positionGroup(p.position), ovr: p.overallRating,
        teamId: t.id, team: t.abbreviation, teamName: `${t.city} ${t.name}`, teamColor: t.primaryColor, logoUrl: t.logoUrl,
        conference: t.conference, division: t.division,
        college: p.college, age: p.age, yearsPro: p.yearsPro, heightInches: p.heightInches, weightLbs: p.weightLbs,
        jersey: p.jerseyNumber, archetype: p.archetype, img: p.imageBlobUrl ?? p.imageUrl, attrs: (p.attributes ?? {}) as GameData['players'][number]['attrs'],
      };
    }),
  };
  cache = { at: Date.now(), data };
  return data;
}

/** Public player card fields (no ratings unless the game chooses to reveal them). */
export const card = (p: GameData['players'][number]) => ({ id: p.id, name: p.name, position: p.position, team: p.team, teamName: p.teamName, teamColor: p.teamColor, logoUrl: p.logoUrl, img: p.img });
