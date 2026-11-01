// Builds the '60s and '70s data for 82-0 from Wikipedia (text under CC BY-SA 4.0; the numbers are facts).
//   node scripts/crawl-nba-history.mjs crawl   [--from 1960 --to 1979]   pages -> raw.json (cached; safe to re-run)
// ESPN carries almost nothing for these years (a handful of players per team, no rebounds before 1977), and the
// sources that do carry them do not allow reuse, so the lines come from Wikipedia's career tables.
// Politeness: one request at a time, a pause between requests, a descriptive user agent, pages cached on disk.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseSeasonIndex, parseRoster, parsePlayerStats, parseInfobox, parseTeamStats } from './nba-history-parse.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const FROM = Number(arg('from', 1960)), TO = Number(arg('to', 1979));
const CACHE = arg('cache', '/tmp/claude-0/nbahist-cache');
const OUT = arg('out', '/tmp/claude-0/nbahist-raw.json');
const PAUSE = Number(arg('pause', 450));
const UA = 'UnbeatenBot/1.0 (https://playunbeaten.com; NBA history for a basketball draft game; one request at a time)';
fs.mkdirSync(CACHE, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fetched = 0;
async function page(title) {
  const url = `https://en.wikipedia.org/wiki/${title.replace(/ /g, '_')}`;
  const file = path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex') + '.html');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  for (let i = 0; i < 6; i++) {
    await sleep(PAUSE);
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' }, signal: AbortSignal.timeout(30_000) });
      if (r.status === 404) { fs.writeFileSync(file, ''); return ''; }
      if (r.status === 429 || r.status >= 500) { const wait = Number(r.headers.get('retry-after') || 0) * 1000 || 4000 * 2 ** i; console.error(`  ${r.status} on ${title}, waiting ${wait}ms`); await sleep(wait); continue; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const html = await r.text();
      fs.writeFileSync(file, html);
      if (++fetched % 25 === 0) console.error(`  fetched ${fetched} pages`);
      return html;
    } catch (e) { console.error(`  ${title}: ${e.message}`); await sleep(2000 * (i + 1)); }
  }
  throw new Error(`gave up on ${title}`);
}

const seasonTitle = (y) => `${y - 1}–${String(y % 100).padStart(2, '0')}_NBA_season`;

async function crawl() {
  const seasons = {};
  for (let y = FROM; y <= TO; y++) {
    const idx = parseSeasonIndex(await page(seasonTitle(y)), y);
    seasons[y] = idx;
    console.error(`${y}: ${idx.length} team seasons`);
  }
  const rosters = {};
  // Some team-season articles also carry a "Player statistics" table; it fills in players whose own article has no season-by-season table.
  const teamStats = {};
  for (const [y, titles] of Object.entries(seasons)) {
    for (const t of titles) {
      const html = await page(t);
      const roster = parseRoster(html);
      rosters[t] = { season: Number(y), roster };
      teamStats[t] = parseTeamStats(html);
      if (roster.length < 8) console.error(`  thin roster ${t}: ${roster.length}`);
    }
    console.error(`${y}: rosters read`);
  }
  console.error(`${Object.values(teamStats).filter((x) => x.length).length} team seasons with a player statistics table`);
  const players = {};
  const names = new Map();
  for (const r of Object.values(rosters)) for (const p of r.roster) if (!names.has(p.title)) names.set(p.title, p);
  for (const rows of Object.values(teamStats)) for (const r of rows) if (r.title && !names.has(r.title)) names.set(r.title, { name: r.name, title: r.title, dob: null, pos: null });
  console.error(`${names.size} players to read`);
  let n = 0;
  for (const [title, p] of names) {
    const html = await page(title);
    const tables = parsePlayerStats(html);
    players[title] = { name: p.name, dob: p.dob, ...parseInfobox(html), tables };
    if (++n % 100 === 0) console.error(`  ${n} of ${names.size} players parsed`);
  }
  fs.writeFileSync(OUT, JSON.stringify({ seasons, rosters, teamStats, players, crawledAt: new Date().toISOString() }));
  console.error(`wrote ${OUT}: ${Object.keys(rosters).length} team seasons, ${Object.keys(players).length} players`);
}

/**
 * Some early team-season articles have no roster (the Pistons, Knicks and Hawks of the early '60s), so players who only
 * played there never turn up. For team seasons with few players placed, read the page of what links to the team-season
 * article: a player's career table links every row to it. One page per team season, cached like the rest.
 */
async function supplement() {
  const raw = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const placed = new Map();
  const add = (team, who) => placed.set(team, (placed.get(team) ?? new Set()).add(who));
  for (const [title, p] of Object.entries(raw.players)) {
    const regular = p.tables.filter((t) => /regular/i.test(t.heading));
    for (const r of (regular.length ? regular : p.tables).flatMap((t) => t.rows)) if (r.team && r.gp >= 20) add(r.team, title);
  }
  for (const [team, rows] of Object.entries(raw.teamStats ?? {})) for (const r of rows) if (r.gp >= 20) add(team, r.title ?? r.name);
  const thin = Object.keys(raw.rosters).filter((t) => (placed.get(t)?.size ?? 0) < 9);
  console.error(`${thin.length} team seasons with fewer than nine players placed`);
  const teamWords = new Set(['Lakers', 'Celtics', 'Knicks', 'Pistons', 'Hawks', 'Royals', 'Warriors', 'Nationals', '76ers', 'Bulls', 'Bullets', 'Rockets', 'Bucks', 'Suns', 'Cavaliers', 'Kings', 'Zephyrs', 'Packers', 'Sonics', 'SuperSonics', 'Jazz', 'Braves', 'Nets', 'Spurs', 'Nuggets', 'Pacers', 'Blazers', 'Clippers']);
  const skip = (t) => /(_season|_draft|_Finals|_playoffs|_Game|_games|^List_of|^Category:|^Template|^Wikipedia:|^Talk:|^File:|^Draft:|^User|^Portal:)/.test(t) || /^(NBA|ABA|BAA)_/.test(t) || t.split('_').some((w) => teamWords.has(w));
  let added = 0;
  for (const title of thin) {
    const html = await page(`Special:WhatLinksHere/${title}?limit=500&namespace=0&hidetrans=1&hideredirs=1`);
    const list = html.slice(Math.max(0, html.indexOf('id="mw-whatlinkshere-list"')));
    const found = [...list.matchAll(/<li><bdi dir="ltr"><a href="\/wiki\/([^"#?]+)"/g)].map((m) => { try { return decodeURIComponent(m[1]); } catch { return m[1]; } });
    const cands = found.filter((t) => !raw.players[t] && !skip(t));
    let hit = 0;
    for (const t of cands) {
      const body = await page(t);
      const tables = parsePlayerStats(body);
      if (!tables.some((x) => x.rows.some((r) => r.team === title))) continue;
      raw.players[t] = { name: t.replace(/_/g, ' ').replace(/\s*\(.*\)$/, ''), dob: null, ...parseInfobox(body), tables };
      hit++; added++;
    }
    console.error(`  ${title}: ${found.length} links, ${cands.length} candidates, ${hit} players added`);
    fs.writeFileSync(OUT, JSON.stringify(raw));
  }
  console.error(`supplement done: ${added} players added`);
}

const cmd = process.argv[2];
if (cmd === 'crawl') await crawl();
else if (cmd === 'supplement') await supplement();
else console.error('usage: node scripts/crawl-nba-history.mjs crawl|supplement [--from 1960 --to 1979]');
