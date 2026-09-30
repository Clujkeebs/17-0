export const FIRST_SEASON = 1996;

/** NFL season year currently covered by the live ratings. A new edition ships in August. */
export function currentSeason(now = new Date()): number {
  return now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

export function seasonYears(): number[] {
  const out: number[] = [];
  for (let y = currentSeason(); y >= FIRST_SEASON; y--) out.push(y);
  return out;
}

/** Descriptive edition name for the ratings set that covered a season. */
export function editionFor(season: number): string {
  const n = season + 1;
  const label = n >= 2000 && n <= 2005 ? String(n) : String(n % 100).padStart(2, '0');
  return `EA Sports Madden NFL ${label}`;
}

export interface Era { key: string; name: string; from: number; to: number; summary: string }

export const ERAS: Era[] = [
  { key: 'disc', name: 'The roster-on-disc years', from: 1996, to: 1999,
    summary: 'Ratings shipped on the disc and mostly stayed put for the year. Attribute lists were short, and a player\'s overall was a rough sketch rather than a scouting report.' },
  { key: 'franchise', name: 'The franchise-mode build-out', from: 2000, to: 2005,
    summary: 'Attribute lists grew and franchise modes made ratings matter across multiple seasons. Ratings were still largely set at release and argued about for a full year.' },
  { key: 'online', name: 'The online update era', from: 2006, to: 2013,
    summary: 'Downloadable roster updates became normal, so a rating could move during the season. The number started to track performance instead of reputation alone.' },
  { key: 'reveal', name: 'Ratings as an event', from: 2014, to: 2019,
    summary: 'Ratings reveals turned into a preseason ritual, and players started arguing with their own numbers in public. More attributes, more granular archetypes, more scrutiny.' },
  { key: 'live', name: 'The live ratings era', from: 2020, to: 9999,
    summary: 'In-season adjustments are routine and the attribute set is the most granular it has been. This is the era Unbeaten is built on: the ratings behind every page here come from the current edition.' },
];

export const eraFor = (y: number) => ERAS.find((e) => y >= e.from && y <= e.to) ?? ERAS[ERAS.length - 1];
