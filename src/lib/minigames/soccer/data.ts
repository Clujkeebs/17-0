import { db, schema } from '@/db';
import { leagueName, seasonLabel } from '@/lib/server/soccer-sync';

/** A known current player: on a synced club roster and on a recent goal or assist leader list. */
export interface SStar { key: string; playerId: number; name: string; position: string; nationality: string | null; clubId: number; club: string; clubAbbr: string; clubColor: string; clubLogo: string | null; league: string; img: string }
/** One season on a league leader list. */
export interface SLeader { key: string; playerId: number; name: string; league: string; season: number; seasonLabel: string; goals: number; assists: number; matches: number; club: string; clubAbbr: string; clubColor: string; clubLogo: string | null; img: string }
export interface SClub { id: number; league: string; name: string; abbr: string; color: string; logo: string | null }
export interface SoccerGameData { stars: SStar[]; leaders: SLeader[]; clubs: SClub[] }

const POS: Record<string, string> = { G: 'Goalkeeper', D: 'Defender', M: 'Midfielder', F: 'Forward' };
const headshot = (id: number) => `https://a.espncdn.com/i/headshots/soccer/players/full/${id}.png`;

let cache: { at: number; data: SoccerGameData } | null = null;

/** Soccer minis draw only on players fans would know: those on a recent league goal or assist leader list. Cached 10 minutes. */
export async function loadSoccerGameData(): Promise<SoccerGameData> {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.data;
  const [clubRows, players, leaderRows] = await Promise.all([
    db.select().from(schema.soccerClubs),
    db.select().from(schema.soccerPlayers),
    db.select().from(schema.soccerLeaders),
  ]);
  const clubs: SClub[] = clubRows.map((c) => ({ id: c.id, league: c.league, name: c.name, abbr: c.abbreviation, color: c.color ?? '#1F2937', logo: c.logoUrl }));
  const club = new Map(clubs.map((c) => [c.id, c]));
  const onList = new Set(leaderRows.map((l) => l.playerId));
  const stars: SStar[] = players.filter((p) => onList.has(p.id) && club.has(p.clubId)).map((p) => {
    const c = club.get(p.clubId)!;
    return { key: `s:${p.id}`, playerId: p.id, name: p.name, position: POS[p.position] ?? p.position, nationality: p.nationality, clubId: c.id, club: c.name, clubAbbr: c.abbr, clubColor: c.color, clubLogo: c.logo, league: p.league, img: headshot(p.id) };
  });
  const leaders: SLeader[] = leaderRows.map((l) => {
    const c = l.clubId ? club.get(l.clubId) : undefined;
    return { key: `l:${l.league}:${l.season}:${l.playerId}`, playerId: l.playerId, name: l.name, league: l.league, season: l.season, seasonLabel: `${leagueName(l.league)} ${seasonLabel(l.league, l.season)}`, goals: l.goals, assists: l.assists, matches: l.matches, club: c?.name ?? '', clubAbbr: c?.abbr ?? '', clubColor: c?.color ?? '#1F2937', clubLogo: c?.logo ?? null, img: headshot(l.playerId) };
  });
  const data = { stars, leaders, clubs };
  cache = { at: Date.now(), data };
  return data;
}

export const scard = (s: SStar) => ({ id: s.key, name: s.name, position: `${s.position} · ${leagueName(s.league)}`, team: s.clubAbbr, teamName: s.club, teamColor: s.clubColor, logoUrl: s.clubLogo, img: s.img });
export const lcard = (l: SLeader) => ({ id: l.key, name: l.name, position: l.seasonLabel, team: l.clubAbbr, teamName: l.club, teamColor: l.clubColor, logoUrl: l.clubLogo, img: l.img });
export const clubCard = (c: SClub) => ({ id: `c:${c.id}`, name: c.name, position: leagueName(c.league), team: c.abbr, teamName: c.name, teamColor: c.color, logoUrl: c.logo, img: c.logo });
