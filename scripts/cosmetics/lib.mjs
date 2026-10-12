// Shared toolkit for the cosmetics generator: a seeded random source, SVG helpers and a few reusable pieces
// (stars, grain, bokeh, crowds, buildings). Everything is deterministic so regenerating changes nothing.

export function hash(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}
export function rng(seed) {
  const next = hash(seed);
  let a = next();
  const r = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.range = (lo, hi) => lo + r() * (hi - lo);
  r.int = (lo, hi) => Math.floor(lo + r() * (hi - lo + 1));
  r.pick = (xs) => xs[Math.floor(r() * xs.length)];
  return r;
}
export const n1 = (v) => Math.round(v * 10) / 10;
export const n2 = (v) => Math.round(v * 100) / 100;

const REDUCE = '@media (prefers-reduced-motion: reduce){*{animation:none!important}}';

/** A whole SVG document. `style` is CSS (keyframes and classes); reduced motion switches every animation off. */
export function svg(w, h, { defs = '', body = '', style = '', slice = true } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="${slice ? 'xMidYMid slice' : 'xMidYMid meet'}">`
    + `<defs>${defs}</defs><style>${style}${REDUCE}</style>${body}</svg>`;
}

export const lg = (id, stops, [x1, y1, x2, y2] = [0, 0, 0, 1]) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op !== undefined ? ` stop-opacity="${op}"` : ''}/>`).join('')}</linearGradient>`;
export const rg = (id, stops, [cx, cy, r] = [0.5, 0.5, 0.5], extra = '') =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" ${extra}>${stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op !== undefined ? ` stop-opacity="${op}"` : ''}/>`).join('')}</radialGradient>`;

/** Film grain overlay filter: apply with filter="url(#grain)" on a rect (it paints noise at low alpha). */
export const grainDef = (id = 'grain', opacity = 0.05, freq = 0.9) =>
  `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${opacity * 3} 0"/></filter>`;
export const grain = (w, h, id = 'grain') => `<rect width="${w}" height="${h}" filter="url(#${id})" opacity="1"/>`;

export const blurDef = (id, sd) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;

/** Scattered stars; some twinkle (class .tw with a per-star delay). */
export function stars(r, n, w, h, { maxY = h, min = 0.4, max = 1.5, twinkle = 0.25, color = '#fff' } = {}) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = n1(r() * w), y = n1(r() * maxY), s = n2(r.range(min, max)), o = n2(r.range(0.35, 1));
    const tw = r() < twinkle;
    out += `<circle cx="${x}" cy="${y}" r="${s}" fill="${color}" opacity="${o}"${tw ? ` class="tw" style="animation-delay:${n1(r() * 4)}s"` : ''}/>`;
  }
  return out;
}
export const TWINKLE_CSS = '.tw{animation:tw 3s ease-in-out infinite alternate}@keyframes tw{from{opacity:.25}to{opacity:1}}';

/** Soft out-of-focus lights. */
export function bokeh(r, n, w, h, colors, { minR = 6, maxR = 30, y0 = 0, y1 = h, op = [0.08, 0.28] } = {}) {
  let out = '';
  for (let i = 0; i < n; i++) out += `<circle cx="${n1(r() * w)}" cy="${n1(r.range(y0, y1))}" r="${n1(r.range(minR, maxR))}" fill="${r.pick(colors)}" opacity="${n2(r.range(op[0], op[1]))}"/>`;
  return out;
}

/** A row of heads and shoulders along y, for crowds. */
export function crowd(r, w, y, { rows = 3, size = 9, color = '#0b0d14', gap = 1.0, jitter = 3, sway = false } = {}) {
  let out = '';
  for (let row = 0; row < rows; row++) {
    const yy = y + row * size * 0.78, s = size * (1 + row * 0.12);
    const col = shade(color, 1 + row * 0.18);
    for (let x = -s; x < w + s; x += s * gap) {
      const jx = x + r.range(-jitter, jitter), jy = yy + r.range(-jitter / 2, jitter / 2);
      out += `<circle cx="${n1(jx)}" cy="${n1(jy)}" r="${n1(s * 0.34)}" fill="${col}"/><path d="M${n1(jx - s * 0.55)} ${n1(jy + s * 0.9)}q${n1(s * 0.55)} ${n1(-s * 0.75)} ${n1(s * 1.1)} 0z" fill="${col}"/>`;
    }
  }
  return out;
}

