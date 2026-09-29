/**
 * The 32 NFL teams. Static reference data; the ratings sync never rewrites these rows.
 * logoUrl uses ESPN's public CDN team codes (note: wsh, not was).
 */
export interface SeedTeam {
  slug: string;
  name: string;
  abbreviation: string;
  city: string;
  conference: 'AFC' | 'NFC';
  division: string;
  primaryColor: string;
  espnCode: string;
  logoUrl: string;
}

type Row = [city: string, name: string, abbr: string, conf: 'AFC' | 'NFC', div: string, color: string, espn: string];

const ROWS: Row[] = [
  ['Buffalo', 'Bills', 'BUF', 'AFC', 'AFC East', '#00338D', 'buf'],
  ['Miami', 'Dolphins', 'MIA', 'AFC', 'AFC East', '#008E97', 'mia'],
  ['New England', 'Patriots', 'NE', 'AFC', 'AFC East', '#002244', 'ne'],
  ['New York', 'Jets', 'NYJ', 'AFC', 'AFC East', '#125740', 'nyj'],
  ['Baltimore', 'Ravens', 'BAL', 'AFC', 'AFC North', '#241773', 'bal'],
  ['Cincinnati', 'Bengals', 'CIN', 'AFC', 'AFC North', '#FB4F14', 'cin'],
  ['Cleveland', 'Browns', 'CLE', 'AFC', 'AFC North', '#311D00', 'cle'],
  ['Pittsburgh', 'Steelers', 'PIT', 'AFC', 'AFC North', '#FFB612', 'pit'],
  ['Houston', 'Texans', 'HOU', 'AFC', 'AFC South', '#03202F', 'hou'],
  ['Indianapolis', 'Colts', 'IND', 'AFC', 'AFC South', '#002C5F', 'ind'],
  ['Jacksonville', 'Jaguars', 'JAX', 'AFC', 'AFC South', '#006778', 'jax'],
  ['Tennessee', 'Titans', 'TEN', 'AFC', 'AFC South', '#0C2340', 'ten'],
  ['Denver', 'Broncos', 'DEN', 'AFC', 'AFC West', '#FB4F14', 'den'],
  ['Kansas City', 'Chiefs', 'KC', 'AFC', 'AFC West', '#E31837', 'kc'],
  ['Las Vegas', 'Raiders', 'LV', 'AFC', 'AFC West', '#000000', 'lv'],
  ['Los Angeles', 'Chargers', 'LAC', 'AFC', 'AFC West', '#0080C6', 'lac'],
  ['Dallas', 'Cowboys', 'DAL', 'NFC', 'NFC East', '#041E42', 'dal'],
  ['New York', 'Giants', 'NYG', 'NFC', 'NFC East', '#0B2265', 'nyg'],
  ['Philadelphia', 'Eagles', 'PHI', 'NFC', 'NFC East', '#004C54', 'phi'],
  ['Washington', 'Commanders', 'WAS', 'NFC', 'NFC East', '#5A1414', 'wsh'],
  ['Chicago', 'Bears', 'CHI', 'NFC', 'NFC North', '#0B162A', 'chi'],
  ['Detroit', 'Lions', 'DET', 'NFC', 'NFC North', '#0076B6', 'det'],
  ['Green Bay', 'Packers', 'GB', 'NFC', 'NFC North', '#203731', 'gb'],
  ['Minnesota', 'Vikings', 'MIN', 'NFC', 'NFC North', '#4F2683', 'min'],
  ['Atlanta', 'Falcons', 'ATL', 'NFC', 'NFC South', '#A71930', 'atl'],
  ['Carolina', 'Panthers', 'CAR', 'NFC', 'NFC South', '#0085CA', 'car'],
  ['New Orleans', 'Saints', 'NO', 'NFC', 'NFC South', '#D3BC8D', 'no'],
  ['Tampa Bay', 'Buccaneers', 'TB', 'NFC', 'NFC South', '#D50A0A', 'tb'],
  ['Arizona', 'Cardinals', 'ARI', 'NFC', 'NFC West', '#97233F', 'ari'],
  ['Los Angeles', 'Rams', 'LAR', 'NFC', 'NFC West', '#003594', 'lar'],
  ['San Francisco', '49ers', 'SF', 'NFC', 'NFC West', '#AA0000', 'sf'],
  ['Seattle', 'Seahawks', 'SEA', 'NFC', 'NFC West', '#002244', 'sea'],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const TEAMS: SeedTeam[] = ROWS.map(([city, name, abbreviation, conference, division, primaryColor, espnCode]) => ({
  slug: slug(`${city} ${name}`),
  name,
  abbreviation,
  city,
  conference,
  division,
  primaryColor,
  espnCode,
  logoUrl: `https://a.espncdn.com/i/teamlogos/nfl/500/${espnCode}.png`,
}));

export const TEAM_BY_ABBR: Record<string, SeedTeam> = Object.fromEntries(TEAMS.map((t) => [t.abbreviation, t]));
