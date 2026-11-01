import { and, eq, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import photos from '../../../data/nba-history/photos.json';

/**
 * Free Wikimedia Commons photos for NBA players ESPN has no headshot for (mostly the 1990s), built offline by
 * scripts/build-nba-photos.mjs and credited on /credits. Runs from the web seed: fills a headshot only where there is
 * none, so a photo ESPN adds later wins. Bump PHOTOS_VERSION when the data file changes.
 */
export const PHOTOS_VERSION = 1;
const CONFIG_KEY = 'photos_version';

type Row = [espnId: number, name: string, photo: string, credit: string, photoPage: string | null, wikipedia: string];
const data = photos as unknown as { players: Row[] };

/** Every photo with its credit, by player name, for the credits page. */
export const photoCredits = () => data.players.map(([, name, , credit, page]) => ({ name, credit, page })).sort((a, b) => a.name.localeCompare(b.name));

export async function loadNbaPhotos(): Promise<{ skipped: true } | { filled: number; of: number }> {
  const [ver] = await db.select().from(schema.gameConfigs).where(and(eq(schema.gameConfigs.gameType, '82-0'), eq(schema.gameConfigs.configKey, CONFIG_KEY))).limit(1);
  if (Number(ver?.configValue ?? 0) >= PHOTOS_VERSION) return { skipped: true };
  const rows = JSON.stringify(data.players.map((p) => ({ id: p[0], url: p[2] })));
  const filled = await db.execute<{ id: number }>(dsql`
    update nba_players p set headshot = v.url
    from json_to_recordset(${rows}::json) as v(id int, url text)
    where p.id = v.id and p.headshot is null
    returning p.id`);
  if (ver) await db.update(schema.gameConfigs).set({ configValue: PHOTOS_VERSION, updatedAt: new Date() }).where(eq(schema.gameConfigs.id, ver.id));
  else await db.insert(schema.gameConfigs).values({ gameType: '82-0', configKey: CONFIG_KEY, configValue: PHOTOS_VERSION, updatedBy: 'nba-photos' });
  return { filled: filled.length, of: data.players.length };
}
