// Turns the crawl (scripts/crawl-nba-history.mjs) into data/nba-history/history.json, the file the 82-0 loader reads.
//   node scripts/build-nba-history.mjs [--raw /tmp/claude-0/nbahist-raw.json] [--out data/nba-history/history.json] [--espn players.json]
// --espn takes a dump of ESPN's players from a database that has run the sync ([{ id, name, seasons: [1985, ...] }]). A player
// whose career reaches 1985 or later is already in that sync, and the two records must be one person: same name, same seasons.
// Everyone else gets a stable id of their own above a billion.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const RAW = arg('raw', '/tmp/claude-0/nbahist-raw.json');
const OUT = arg('out', 'data/nba-history/history.json');
const ESPN = arg('espn', null);
// --photos reads each player's article from the crawl cache for its lead photo, and asks Commons for the photo's author and licence.
const CACHE = arg('cache', '/tmp/claude-0/nbahist-cache');
const PHOTO_CACHE = arg('photo-cache', '/tmp/claude-0/nbahist-photos.json');
const UA = 'UnbeatenBot/1.0 (https://playunbeaten.com; NBA history photo credits; one request at a time)';
const FIRST = Number(arg('first', 1960)), LAST = Number(arg('last', 1989));

/** ESPN's franchise ids (one id per franchise through moves), the colors of each, and ESPN's logo code where the team still has its name and city. */
const FRANCHISES = {
  1: { color: '#E03A3E' }, 2: { color: '#007A33' }, 3: { color: '#1D1160' }, 4: { color: '#CE1141' }, 5: { color: '#860038' }, 6: { color: '#00538C' }, 7: { color: '#0E2240' }, 8: { color: '#C8102E' },
  9: { color: '#1D428A' }, 10: { color: '#CE1141' }, 11: { color: '#002D62' }, 12: { color: '#C8102E' }, 13: { color: '#552583' }, 14: { color: '#98002E' }, 15: { color: '#00471B' },
  17: { color: '#002A60' }, 18: { color: '#F58426' }, 20: { color: '#006BB6' }, 21: { color: '#E56020' }, 22: { color: '#E03A3E' }, 23: { color: '#5A2D81' },
  24: { color: '#8A8D8F' }, 25: { color: '#00653A' }, 26: { color: '#4B2E83' }, 27: { color: '#002B5C' },
};
/**
 * Each franchise under its name in each span of seasons (end years), as [from, to, location, nickname, abbreviation, ESPN logo code].
 * A logo code is set only where the team still has its name and city, so a Seattle jersey never wears Oklahoma City's logo.
 * A season outside every span means the franchise did not play in the NBA then (the ABA years of the Nuggets, Pacers, Spurs and Nets).
 */
