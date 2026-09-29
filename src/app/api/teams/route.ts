import { getTeams } from '@/lib/server/data';
import { json, errorJson } from '@/lib/server/request';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const teams = await getTeams();
    return json({
      teams: teams.map((t) => ({ slug: t.slug, name: t.name, city: t.city, abbreviation: t.abbreviation, conference: t.conference, division: t.division, primaryColor: t.primaryColor, logoUrl: t.logoUrl })),
    }, { cacheSeconds: 86400 });
  } catch (e) {
    console.error('[api/teams]', e);
    return errorJson(503, 'Teams are temporarily unavailable');
  }
}
