/**
 * One-off data probes, logged from the worker (the dev container cannot reach these hosts). Each logs what a
 * source returns so a feature is built only on what it actually serves. Remove a probe once its feature ships.
 */
type Json = Record<string, unknown>;
async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<{ status: number; j: Json | null; text?: string }> {
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
    const text = await r.text();
    try { return { status: r.status, j: JSON.parse(text) as Json }; } catch { return { status: r.status, j: null, text: text.slice(0, 600) }; }
  } catch (e) { return { status: 0, j: null, text: (e as Error).message }; }
}
const keys = (j: Json | null) => (j ? Object.keys(j).slice(0, 12).join(',') : '-');
const count = (j: Json | null) => (j ? (j.count ?? (Array.isArray(j.items) ? (j.items as unknown[]).length : '?')) : '-');

/** Pre-1985 NBA: does ESPN's web stats endpoint carry full careers, and what does stats.nba.com allow? */
export async function probeOldNba() {
  const out: string[] = [];
  const core = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba';
  for (const y of [1965, 1975, 1982]) {
    const t = await fetchJson(`${core}/seasons/${y}/teams?limit=50`);
    const a = await fetchJson(`${core}/seasons/${y}/athletes?limit=5`);
    const first = ((t.j?.items as { $ref: string }[] | undefined) ?? [])[0]?.$ref?.match(/teams\/(\d+)/)?.[1];
    const ta = first ? await fetchJson(`${core}/seasons/${y}/teams/${first}/athletes?limit=50`) : null;
    const tr = first ? await fetchJson(`${core}/seasons/${y}/teams/${first}/roster`) : null;
    out.push(`core ${y}: teams ${t.status}/${count(t.j)} athletes ${a.status}/${count(a.j)} team${first}-athletes ${ta?.status}/${count(ta?.j ?? null)} roster ${tr?.status}/${keys(tr?.j ?? null)}`);
  }
  for (const q of ['wilt chamberlain', 'kareem abdul-jabbar', 'julius erving']) {
    const s = await fetchJson(`https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(q)}&limit=3&type=player`);
    const hit = JSON.stringify(s.j ?? {}).match(/"uid":"s:40~l:46~a:(\d+)"/);
    const id = hit?.[1];
    if (!id) { out.push(`search ${q}: ${s.status} no nba id (${JSON.stringify(s.j ?? s.text).slice(0, 200)})`); continue; }
    const st = await fetchJson(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${id}/stats`);
    const cats = (st.j?.categories as { name: string; labels?: string[]; statistics?: { season?: { displayName?: string }; teamSlug?: string; teamId?: string; stats?: string[] }[] }[] | undefined) ?? [];
    const avg = cats.find((c) => /average/i.test(c.name)) ?? cats[0];
    const rows = avg?.statistics ?? [];
    out.push(`stats ${q} (${id}): ${st.status} cats ${cats.map((c) => c.name).join('/')} labels ${avg?.labels?.join(',')} seasons ${rows.length} first ${JSON.stringify(rows[0] ?? {}).slice(0, 220)}`);
  }
  const robots = await fetchJson('https://stats.nba.com/robots.txt', { 'User-Agent': 'Mozilla/5.0' });
  out.push(`stats.nba.com robots ${robots.status}: ${(robots.text ?? '').replace(/\s+/g, ' ').slice(0, 400)}`);
  console.log('[probe] old nba\n' + out.join('\n'));
}

/** College football and men's basketball on ESPN: teams, team-season leaders and rankings. */
export async function probeCollege() {
  const out: string[] = [];
  for (const [sport, league, season, team] of [['football', 'college-football', 2025, 333], ['basketball', 'mens-college-basketball', 2025, 150], ['basketball', 'womens-college-basketball', 2025, 2579]] as const) {
    const core = `https://sports.core.api.espn.com/v2/sports/${sport}/leagues/${league}`;
    const teams = await fetchJson(`${core}/seasons/${season}/teams?limit=1000`);
    const lead = await fetchJson(`${core}/seasons/${season}/types/2/teams/${team}/leaders`);
    const cats = (lead.j?.categories as { name: string; leaders?: unknown[] }[] | undefined) ?? [];
    const old = await fetchJson(`${core}/seasons/2005/types/2/teams/${team}/leaders`);
    const oldCats = (old.j?.categories as { name: string; leaders?: unknown[] }[] | undefined) ?? [];
    const firstRef = (cats[0]?.leaders?.[0] as { athlete?: { $ref?: string }; displayValue?: string } | undefined);
    const ath = firstRef?.athlete?.$ref ? await fetchJson(firstRef.athlete.$ref.replace(/^http:/, 'https:')) : null;
    const rank = await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/rankings`);
    const polls = (rank.j?.rankings as { name: string; ranks?: unknown[] }[] | undefined) ?? [];
    out.push(`${league}: teams ${teams.status}/${count(teams.j)}; leaders ${season} ${lead.status} ${cats.map((c) => `${c.name}:${c.leaders?.length ?? 0}`).join(' ')}; leaders 2005 ${old.status} cats ${oldCats.length}; first leader ${ath?.status} ${String(ath?.j?.fullName ?? '-')} ${String((ath?.j?.position as Json | undefined)?.abbreviation ?? '')} "${firstRef?.displayValue ?? ''}"; rankings ${rank.status} ${polls.map((p) => `${p.name}:${p.ranks?.length ?? 0}`).join(' ')}`);
  }
  console.log('[probe] college\n' + out.join('\n'));
}

/** Larry Bird never reaches nba_players: what do the 1986 Celtics leaders list, and what is his own ESPN record? */
export async function probeBird() {
  const core = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba';
  const out: string[] = [];
  const lead = await fetchJson(`${core}/seasons/1986/types/2/teams/2/leaders`);
  const ids = new Set<string>();
  for (const c of ((lead.j?.categories as { leaders?: { athlete?: { $ref?: string } }[] }[] | undefined) ?? [])) for (const l of c.leaders ?? []) { const m = l.athlete?.$ref?.match(/athletes\/(\d+)/)?.[1]; if (m) ids.add(m); }
  const names = await Promise.all([...ids].slice(0, 20).map(async (id) => { const a = await fetchJson(`${core}/athletes/${id}`); return `${id}:${String(a.j?.fullName ?? a.j?.displayName ?? a.status)}`; }));
  out.push(`1986 BOS leaders ${lead.status}, ${ids.size} athletes: ${names.join(', ')}`);
  const s = await fetchJson(`https://site.web.api.espn.com/apis/search/v2?query=larry%20bird&limit=5&type=player`);
  const hits = [...JSON.stringify(s.j ?? {}).matchAll(/"uid":"s:40~l:46~a:(\d+)"/g)].map((m) => m[1]);
  out.push(`search larry bird: ${s.status} nba ids ${hits.join(',') || 'none'} ${hits.length ? '' : JSON.stringify(s.j ?? s.text).slice(0, 300)}`);
  for (const id of hits.slice(0, 2)) {
    const a = await fetchJson(`${core}/athletes/${id}`);
    const st = await fetchJson(`${core}/seasons/1986/types/2/athletes/${id}/statistics`);
    const sa = await fetchJson(`${core}/seasons/1986/athletes/${id}`);
    out.push(`athlete ${id}: ${a.status} ${String(a.j?.fullName ?? '')} keys ${keys(a.j)}; 1986 athlete ${sa.status} team ${JSON.stringify(sa.j?.team ?? null).slice(0, 120)}; 1986 stats ${st.status} ${JSON.stringify(st.j ?? st.text).slice(0, 300)}`);
  }
  console.log('[probe] bird\n' + out.join('\n'));
}