const SPANS = {
  1: [[1946, 1968, 'St. Louis', 'Hawks', 'STL', null], [1969, 2100, 'Atlanta', 'Hawks', 'ATL', 'atl']],
  2: [[1946, 2100, 'Boston', 'Celtics', 'BOS', 'bos']],
  4: [[1967, 2100, 'Chicago', 'Bulls', 'CHI', 'chi']],
  5: [[1971, 2100, 'Cleveland', 'Cavaliers', 'CLE', 'cle']],
  7: [[1977, 2100, 'Denver', 'Nuggets', 'DEN', 'den']],
  8: [[1958, 2100, 'Detroit', 'Pistons', 'DET', 'det']],
  9: [[1946, 1962, 'Philadelphia', 'Warriors', 'PHW', null], [1963, 1971, 'San Francisco', 'Warriors', 'SF', null], [1972, 2100, 'Golden State', 'Warriors', 'GS', 'gs']],
  10: [[1968, 1971, 'San Diego', 'Rockets', 'SD', null], [1972, 2100, 'Houston', 'Rockets', 'HOU', 'hou']],
  11: [[1977, 2100, 'Indiana', 'Pacers', 'IND', 'ind']],
  3: [[1989, 2002, 'Charlotte', 'Hornets', 'CHA', null]],
  6: [[1981, 2100, 'Dallas', 'Mavericks', 'DAL', 'dal']],
  12: [[1971, 1978, 'Buffalo', 'Braves', 'BUF', null], [1979, 1984, 'San Diego', 'Clippers', 'SD', null], [1985, 2100, 'Los Angeles', 'Clippers', 'LAC', 'lac']],
  14: [[1989, 2100, 'Miami', 'Heat', 'MIA', 'mia']],
  13: [[1946, 1960, 'Minneapolis', 'Lakers', 'MNL', null], [1961, 2100, 'Los Angeles', 'Lakers', 'LAL', 'lal']],
  15: [[1969, 2100, 'Milwaukee', 'Bucks', 'MIL', 'mil']],
  17: [[1977, 1977, 'New York', 'Nets', 'NY', null], [1978, 2011, 'New Jersey', 'Nets', 'NJ', null]],
  18: [[1946, 2100, 'New York', 'Knicks', 'NY', 'ny']],
  20: [[1946, 1963, 'Syracuse', 'Nationals', 'SYR', null], [1964, 2100, 'Philadelphia', '76ers', 'PHI', 'phi']],
  21: [[1969, 2100, 'Phoenix', 'Suns', 'PHX', 'phx']],
  22: [[1971, 2100, 'Portland', 'Trail Blazers', 'POR', 'por']],
  23: [[1946, 1972, 'Cincinnati', 'Royals', 'CIN', null], [1973, 1974, 'Kansas City-Omaha', 'Kings', 'KCO', null], [1975, 1985, 'Kansas City', 'Kings', 'KC', null], [1986, 2100, 'Sacramento', 'Kings', 'SAC', 'sac']],
  24: [[1977, 2100, 'San Antonio', 'Spurs', 'SA', 'sa']],
  25: [[1968, 2008, 'Seattle', 'SuperSonics', 'SEA', null]],
  26: [[1975, 1979, 'New Orleans', 'Jazz', 'NO', null], [1980, 2100, 'Utah', 'Jazz', 'UTAH', 'utah']],
  27: [[1962, 1962, 'Chicago', 'Packers', 'CHP', null], [1963, 1963, 'Chicago', 'Zephyrs', 'CHZ', null], [1964, 1973, 'Baltimore', 'Bullets', 'BAL', null], [1974, 1974, 'Capital', 'Bullets', 'CAP', null], [1975, 1997, 'Washington', 'Bullets', 'WSH', null]],
};
/** Team name as a team-season article spells it -> ESPN franchise id. */
const BY_NAME = {
  'Boston Celtics': 2, 'Minneapolis Lakers': 13, 'Los Angeles Lakers': 13, 'Philadelphia Warriors': 9, 'San Francisco Warriors': 9, 'Golden State Warriors': 9,
  'Syracuse Nationals': 20, 'Philadelphia 76ers': 20, 'New York Knicks': 18, 'Detroit Pistons': 8, 'St. Louis Hawks': 1, 'Atlanta Hawks': 1,
  'Cincinnati Royals': 23, 'Kansas City-Omaha Kings': 23, 'Kansas City Kings': 23, 'Chicago Packers': 27, 'Chicago Zephyrs': 27, 'Baltimore Bullets': 27,
  'Capital Bullets': 27, 'Washington Bullets': 27, 'Chicago Bulls': 4, 'San Diego Rockets': 10, 'Houston Rockets': 10, 'Seattle SuperSonics': 25,
  'Milwaukee Bucks': 15, 'Phoenix Suns': 21, 'Cleveland Cavaliers': 5, 'Buffalo Braves': 12, 'San Diego Clippers': 12, 'Portland Trail Blazers': 22,
  'New Orleans Jazz': 26, 'Utah Jazz': 26, 'Dallas Mavericks': 6, 'Miami Heat': 14, 'Charlotte Hornets': 3, 'Los Angeles Clippers': 12, 'Sacramento Kings': 23, 'New York Nets': 17, 'New Jersey Nets': 17, 'Denver Nuggets': 7, 'Indiana Pacers': 11, 'San Antonio Spurs': 24,
};
/** A city as a career table writes it, when the cell does not link to the team season. */
const BY_CITY = {
  boston: 2, minneapolis: 13, 'los angeles': 13, 'san francisco': 9, 'golden state': 9, syracuse: 20, 'new york': 18, detroit: 8, 'st. louis': 1,
  atlanta: 1, cincinnati: 23, 'kansas city': 23, 'kansas city-omaha': 23, sacramento: 23, baltimore: 27, capital: 27, washington: 27, houston: 10, seattle: 25,
  milwaukee: 15, phoenix: 21, cleveland: 5, buffalo: 12, portland: 22, 'new orleans': 26, utah: 26, dallas: 6, miami: 14, charlotte: 3, 'l.a. clippers': 12, 'la clippers': 12, 'l.a. lakers': 13, 'new jersey': 17, denver: 7, indiana: 11, 'san antonio': 24,
};
const cityFranchise = (text, season) => {
  const t = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (t === 'philadelphia') return season <= 1962 ? 9 : 20;
  if (t === 'chicago') return season <= 1963 ? 27 : 4;
  if (t === 'san diego') return season <= 1971 ? 10 : 12;
  // From 1984-85 Los Angeles has two teams; a cell that names only the city is not placed.
  if (t === 'los angeles') return season >= 1985 ? null : 13;
  return BY_CITY[t] ?? null;
};
/** Franchise in a given season under its name then, or null when it did not play in the NBA. */
export function identity(franchise, season) {
  const span = (SPANS[franchise] ?? []).find(([from, to]) => season >= from && season <= to);
  return span ? { franchise, location: span[2], nickname: span[3], abbr: span[4], logo: span[5] } : null;
}
/** A career-table team cell: the team-season article title when it links to one, otherwise the text or the franchise article. */
export function teamOf(title, season, text) {
  const m = title && /^(\d{4})[–-](\d{2})[_ ](.+?)[_ ]season$/.exec(title);
  if (m) {
    const end = Math.floor(Number(m[1]) / 100) * 100 + Number(m[2]);
    const f = BY_NAME[m[3].replace(/_/g, ' ').replace(/–/g, '-')];
    return f ? identity(f, end) : null;
  }
  const name = title && BY_NAME[title.replace(/_/g, ' ')];
  if (name) return identity(name, season);
  const city = text && cityFranchise(text.replace(/\(.*\)/, ''), season);
  return city ? identity(city, season) : null;
}

