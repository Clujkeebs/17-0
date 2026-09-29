import { getPlayerBySlug, getTeams, playerGroup } from '@/lib/server/data';
import { json, errorJson } from '@/lib/server/request';
import { ratePlayer } from '@/lib/game/formulas';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return errorJson(404, 'Player not found');
  try {
    const p = await getPlayerBySlug(slug);
    if (!p) return errorJson(404, 'Player not found');
    const team = p.teamId != null ? (await getTeams()).find((t) => t.id === p.teamId) ?? null : null;
    const group = playerGroup(p);
    return json({
      slug: p.slug, fullName: p.fullName, firstName: p.firstName, lastName: p.lastName,
      position: p.position, group, overallRating: p.overallRating, grade: ratePlayer(p.attributes ?? {}, group),
      attributes: p.attributes, archetype: p.archetype, jerseyNumber: p.jerseyNumber, age: p.age, yearsPro: p.yearsPro,
      heightInches: p.heightInches, weightLbs: p.weightLbs, college: p.college, imageUrl: p.imageBlobUrl ?? p.imageUrl,
      ratingsEdition: p.maddenVersion, lastSyncedAt: p.lastSyncedAt, isActive: p.isActive,
      team: team ? { slug: team.slug, name: team.name, city: team.city, abbreviation: team.abbreviation, primaryColor: team.primaryColor } : null,
    }, { cacheSeconds: 86400 });
  } catch (e) {
    console.error('[api/players]', e);
    return errorJson(503, 'Ratings are temporarily unavailable');
  }
}
