// Parsers for the Wikipedia pages behind the '60s and '70s eras of 82-0 (see scripts/crawl-nba-history.mjs).
// Wikipedia serves each page as Parsoid HTML: tables are flat, links are absolute, and a roster row carries
// the player's article link. Pure functions over an HTML string, so they run in tests without the network.

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&#160;': ' ', '&ndash;': '–', '&mdash;': '—' };
export const decode = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&(amp|lt|gt|quot|nbsp|ndash|mdash);|&#39;/g, (m) => ENT[m] ?? m);
export const text = (s) => decode(s.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<[^>]+>/g, '')).replace(/[\s ]+/g, ' ').trim();

const NUM = (s) => {
  const t = text(s).replace(/[*†‡§#^]+/g, '').replace(/,/g, '').trim();
  if (!t || /^[—–-]+$/.test(t) || /^n\/?a$/i.test(t)) return null;
  const n = Number(t.startsWith('.') ? `0${t}` : t);
  return Number.isFinite(n) ? n : null;
};

/** Tables with their nearest heading id, in page order. Nested tables (navboxes) are not needed here. */
export function tablesWithHeadings(html) {
  const out = [];
  const re = /<h[2-5][^>]*\sid="([^"]+)"|<table[\s\S]*?<\/table>/g;
  let heading = '';
  for (let m; (m = re.exec(html)); ) {
    if (m[1]) heading = m[1]; else out.push({ heading, html: m[0] });
  }
  return out;
}