const SLOT = { 'point guard': 'PG', 'shooting guard': 'SG', 'small forward': 'SF', 'power forward': 'PF', center: 'C', guard: 'G', forward: 'F' };
const KNOWN = new Set(['PG-SG', 'SG-SF', 'SF-PF', 'PF-C', 'G-F', 'F-C']);
/** "Shooting guard / small forward" -> 'SG-SF' (one of the position keys the 82-0 engine knows), or a single code. */
export function positionOf(infobox, rosterPos) {
  const codes = [];
  for (const part of (infobox ?? '').toLowerCase().split(/\/|,|\band\b/).map((x) => x.trim()).filter(Boolean)) {
    const hit = Object.keys(SLOT).find((k) => part.includes(k));
    if (hit && !codes.includes(SLOT[hit])) codes.push(SLOT[hit]);
  }
  if (!codes.length) {
    const r = (rosterPos ?? '').toUpperCase().replace(/\s/g, '').replace('/', '-');
    if (['G', 'F', 'C', 'PG', 'SG', 'SF', 'PF'].includes(r) || KNOWN.has(r)) return r;
    return r === 'F-G' ? 'G-F' : r === 'C-F' ? 'F-C' : 'F';
  }
  if (codes.length === 1) return codes[0];
  const grp = (c) => (c === 'C' ? 'C' : ['PG', 'SG', 'G'].includes(c) ? 'G' : 'F');
  const [a, b] = codes;
  const key = [a, b].sort((x, y) => ['PG', 'SG', 'G', 'SF', 'PF', 'F', 'C'].indexOf(x) - ['PG', 'SG', 'G', 'SF', 'PF', 'F', 'C'].indexOf(y)).join('-');
  if (KNOWN.has(key)) return key;
  const g = new Set([grp(a), grp(b)]);
  return g.has('G') && g.size === 1 ? 'PG-SG' : g.has('G') && g.has('F') ? 'G-F' : g.has('F') && g.has('C') ? 'F-C' : g.has('G') && g.has('C') ? 'G-F' : 'SF-PF';
}

