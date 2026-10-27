// The CSS for a player's banner on a board: one accent colour taken from the banner art, which cosmetics.css turns into a soft wash,
// so a hundred rows never load a hundred 100 KB drawings. Used by css.mjs; run it alone to print the rules: node scripts/cosmetics/board-banners.mjs
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = 'public/cosmetics/banners';
const hex = (s) => s.toLowerCase().replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/, '#$1$1$2$2$3$3');
const lum = (h) => { const n = parseInt(h.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };
const hsl = (h) => { const n = parseInt(h.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)); const hue = d === 0 ? 0 : mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return { h: hue * 60, s: sat, l }; };

/** The banner's most vivid colour (not its dark backdrop), as a hex string. */
export function accentOf(svg) {
  // Gradient stops come first in the file and describe the backdrop; fill colours fill in when a banner has none.
  const stops = [...svg.matchAll(/stop-color="(#[0-9a-fA-F]{3,6})"/g)].map((m) => hex(m[1]));
  const fills = [...svg.matchAll(/fill="(#[0-9a-fA-F]{3,6})"/g)].map((m) => hex(m[1]));
  const pool = [...new Set([...stops, ...fills])].filter((c) => c.length === 7 && lum(c) > 0.03 && lum(c) < 0.9);
  // Rank by saturation near mid lightness: the colour the eye reads as the banner's colour.
  const ranked = pool.map((c) => ({ c, ...hsl(c) })).sort((x, y) => y.s * (1 - Math.abs(y.l - 0.5)) - x.s * (1 - Math.abs(x.l - 0.5)));
  return ranked[0]?.c ?? '#64748b';
}

export function boardBannerRules() {
  return fs.readdirSync(dir).filter((x) => x.endsWith('.still.svg')).sort()
    .map((f) => `.plate.${f.replace('.still.svg', '')} { --ac: ${accentOf(fs.readFileSync(`${dir}/${f}`, 'utf8'))}; }`).join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(boardBannerRules());