export function shade(hex, f) {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join('')}`;
}
export function mix(a, b, t) {
  const pa = parseInt(a.replace('#', ''), 16), pb = parseInt(b.replace('#', ''), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${[ch(16), ch(8), ch(0)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Skyline of rectangular buildings with lit windows (some flicker). Returns SVG for one layer. */
export function skyline(r, w, baseY, { minH = 40, maxH = 160, minW = 22, maxW = 54, color = '#0c1220', win = '#fde68a', winChance = 0.35, flicker = 0.12, winSize = 3, step = 7 } = {}) {
  let out = '', x = -10;
  while (x < w + 10) {
    const bw = r.range(minW, maxW), bh = r.range(minH, maxH);
    out += `<rect x="${n1(x)}" y="${n1(baseY - bh)}" width="${n1(bw)}" height="${n1(bh)}" fill="${color}"/>`;
    if (r() < 0.25) out += `<rect x="${n1(x + bw * 0.45)}" y="${n1(baseY - bh - r.range(8, 22))}" width="1.6" height="${n1(r.range(8, 22))}" fill="${color}"/>`;
    for (let wy = baseY - bh + 8; wy < baseY - 6; wy += step) {
      for (let wx = x + 5; wx < x + bw - 5; wx += step) {
        if (r() < winChance) out += `<rect x="${n1(wx)}" y="${n1(wy)}" width="${winSize}" height="${winSize}" fill="${win}" opacity="${n2(r.range(0.45, 0.95))}"${r() < flicker ? ` class="wf" style="animation-delay:${n1(r() * 6)}s"` : ''}/>`;
      }
    }
    x += bw + r.range(0, 5);
  }
  return out;
}
export const FLICKER_CSS = '.wf{animation:wf 4s steps(1) infinite}@keyframes wf{0%{opacity:.9}30%{opacity:.05}34%{opacity:.9}70%{opacity:.9}74%{opacity:.1}78%{opacity:.9}}';

/** A hexagon path centred at (cx, cy) with circumradius r (flat-top when flat). */
export function hex(cx, cy, r, flat = false) {
  let d = '';
  for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i + (flat ? 0 : Math.PI / 6); d += `${i ? 'L' : 'M'}${n1(cx + r * Math.cos(a))} ${n1(cy + r * Math.sin(a))}`; }
  return d + 'z';
}

/** A star polygon path. */
export function star(cx, cy, ro, ri, pts = 5, rot = -Math.PI / 2) {
  let d = '';
  for (let i = 0; i < pts * 2; i++) { const a = rot + (Math.PI / pts) * i, rr = i % 2 ? ri : ro; d += `${i ? 'L' : 'M'}${n1(cx + rr * Math.cos(a))} ${n1(cy + rr * Math.sin(a))}`; }
  return d + 'z';
}

/** A four-point sparkle (diamond star) path. */
export const sparkle = (cx, cy, s) => `M${cx} ${n1(cy - s)}Q${cx} ${cy} ${n1(cx + s)} ${cy}Q${cx} ${cy} ${cx} ${n1(cy + s)}Q${cx} ${cy} ${n1(cx - s)} ${cy}Q${cx} ${cy} ${cx} ${n1(cy - s)}z`;

/** Smooth wavy path across width w around y with amplitude a and wavelength L, closed down to `bottom`. */
export function wave(w, y, a, L, phase = 0, bottom = null) {
  let d = `M${-L} ${n1(y + a * Math.sin(phase))}`;
  for (let x = -L; x <= w + L; x += L / 2) {
    const cx = x + L / 4, cy = y + a * Math.sin(phase + ((x + L / 4) / L) * Math.PI * 2 + Math.PI / 2 * 0);
    d += `Q${n1(cx)} ${n1(y + (a * 2) * Math.sin(phase + ((x + L / 4) / L) * Math.PI * 2))} ${n1(x + L / 2)} ${n1(y + a * Math.sin(phase + ((x + L / 2) / L) * Math.PI * 2))}`;
    void cy;
  }
  return bottom === null ? d : `${d}L${w + L} ${bottom}L${-L} ${bottom}z`;
}