/** The article title as a name: "Bob_Brown_(basketball,_born_1945)" -> "Bob Brown". */
const nameOf = (title) => { let t = title; try { t = decodeURIComponent(title); } catch { /* keep as is */ } return t.replace(/_/g, ' ').replace(/\s*\(.*\)$/, '').trim(); };
const fnv = (s) => { let h = 0x811c9dc5; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const syntheticId = (title) => 1_000_000_000 + (fnv(title) % 900_000_000);
const ascii = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Wikipedia has typos (".442" typed as "442") and the odd row of nonsense (a 5-foot-8 guard at 47 points and 30 rebounds a game).
 * Percentages are put right where the slip is plain, and a row that no player could have produced is dropped, never repaired.
 */
export function cleanRow(r) {
  const pct = (v) => {
    if (v == null) return null;
    const x = v > 1.5 ? (v <= 100 ? v / 100 : v < 1000 ? v / 1000 : NaN) : v;
    return Number.isFinite(x) && x >= 0 && x <= 1 ? Math.round(x * 1000) / 1000 : null;
  };
  const out = { ...r, fg: pct(r.fg), ft: pct(r.ft), tp: pct(r.tp) };
  const m = out.mpg;
  const impossible = out.gp < 1 || out.gp > 90 || out.ppg > 55 || out.rpg > 32 || out.apg > 16 || (out.spg ?? 0) > 5 || (out.bpg ?? 0) > 8 || (m != null && m > 52)
    || (m != null && m >= 8 && (out.ppg / m > 1.4 || out.rpg / m > 0.8 || out.apg / m > 0.5));
  if (impossible) return null;
  // Nobody shoots 80 percent from the field over ten games, or 99 percent at the line over twenty.
  if (out.gp >= 10 && out.fg != null && out.fg > 0.8) out.fg = null;
  if (out.gp >= 20 && out.ft != null && out.ft > 0.99) out.ft = null;
  return out;
}

/**
 * The infobox photo of a player article, when it is a Wikimedia Commons file (free by Commons' rules). Files kept on
 * English Wikipedia itself are often non-free and are left out. Returns the file name without "File:".
 */
export function photoFile(html) {
  const ib = /<table[^>]*class="[^"]*infobox[^"]*"[\s\S]*?<\/table>/.exec(html)?.[0] ?? '';
  const img = /<img[^>]*>/.exec(ib)?.[0];
  if (!img || !/\/wikipedia\/commons\//.test(img)) return null;
  const res = /resource="[^"]*\/File:([^"]+)"/.exec(img)?.[1];
  if (!res) return null;
  try { return decodeURIComponent(res).replace(/_/g, ' '); } catch { return res.replace(/_/g, ' '); }
}

const FREE = /^(cc[ -]?by|cc[ -]?by-sa|cc0|public domain|pd)/i;
const plain = (h) => (h ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

/** Commons' author field as one plain line: a doubled "Unknown author" said once, and a long note cut to its first sentence. */
export function tidyCredit(credit) {
  const cut = credit.lastIndexOf(', ');
  let who = cut > 0 ? credit.slice(0, cut) : credit;
  const licence = cut > 0 ? credit.slice(cut + 2) : '';
  who = who.replace(/(Unknown author|Unknown|Unidentified)\1/g, '$1');
  if (who.length > 120) who = (/^.*?\.(?=\s|$)/.exec(who)?.[0] ?? who.slice(0, 120)).trim().replace(/\.$/, '');
  return licence ? `${who}, ${licence}` : who;
}

/** Author, licence and a 160 px thumbnail for each Commons file, fifty files a request. Cached on disk. */
export async function photoMeta(files) {
  const cache = fs.existsSync(PHOTO_CACHE) ? JSON.parse(fs.readFileSync(PHOTO_CACHE, 'utf8')) : {};
  const todo = [...new Set(files)].filter((f) => !(f in cache));
  for (let i = 0; i < todo.length; i += 50) {
    const part = todo.slice(i, i + 50);
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=160&titles=${encodeURIComponent(part.map((f) => `File:${f}`).join('|'))}`;
    let j = null;
    for (let tries = 0; tries < 5 && !j; tries++) {
      await new Promise((r) => setTimeout(r, 1500 * (tries + 1)));
      const r = await fetch(url, { headers: { 'user-agent': UA } }).catch(() => null);
      if (r?.ok) j = await r.json();
      else console.error(`  commons ${r?.status ?? 'error'}, retrying`);
    }
    if (!j) break;
    const norm = new Map((j.query?.normalized ?? []).map((n) => [n.to, n.from]));
    for (const page of Object.values(j.query?.pages ?? {})) {
      const asked = (norm.get(page.title) ?? page.title).replace(/^File:/, '');
      const info = page.imageinfo?.[0];
      const m = info?.extmetadata ?? {};
      const licence = plain(m.LicenseShortName?.value);
      cache[asked] = info?.thumburl && FREE.test(licence) ? { url: info.thumburl, credit: `${plain(m.Artist?.value) || 'Unknown author'}, ${licence}`, page: info.descriptionurl } : null;
    }
    for (const f of part) if (!(f in cache)) cache[f] = null;
    fs.writeFileSync(PHOTO_CACHE, JSON.stringify(cache));
    console.error(`  photos ${Math.min(i + 50, todo.length)} of ${todo.length}`);
  }
  return cache;
}

const SUFFIX = / (jr|sr|ii|iii|iv)$/;
const nameKey = (name) => ascii(name).replace(SUFFIX, '');
const lastKey = (name) => nameKey(name).split(' ').pop();

/**
 * ESPN's id for each player who has seasons from 1985 on. The same name and the same seasons make one person; a different name
 * (a nickname) must share the last name and nearly every season. Returns title -> { id, how }.
 */
export function matchEspn(kept, dump) {
  const byName = new Map(), byLast = new Map();
  for (const e of dump) {
    byName.set(nameKey(e.name), [...(byName.get(nameKey(e.name)) ?? []), e]);
    byLast.set(lastKey(e.name), [...(byLast.get(lastKey(e.name)) ?? []), e]);
  }
  const jaccard = (a, b) => { const u = new Set([...a, ...b]); let n = 0; for (const x of a) if (b.has(x)) n++; return { n, score: n / u.size }; };
  const found = new Map();
  for (const k of kept) {
    if (!k.late.size) continue;
    const score = (list, floor, minShared) => list.map((e) => ({ e, ...jaccard(k.late, new Set(e.seasons)) })).filter((x) => x.score >= floor && x.n >= minShared).sort((a, b) => b.score - a.score);
    let ranked = score(byName.get(nameKey(k.name)) ?? [], 0.5, 1), how = 'name';
    if (!ranked.length) { ranked = score(byLast.get(lastKey(k.name)) ?? [], 0.8, 2); how = 'last name'; }
    if (!ranked.length || (ranked[1] && ranked[1].score === ranked[0].score)) continue;
    found.set(k.title, { id: ranked[0].e.id, how, score: ranked[0].score, espnName: ranked[0].e.name });
  }
  // Two articles on one ESPN player: the closer seasons keep it, a tie leaves both without.
  const owners = new Map();
  for (const [title, hit] of found) owners.set(hit.id, [...(owners.get(hit.id) ?? []), { title, ...hit }]);
  for (const list of owners.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => b.score - a.score);
    const keep = list[0].score > list[1].score ? list[0].title : null;
    for (const x of list) if (x.title !== keep) found.delete(x.title);
  }
  return found;
}

async function main() {
  const raw = JSON.parse(fs.readFileSync(RAW, 'utf8'));
  const teamSeasons = new Map(); // `${season}:${franchise}` -> row
  const players = [];
  const lines = [];
  const used = new Set();
  const skipped = { noTeam: 0, outOfRange: 0, thinPlayers: 0, nonsense: [] };
  const rosterPos = new Map();
  for (const x of Object.values(raw.rosters)) for (const r of x.roster) if (!rosterPos.has(r.title)) rosterPos.set(r.title, r.pos);

  // Team-season "Player statistics" tables, resolved to the players and the franchise-season they belong to. They fill the seasons a
  // player's own article does not list (some have only career totals) and are compared with the ones it does.
  const byName = new Map();
  for (const [title, p] of Object.entries(raw.players)) { const k = ascii(p.name); byName.set(k, [...(byName.get(k) ?? []), title]); }
  const extra = new Map(); // article title -> Map(`${season}:${franchise}` -> { r, team })
  const stat = { teamRows: 0, unmatched: 0, filled: 0, topped: 0, agreed: 0, differ: [] };
  // A player's points in his own article, for the team pages to be checked against.
  const articlePpg = (who, season, franchise) => {
    for (const t of raw.players[who]?.tables ?? []) for (const r of t.rows) if (r.season === season && teamOf(r.team, r.season, r.teamText)?.franchise === franchise) return r.ppg;
    return null;
  };
  stat.distrusted = [];
  for (const [tsTitle, rows] of Object.entries(raw.teamStats ?? {})) {
    if (!rows?.length) continue;
    const season = raw.rosters[tsTitle].season;
    const team = season >= FIRST && season <= LAST ? teamOf(tsTitle, season) : null;
    if (!team) continue;
    const rosterByName = new Map(raw.rosters[tsTitle].roster.map((x) => [ascii(x.name), x.title]));
    const resolve = (r) => { const k = ascii(r.name); return r.title && raw.players[r.title] ? r.title : rosterByName.get(k) ?? (byName.get(k)?.length === 1 ? byName.get(k)[0] : null); };
    // A team page that disagrees with three or more of its players' own articles is not used at all (the 1985-86 SuperSonics).
    const disagree = rows.filter((r) => { const who = resolve(r); const a = who ? articlePpg(who, season, team.franchise) : null; return a != null && Math.abs(a - r.ppg) > 0.6; }).length;
    if (disagree >= 3) { stat.distrusted.push(`${tsTitle} (${disagree} rows)`); continue; }
    for (const r of rows) {
      const who = resolve(r);
      if (!who || !raw.players[who]) { stat.unmatched++; continue; }
      if (!extra.has(who)) extra.set(who, new Map());
      const c = cleanRow({ season, gp: r.gp, mpg: r.mpg, ppg: r.ppg, rpg: r.rpg, apg: r.apg, spg: r.spg, bpg: r.bpg, fg: r.fg, ft: r.ft, tp: null, pos: r.pos });
      if (!c) { skipped.nonsense.push(`${who} ${season} ${team.nickname} (team page): ${r.gp}g ${r.mpg}mpg ${r.ppg}/${r.rpg}/${r.apg}`); continue; }
      extra.get(who).set(`${season}:${team.franchise}`, { r: c, team });
      stat.teamRows++;
    }
  }

  const kept = [];
  for (const [title, p] of Object.entries(raw.players)) {
    // The NBA regular season table(s): those under a "Regular season" heading, whichever has the most rows we can place.
    const regular = p.tables.filter((t) => /regular/i.test(t.heading));
    const rows = (regular.length ? regular : p.tables).flatMap((t) => t.rows);
    const mine = new Map();
    const late = new Set();
    for (const row of rows) {
      if (row.season >= 1985) late.add(row.season);
      if (row.season < FIRST || row.season > LAST) { skipped.outOfRange++; continue; }
      const team = teamOf(row.team, row.season, row.teamText);
      if (!team) { skipped.noTeam++; continue; }
      const r = cleanRow(row);
      if (!r) { skipped.nonsense.push(`${nameOf(title)} ${row.season} ${team.nickname}: ${row.gp}g ${row.mpg}mpg ${row.ppg}/${row.rpg}/${row.apg}`); continue; }
      const key = `${r.season}:${team.franchise}`;
      if (!mine.has(key)) mine.set(key, { r, team });
    }
    for (const [key, e] of extra.get(title) ?? []) {
      const have = mine.get(key);
      if (!have) { mine.set(key, e); stat.filled++; continue; }
      if (Math.abs(have.r.ppg - e.r.ppg) > 0.6 || Math.abs(have.r.gp - e.r.gp) > 3) { stat.differ.push(`${nameOf(title)} ${key} article ${have.r.gp}g ${have.r.ppg}ppg, team page ${e.r.gp}g ${e.r.ppg}ppg`); continue; }
      stat.agreed++;
      // Whatever the article's table leaves empty, the team page may have.
      for (const f of ['mpg', 'rpg', 'apg', 'spg', 'bpg', 'fg', 'ft']) if (have.r[f] == null && e.r[f] != null) { have.r = { ...have.r, [f]: e.r[f] }; stat.topped++; }
    }
    if (!mine.size) { skipped.thinPlayers++; continue; }
    kept.push({ title, raw: title, p, mine, late, name: nameOf(p.title ?? title), first: Math.min(...[...mine.values()].map((x) => x.r.season)) });
  }

  // A roster can link a redirect ("Lew Alcindor"); the page is the article under its real title, which may already be kept.
  const byArticle = new Map();
  for (const k of kept) {
    const real = (k.p.title ?? k.title).replace(/ /g, '_');
    const first = byArticle.get(real);
    if (!first) { byArticle.set(real, k); k.title = real; continue; }
    for (const [key, v] of k.mine) if (!first.mine.has(key)) first.mine.set(key, v);
    for (const y of k.late) first.late.add(y);
    k.merged = true;
  }
  const unique = kept.filter((k) => !k.merged);
  console.error(`${kept.length - unique.length} articles linked under a second title were merged`);

  const espn = ESPN ? matchEspn(unique, JSON.parse(fs.readFileSync(ESPN, 'utf8'))) : new Map();
  if (ESPN) {
    for (const [title, hit] of espn) if (hit.how !== 'name') console.error(`  ESPN by ${hit.how}: ${title} = ${hit.espnName} (${hit.id})`);
    const lone = unique.filter((k) => k.late.size && !espn.has(k.title));
    console.error(`${espn.size} players matched to ESPN; ${lone.length} with seasons from 1985 on have no ESPN record: ${lone.map((k) => k.name).join(', ')}`);
  }

  const photos = new Map();
  if (process.argv.includes('--photos')) {
    const fileOf = new Map();
    for (const k of unique) {
      const f = path.join(CACHE, crypto.createHash('sha1').update(`https://en.wikipedia.org/wiki/${k.raw}`).digest('hex') + '.html');
      const file = fs.existsSync(f) ? photoFile(fs.readFileSync(f, 'utf8')) : null;
      if (file) fileOf.set(k.title, file);
    }
    const meta = await photoMeta([...fileOf.values()]);
    for (const [title, file] of fileOf) if (meta[file]) photos.set(title, { ...meta[file], credit: tidyCredit(meta[file].credit) });
    console.error(`${photos.size} of ${unique.length} players have a free photo (${fileOf.size} articles show one on Commons)`);
  }

  for (const { title, p, mine, name } of unique) {
    const id = espn.get(title)?.id ?? syntheticId(title);
    if (used.has(id)) throw new Error(`id collision on ${title}`);
    used.add(id);
    const ph = photos.get(title);
    players.push([id, name, positionOf(p.position, rosterPos.get(title) ?? [...mine.values()].map((x) => x.r.pos).find(Boolean)), title, p.bday ?? null, ph?.url ?? null, ph?.credit ?? null, ph?.page ?? null]);
    for (const { r, team } of mine.values()) {
      const key = `${r.season}:${team.franchise}`;
      if (!teamSeasons.has(key)) teamSeasons.set(key, [r.season, team.franchise, team.location, team.nickname, team.abbr, FRANCHISES[team.franchise].color, team.logo ? `https://a.espncdn.com/i/teamlogos/nba/500/${team.logo}.png` : null]);
      lines.push([id, team.franchise, r.season, r.gp, r.mpg, r.ppg, r.rpg, r.apg, r.spg, r.bpg, r.fg, r.ft]);
    }
  }
  lines.sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0]);
  players.sort((a, b) => a[0] - b[0]);
  const out = {
    version: 2,
    source: 'Per-game lines from the career tables of English Wikipedia articles (CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/); team seasons and rosters from its team-season articles; player photos from Wikimedia Commons, each under its own free licence (photoCredit). Built by scripts/crawl-nba-history.mjs and scripts/build-nba-history.mjs.',
    crawledAt: raw.crawledAt,
    columns: { teams: ['season', 'franchise', 'location', 'name', 'abbr', 'color', 'logo'], players: ['id', 'name', 'position', 'wikipedia', 'born', 'photo', 'photoCredit', 'photoPage'], lines: ['player', 'franchise', 'season', 'gp', 'mpg', 'ppg', 'rpg', 'apg', 'spg', 'bpg', 'fg', 'ft'] },
    teams: [...teamSeasons.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]),
    players,
    lines,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.error(`wrote ${OUT}: ${out.teams.length} team seasons, ${players.length} players, ${lines.length} lines (skipped ${skipped.noTeam} with no NBA team, ${skipped.outOfRange} outside ${FIRST}-${LAST}, ${skipped.thinPlayers} players with no usable row; ESPN ids ${players.filter((p) => p[0] < 1e9).length})`);
  if (skipped.nonsense.length) console.error(`dropped ${skipped.nonsense.length} rows no player could have produced:\n  ${skipped.nonsense.join('\n  ')}`);
  console.error(`team pages: ${stat.teamRows} rows matched (${stat.unmatched} not), ${stat.filled} seasons filled in, ${stat.agreed} agreed with the article (${stat.topped} blanks topped up), ${stat.differ.length} differ`);
  for (const d of stat.differ.slice(0, 40)) console.error(`  differ: ${d}`);
  if (stat.distrusted.length) console.error(`team pages not used: ${stat.distrusted.join(', ')}`);
}
if (process.argv[1] && process.argv[1].endsWith('build-nba-history.mjs')) await main();
