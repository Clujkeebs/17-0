import { getCoachBySlug, getTeams } from '@/lib/server/data';
import { json, errorJson } from '@/lib/server/request';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return errorJson(404, 'Coach not found');
  try {
    const c = await getCoachBySlug(slug);
    if (!c) return errorJson(404, 'Coach not found');
    const team = c.teamId != null ? (await getTeams()).find((t) => t.id === c.teamId) ?? null : null;
    return json({
      slug: c.slug, fullName: c.fullName, imageUrl: c.imageUrl, coachImpactScore: c.coachImpactScore,
      careerWins: c.careerWins, careerLosses: c.careerLosses, superBowlWins: c.superBowlWins, yearsWithTeam: c.yearsWithTeam,
      recent3yrWinPct: c.recent3yrWinPct / 1000, playoffAppearances3yr: c.playoffAppearances3yr, impactHistory: c.impactHistory,
      team: team ? { slug: team.slug, name: team.name, city: team.city, abbreviation: team.abbreviation } : null,
    }, { cacheSeconds: 86400 });
  } catch (e) {
    console.error('[api/coaches]', e);
    return errorJson(503, 'Coaches are temporarily unavailable');
  }
}
