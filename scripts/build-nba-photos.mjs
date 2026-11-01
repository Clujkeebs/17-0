// Free photos for NBA players ESPN has no headshot for (mostly the 1990s), from Wikimedia Commons, with credits.
//   node scripts/build-nba-photos.mjs --players nophoto.json [--out data/nba-history/photos.json]
// players.json: [{ id, name, seasons: [1991, ...] }] from a database that has run the ESPN sync (players with no headshot).
// Each player's article is found by trying "Name (basketball)" and "Name", and accepted only when its career table shares
// most of his seasons with ESPN's, so a namesake never lends his face. One request at a time, pages cached on disk.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parsePlayerStats, parseInfobox } from './nba-history-parse.mjs';
import { photoFile, photoMeta, tidyCredit } from './build-nba-history.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const PLAYERS = arg('players', '/tmp/claude-0/nophoto.json');
const OUT = arg('out', 'data/nba-history/photos.json');
const CACHE = arg('cache', '/tmp/claude-0/nbahist-cache');
const UA = 'UnbeatenBot/1.0 (https://playunbeaten.com; NBA photo credits for a basketball draft game; one request at a time)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function page(title) {
  const file = path.join(CACHE, crypto.createHash('sha1').update(`https://en.wikipedia.org/wiki/${title}`).digest('hex') + '.html');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  for (let i = 0; i < 4; i++) {
    await sleep(450);
    const r = await fetch(`https://en.wikipedia.org/wiki/${title}`, { headers: { 'user-agent': UA, accept: 'text/html' } }).catch(() => null);
    if (r?.status === 404) { fs.writeFileSync(file, ''); return ''; }
    if (r?.ok) { const h = await r.text(); fs.writeFileSync(file, h); return h; }
    await sleep(4000 * (i + 1));
  }
  return '';
}

/** Share of ESPN's seasons that the article's NBA career table also lists. */
export function seasonMatch(html, seasons) {
  const listed = new Set(parsePlayerStats(html).flatMap((t) => t.rows.map((r) => r.season)));
  if (!listed.size || !seasons.length) return 0;
  return seasons.filter((y) => listed.has(y)).length / seasons.length;
}

async function main() {
  const list = JSON.parse(fs.readFileSync(PLAYERS, 'utf8'));
  const found = [];
  let n = 0;
  for (const p of list) {
    const base = p.name.replace(/ /g, '_');
    let hit = null;
    for (const title of [`${base}_(basketball)`, base]) {
      const html = await page(title);
      if (!html || /id="disambigbox"|class="[^"]*dmbox/.test(html)) continue;
      if (seasonMatch(html, p.seasons) >= 0.6) { hit = { title: parseInfobox(html).title?.replace(/ /g, '_') ?? title, file: photoFile(html) }; break; }
    }
    if (hit?.file) found.push({ id: p.id, name: p.name, ...hit });
    if (++n % 50 === 0) console.error(`  ${n} of ${list.length} read, ${found.length} with a Commons photo`);
  }
  const meta = await photoMeta(found.map((f) => f.file));
  const players = found.filter((f) => meta[f.file]).map((f) => [f.id, f.name, meta[f.file].url, tidyCredit(meta[f.file].credit), meta[f.file].page, f.title]).sort((a, b) => a[0] - b[0]);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ version: 1, source: 'Photos from Wikimedia Commons, each under its own free licence (credit); matched to ESPN players by their Wikipedia articles.', columns: ['espnId', 'name', 'photo', 'credit', 'photoPage', 'wikipedia'], players }));
  console.error(`wrote ${OUT}: ${players.length} of ${list.length} players have a free photo`);
}
if (process.argv[1] && process.argv[1].endsWith('build-nba-photos.mjs')) await main();
