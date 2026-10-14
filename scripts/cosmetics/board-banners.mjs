// Prints the CSS for a player's banner on a board: a light gradient from the banner art's own colours, so a hundred rows
// never load a hundred 100 KB drawings. Run: node scripts/cosmetics/board-banners.mjs > /tmp/plates.css
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
  const pool = [...new Set([...stops, ...fills])].filter((c) => c.length === 7 && lum(c) > 0.03 && lum(c) < 0.82);
  const picks = [];
  for (const c of pool) { if (picks.every((p) => Math.abs(lum(p) - lum(c)) > 0.07 || p === c) && !picks.includes(c)) picks.push(c); if (picks.length === 3) break; }
  while (picks.length < 3) picks.push(picks[picks.length - 1] ?? '#1c1f2a');
  out.push(`.plate.${key} { background-image: linear-gradient(100deg, ${picks[0]} 0%, ${picks[1]} 58%, ${picks[2]} 100%); }`);
}
console.log(out.join('\n'));
