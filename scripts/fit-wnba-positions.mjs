// Refits inferWnbaPosition (src/lib/game/fortyfour.ts): reads ten WNBA seasons from ESPN's core API, keeps the rotation
// seasons whose player ESPN lists as G, F or C, fits position (G 0, F 1, C 2) to four per-30-minute numbers by ridge
// least squares, and cross-validates the labels. Prints the coefficients to paste into the function and how it did on
// seasons held out. Needs network access to sports.core.api.espn.com. usage: node scripts/fit-wnba-positions.mjs [seasons...]
const CORE = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/wnba';
const seasons = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [1998, 2001, 2004, 2007, 2010, 2013, 2016, 2019, 2022, 2025];
const BANDS = [0.4, 0.8, 1.3, 1.7];
const CLASSES = ['G', 'F', 'C'];

const get = async (url) => {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url.replace(/^http:/, 'https:'), { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20_000) });
      if (r.status === 404) return null;
      if (r.ok) return await r.json();
    } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 400 * (i + 1)));
  }
  return null;
};
const pool = async (items, n, fn) => { let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) await fn(items[i++]); })); };
const stats = (j) => { const out = {}; for (const c of j?.splits?.categories ?? []) for (const s of c.stats) if (typeof s.value === 'number' && !(s.name in out)) out[s.name] = s.value; return out; };

const rows = [];
for (const season of seasons) {
  const teams = await get(`${CORE}/seasons/${season}/teams?limit=40`);
  const athletes = new Set();
  await pool((teams?.items ?? []).map((x) => Number(x.$ref.match(/teams\/(\d+)/)?.[1])), 6, async (t) => {
    const lead = await get(`${CORE}/seasons/${season}/types/2/teams/${t}/leaders`);
    for (const c of lead?.categories ?? []) for (const l of c.leaders ?? []) { const m = l.athlete?.$ref?.match(/athletes\/(\d+)/); if (m) athletes.add(Number(m[1])); }
  });
  await pool([...athletes], 8, async (id) => {
    const a = (await get(`${CORE}/seasons/${season}/athletes/${id}`)) ?? (await get(`${CORE}/athletes/${id}`));
    const s = stats(await get(`${CORE}/seasons/${season}/types/2/athletes/${id}/statistics`));
    const gp = Math.round(s.gamesPlayed || 0);
    const pos = a?.position?.abbreviation;
    if (!CLASSES.includes(pos) || gp < 10 || (s.avgMinutes ?? 0) < 8) return;
    rows.push({ pos, mpg: s.avgMinutes, rpg: s.avgRebounds ?? 0, apg: s.avgAssists ?? 0, spg: s.avgSteals ?? 0, bpg: s.avgBlocks ?? 0 });
  });
  console.error(season, rows.length, 'listed rotation seasons so far');
}

const features = (r) => [r.rpg, r.apg, r.bpg, r.spg].map((v) => v / (Math.max(r.mpg, 8) / 30));
function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
    [M[i], M[p]] = [M[p], M[i]];
    for (let r = 0; r < n; r++) if (r !== i) { const f = M[r][i] / M[i][i]; for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c]; }
  }
  return M.map((row, i) => row[n] / row[i]);
}
function fit(set) {
  const X = set.map((r) => [1, ...features(r)]);
  const y = set.map((r) => CLASSES.indexOf(r.pos));
  const d = X[0].length;
  const A = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => X.reduce((s, x) => s + x[i] * x[j], 0) + (i === j && i > 0 ? 0.5 : 0)));
  return solve(A, Array.from({ length: d }, (_, i) => X.reduce((s, x, k) => s + x[i] * y[k], 0)));
}
const size = (w, r) => w[0] + features(r).reduce((s, v, i) => s + w[i + 1] * v, 0);
const label = (s) => (s < BANDS[0] ? 'G' : s < BANDS[1] ? 'G-F' : s < BANDS[2] ? 'F' : s < BANDS[3] ? 'F-C' : 'C');

// Three rounds of five-fold cross-validation with a fixed shuffle, so the numbers repeat.
let seed = 99;
const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
let total = 0, pure = 0, pureRight = 0, hybrid = 0, hybridRight = 0;
for (let round = 0; round < 3; round++) {
  const order = rows.map((_, i) => i).sort(() => 0.5 - rand());
  for (let k = 0; k < 5; k++) {
    const held = new Set(order.filter((_, i) => i % 5 === k));
    const w = fit(rows.filter((_, i) => !held.has(i)));
    for (const r of rows.filter((_, i) => held.has(i))) {
      const l = label(size(w, r));
      total++;
      if (l.includes('-')) { hybrid++; if (l.split('-').includes(r.pos)) hybridRight++; } else { pure++; if (l === r.pos) pureRight++; }
    }
  }
}
const pct = (a, b) => `${((a / b) * 100).toFixed(1)}%`;
const w = fit(rows);
console.log(`${rows.length} listed rotation seasons`);
console.log(`held out: plain G, F or C on ${pct(pure, total)} of seasons, right ${pct(pureRight, pure)}; hybrid on ${pct(hybrid, total)}, names the real position ${pct(hybridRight, hybrid)}; real position among the label's ${pct(pureRight + hybridRight, total)}`);
console.log(`size = ${w[0].toFixed(4)} + ${w[1].toFixed(4)} * rpg30 ${w[2] < 0 ? '-' : '+'} ${Math.abs(w[2]).toFixed(4)} * apg30 ${w[3] < 0 ? '-' : '+'} ${Math.abs(w[3]).toFixed(4)} * bpg30 ${w[4] < 0 ? '-' : '+'} ${Math.abs(w[4]).toFixed(4)} * spg30   (bands ${BANDS.join(', ')})`);