const rowsOf = (tb) => [...tb.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) => r[0]);
const cellsOf = (tr) => [...tr.matchAll(/<(t[hd])([^>]*)>([\s\S]*?)<\/\1>/g)].map((c) => ({ tag: c[1], attrs: c[2], html: c[3], rowspan: Number(/rowspan="?(\d+)/.exec(c[2])?.[1] ?? 1) }));
const hrefOf = (html) => /<a [^>]*href="([^"]+)"/.exec(html)?.[1] ?? null;
const wikiTitle = (href) => {
  const m = href && /\/wiki\/([^#?]+)/.exec(href);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
};

/** Season index page ("1971-72 NBA season", with Wikipedia's dash) -> the team-season articles it links to, as titles. */
export function parseSeasonIndex(html, endYear) {
  const start = endYear - 1, tail = String(endYear % 100).padStart(2, '0');
  const re = new RegExp(`/wiki/(${start}(?:–|%E2%80%93)${tail}_[^"#?]*?_season)"`, 'g');
  const titles = new Set();
  for (const m of html.matchAll(re)) {
    const t = decodeURIComponent(m[1]);
    if (/_(NBA|ABA|BAA)_season$/.test(t) || /(All-Star|draft|Finals)/i.test(t)) continue;
    titles.add(t);
  }
  return [...titles].sort();
}

/** Team-season page -> roster rows: position, article title, name and birth date from the roster template. */
export function parseRoster(html) {
  const out = [];
  for (const t of tablesWithHeadings(html)) {
    if (!/^Roster/i.test(t.heading)) continue;
    for (const tr of rowsOf(t.html)) {
      const cells = cellsOf(tr).filter((c) => c.tag === 'td');
      if (cells.length < 4) continue;
      const nameCell = cells.find((c) => /\/wiki\//.test(c.html) && !/Basketball\)/.test(c.html)) ;
      // The player is the first linked cell after the position and number.
      const idx = cells.findIndex((c, i) => i >= 2 && /<a /.test(c.html));
      const cell = idx >= 0 ? cells[idx] : nameCell;
      if (!cell) continue;
      const title = wikiTitle(hrefOf(cell.html));
      if (!title) continue;
      const dob = cells.map((c) => text(c.html)).find((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)) ?? null;
      out.push({ pos: text(cells[0].html), name: text(cell.html), title, dob });
    }
  }
  return out;
}

/**
 * The infobox: position and birth date, when the article has them, and the article's own title. A roster can link a
 * redirect ("Lew Alcindor"), and the page that comes back is the article under its real title ("Kareem Abdul-Jabbar").
 */
export function parseInfobox(html) {
  const ib = /<table[^>]*class="[^"]*infobox[^"]*"[\s\S]*?<\/table>/.exec(html)?.[0] ?? '';
  const rows = rowsOf(ib).map((r) => cellsOf(r).map((c) => text(c.html)));
  const val = (label) => rows.find((r) => r[0] === label)?.[1] ?? null;
  const bday = /class="bday"[^>]*>(\d{4}-\d{2}-\d{2})</.exec(html)?.[1] ?? null;
  const title = /<title>([^<]*?) - Wikipedia<\/title>/.exec(html)?.[1];
  return { position: val('Position'), bday, title: title ? decode(title).trim() : null };
}

const HEAD = {
  gp: ['GP', 'G'], mpg: ['MPG', 'MIN', 'MP'], fg: ['FG%'], tp: ['3P%'], ft: ['FT%'],
  rpg: ['RPG', 'REB', 'TRB'], apg: ['APG', 'AST'], spg: ['SPG', 'STL'], bpg: ['BPG', 'BLK'], tov: ['TOV', 'TO', 'TPG'], ppg: ['PPG', 'PTS'],
};
const SEASON = /^(\d{4})[–-](\d{2})/;

/** "1971-72" (with Wikipedia's dash) -> 1972, the way ESPN and the rest of 82-0 name a season. */
export function seasonEnd(label) {
  const m = SEASON.exec(label.replace(/[†‡*]/g, '').trim());
  if (!m) return null;
  const end = Math.floor(Number(m[1]) / 100) * 100 + Number(m[2]);
  return end < Number(m[1]) ? end + 100 : end;
}

/** A header cell as plain upper-case text. Wikipedia wraps abbreviations in a template whose data attribute holds markup, so the leftovers are cut. */
const headText = (c) => text(c.html).replace(/\s+/g, ' ').replace(/^.*'>\s*/, '').trim().toUpperCase();

/**
 * A team-season article -> its regular season "Player statistics" table as per-game rows. Older articles list totals
 * (rebounds, assists, points) beside or instead of the averages, so a totals column is divided by games.
 * Rows: { name, title, gp, mpg, fg, ft, rpg, apg, spg, bpg, ppg }, title being the player's article when the cell links to one.
 */
export function parseTeamStats(html) {
  for (const t of tablesWithHeadings(html)) {
    if (/playoff/i.test(t.heading)) continue;
    const trs = rowsOf(t.html);
    if (trs.length < 6) continue;
    const head = cellsOf(trs[0]).map(headText);
    const find = (...names) => { for (const n of names) { const i = head.indexOf(n); if (i >= 0) return i; } return -1; };
    const ix = {
      player: find('PLAYER', 'NAME'), pos: find('POS', 'POS.'), gp: find('GP', 'G'), fg: find('FG%'), ft: find('FT%'),
      mpg: find('MPG'), min: find('MP', 'MIN'), rpg: find('RPG'), reb: find('REB', 'TRB'), apg: find('APG'), ast: find('AST'),
      spg: find('SPG'), stl: find('STL'), bpg: find('BPG'), blk: find('BLK'), ppg: find('PPG', 'AVG'), pts: find('PTS'),
    };
    if (ix.player !== 0 || ix.gp < 0 || (ix.ppg < 0 && ix.pts < 0) || (ix.rpg < 0 && ix.reb < 0)) continue;
    const body = trs.slice(1).map(cellsOf).filter((cells) => cells.length >= head.length - 1);
    const num = (cells, i) => (i >= 0 && cells[i] ? NUM(cells[i].html) : null);
    // A column of totals is told from one of averages by its largest value.
    const total = (i, limit) => i >= 0 && Math.max(0, ...body.map((cells) => num(cells, i) ?? 0)) > limit;
    const out = [];
    for (const cells of body) {
      const name = text(cells[0].html).replace(/[*†‡§#^]+/g, '').trim();
      if (!name || /^(team|totals?|opponents?|league|average)/i.test(name)) continue;
      const gp = num(cells, ix.gp);
      if (gp == null || gp <= 0 || gp > 90) continue;
      const per = (avgIx, totIx, limit) => {
        if (avgIx >= 0) { const v = num(cells, avgIx); if (v != null) return v; }
        if (totIx >= 0) { const v = num(cells, totIx); return v == null ? null : total(totIx, limit) ? Math.round((v / gp) * 10) / 10 : v; }
        return null;
      };
      const ppg = per(ix.ppg, ix.pts, 70);
      if (ppg == null || ppg > 60) continue;
      const pct = (i) => { const v = num(cells, i); return v == null ? null : v > 1.5 ? Math.round(v) / 100 : v; };
      out.push({
        name, title: wikiTitle(hrefOf(cells[0].html)), pos: ix.pos >= 0 && cells[ix.pos] ? text(cells[ix.pos].html) || null : null, gp,
        mpg: per(ix.mpg, ix.min, 60), fg: pct(ix.fg), ft: pct(ix.ft),
        rpg: per(ix.rpg, ix.reb, 35), apg: per(ix.apg, ix.ast, 25), spg: per(ix.spg, ix.stl, 6), bpg: per(ix.bpg, ix.blk, 6), ppg,
      });
    }
    // The regular season table comes first and has the most games played; a playoff table under a stray heading does not reach 40.
    if (out.length >= 5 && Math.max(...out.map((r) => r.gp)) >= 40) return out;
  }
  return [];
}

/**
 * A player article -> his NBA regular season per-game rows. Rows carry the team as the team-season article title
 * when the cell links to one, otherwise the cell text. ABA, college and playoff tables are skipped.
 */
export function parsePlayerStats(html) {
  const rows = [];
  for (const t of tablesWithHeadings(html)) {
    if (/playoff|college|ncaa|aba|all-star|totals|per_36|advanced/i.test(t.heading) && !/regular/i.test(t.heading)) continue;
    const trs = rowsOf(t.html);
    if (trs.length < 3) continue;
    const head = cellsOf(trs[0]).map(headText);
    const col = (names) => { for (const n of names) { const i = head.indexOf(n); if (i >= 0) return i; } return -1; };
    const ix = Object.fromEntries(Object.entries(HEAD).map(([k, v]) => [k, col(v)]));
    if (ix.gp < 0 || ix.ppg < 0 || ix.rpg < 0) continue;
    if (!/^(YEAR|SEASON)/.test(head[0])) continue;
    // Per game only: totals tables list points in the thousands.
    let carry = null;
    const out = [];
    for (const tr of trs.slice(1)) {
      let cells = cellsOf(tr);
      if (!cells.length) continue;
      // A traded player's second row has no year cell (it spans two rows), so every cell sits one to the left.
      const first = text(cells[0].html);
      const yearCell = SEASON.test(first.replace(/[†‡*]/g, '').trim());
      let year = carry;
      if (yearCell) { year = seasonEnd(first); carry = year; }
      else if (/^(career|all-star|total)/i.test(first)) continue;
      else if (head.length === cells.length + 1) cells = [{ html: '' }, ...cells];
      if (year == null) continue;
      const teamIx = head.findIndex((h) => /^TEAM/.test(h));
      const teamCell = cells[teamIx];
      if (!teamCell) continue;
      const teamText = text(teamCell.html);
      if (/\(ABA\)|ABA/.test(teamText)) continue;
      const g = (k) => (ix[k] >= 0 && cells[ix[k]] ? NUM(cells[ix[k]].html) : null);
      const gp = g('gp'), ppg = g('ppg');
      if (gp == null || ppg == null || gp <= 0) continue;
      const mpg = g('mpg');
      if (ppg > 60 || (mpg != null && mpg > 60)) continue;
      out.push({
        season: year, team: wikiTitle(hrefOf(teamCell.html)), teamText, gp, mpg,
        fg: g('fg'), tp: g('tp'), ft: g('ft'), rpg: g('rpg'), apg: g('apg'), spg: g('spg'), bpg: g('bpg'), tov: g('tov'), ppg,
      });
    }
    // The NBA regular season table has the most rows with team-season links; keep every table that parsed.
    if (out.length) rows.push({ heading: t.heading, rows: out });
  }
  return rows;
}
