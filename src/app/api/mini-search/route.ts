import { loadGameData } from '@/lib/minigames/data';
import { json } from '@/lib/server/request';

export const runtime = 'nodejs';

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '');

/** Typeahead over active players for guess games. ?q=&pos= (optional position group). */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = norm(u.searchParams.get('q') ?? '').trim();
  const pos = u.searchParams.get('pos');
  if (q.length < 2) return json({ results: [] });
  const { players } = await loadGameData();
  const results = players
    .filter((p) => (!pos || p.group === pos) && norm(p.name).split(' ').some((w) => w.startsWith(q.split(' ')[0])) && norm(p.name).includes(q))
    .sort((a, b) => b.ovr - a.ovr).slice(0, 8)
    .map((p) => ({ id: p.id, name: p.name, position: p.position, team: p.team, teamColor: p.teamColor, img: p.img }));
  return json({ results }, { cacheSeconds: 300 });
}
