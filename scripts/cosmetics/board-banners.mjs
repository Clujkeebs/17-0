// Prints the CSS for a player's banner on a board: the banner art's own three colours as variables, which cosmetics.css turns
// into a soft tint, so a hundred rows never load a hundred 100 KB drawings. Run: node scripts/cosmetics/board-banners.mjs > /tmp/plates.css
import fs from 'node:fs';
const dir = 'public/cosmetics/banners';
const hex = (s) => s.toLowerCase().replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/, '#$1$1$2$2$3$3');
const lum = (h) => { const n = parseInt(h.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };
const out = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.still.svg')).sort()) {
  const key = f.replace('.still.svg', '');
  const svg = fs.readFileSync(`${dir}/${f}`, 'utf8');
  // Gradient stops come first in the file and describe the backdrop; fill colours fill in when a banner has none.
  const stops = [...svg.matchAll(/stop-color="(#[0-9a-fA-F]{3,6})"/g)].map((m) => hex(m[1]));
  const fills = [...svg.matchAll(/fill="(#[0-9a-fA-F]{3,6})"/g)].map((m) => hex(m[1]));
  const pool = [...new Set([...stops, ...fills])].filter((c) => c.length === 7 && lum(c) > 0.03 && lum(c) < 0.9);
  // The tint wants the banner's lively colours, not its dark backdrop: rank by saturation near mid lightness, keep three that differ.
  const hsl = (h) => { const n = parseInt(h.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)); const hue = d === 0 ? 0 : mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return { h: hue * 60, s: sat, l }; };
  const ranked = pool.map((c) => ({ c, ...hsl(c) })).sort((x, y) => y.s * (1 - Math.abs(y.l - 0.5)) - x.s * (1 - Math.abs(x.l - 0.5)));
  const picks = [];
  for (const x of ranked) { if (picks.every((p) => { const dh = Math.abs(p.h - x.h); return Math.min(dh, 360 - dh) > 22 || Math.abs(p.l - x.l) > 0.25; })) picks.push(x); if (picks.length === 3) break; }
  const cols = picks.sort((x, y) => x.l - y.l).map((x) => x.c);
  while (cols.length < 3) cols.push(cols[cols.length - 1] ?? '#64748b');
  out.push(`.plate.${key} { --b1: ${cols[0]}; --b2: ${cols[1]}; --b3: ${cols[2]}; }`);
}
console.log(out.join('\n'));
