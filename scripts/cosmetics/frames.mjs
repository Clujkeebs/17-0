import { C, fx, orbit, glint, rngFor, lg, rg, n1, n2, star, sparkle, hex } from './fxlib.mjs';

const GOLD = lg('gd', [[0, '#fff3b8'], [0.35, '#f2c94c'], [0.7, '#b8860b'], [1, '#7a5700']], [0, 0, 1, 1]);
const SILVER = lg('sv', [[0, '#ffffff'], [0.35, '#d5dbe3'], [0.7, '#8d97a6'], [1, '#5b6574']], [0, 0, 1, 1]);
const pt = (a, r) => [C + Math.cos(a) * r, C + Math.sin(a) * r];
const deg = (d) => (d * Math.PI) / 180;

/** A thin metal ring at radius r, width w. */
const band = (r, w, fill) => `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${fill}" stroke-width="${w}"/>`;
const bevel = (r, w) => `<circle cx="100" cy="100" r="${r - w / 2 + 0.6}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1"/><circle cx="100" cy="100" r="${r + w / 2 - 0.6}" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1"/>`;
const SHADOW = `<filter id="ds" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.4" stdDeviation="1.4" flood-color="#000" flood-opacity=".4"/></filter>`;
const frame = (body, defs = '', style = '') => fx(`<g filter="url(#ds)">${body}</g>`, { defs: defs + SHADOW, style });

function leaf(x, y, ang, len, w, fill) {
  const ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux;
  const P = (t, s) => `${n1(x + ux * t + px * s)} ${n1(y + uy * t + py * s)}`;
  return `<path d="M${P(0, 0)}C${P(len * 0.3, -w)} ${P(len * 0.8, -w * 0.7)} ${P(len, 0)}C${P(len * 0.8, w * 0.7)} ${P(len * 0.3, w)} ${P(0, 0)}z" fill="${fill}" stroke="#7a5700" stroke-width=".5"/><path d="M${P(1, 0)}L${P(len * 0.85, 0)}" stroke="#fff7c8" stroke-width=".6" opacity=".7"/>`;
}

function laurel(fill, defs, id) {
  let o = '';
  // Two branches climbing from the bottom up each side to about 11 and 1 o'clock.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      const t = i / 11, a = deg(90 + side * (14 + t * 138)), r = 58 + Math.sin(t * Math.PI) * 2;
      const [x, y] = pt(a, r);
      const tang = a + (side === 1 ? -Math.PI / 2 : Math.PI / 2); // along the branch, upward
      o += leaf(x, y, tang - side * 0.5, 22 - t * 6, 5.6 - t * 1.4, fill) + leaf(x, y, tang + side * 0.55, 20 - t * 6, 5 - t * 1.2, fill);
    }
    let stem = '';
    for (let i = 0; i <= 24; i++) { const [x, y] = pt(deg(90 + side * (12 + (i / 24) * 140)), 57); stem += `${i ? 'L' : 'M'}${n1(x)} ${n1(y)}`; }
    o += `<path d="${stem}" fill="none" stroke="#7a5700" stroke-width="1.6" stroke-linecap="round"/>`;
  }
  // The ribbon bow at the bottom.
  o += `<path d="M100 160L88 172L94 160L84 164L96 154z M100 160L112 172L106 160L116 164L104 154z" fill="#b91c1c" stroke="#7f1d1d" stroke-width=".8"/><circle cx="100" cy="158" r="4" fill="${fill}" stroke="#7a5700" stroke-width=".8"/>`;
  return frame(o, defs);
}
export const laurelGold = () => laurel('url(#gd)', GOLD);
export const laurelSilver = () => laurel('url(#sv)', SILVER);

export function gems() {
  const cols = [['#ef4444', '#7f1d1d'], ['#38bdf8', '#0c4a6e'], ['#34d399', '#065f46'], ['#facc15', '#854d0e']];
  let o = band(55, 8, 'url(#gd)') + bevel(55, 8);
  for (let i = 0; i < 8; i++) {
    const a = deg(i * 45 - 90), [x, y] = pt(a, 55), [c1, c2] = cols[i % 4], big = i % 2 === 0, s = big ? 8 : 5.4;
    o += `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${i * 45})"><path d="M0 ${-s}L${s * 0.9} 0L0 ${s}L${-s * 0.9} 0z" fill="${c1}" stroke="url(#gd)" stroke-width="1.8"/><path d="M0 ${-s}L${s * 0.9} 0L0 ${s * 0.2}z" fill="#fff" opacity=".35"/><path d="M0 ${-s * 0.6}L${s * 0.4} ${-s * 0.1}L0 ${s * 0.1}L${-s * 0.4} ${-s * 0.1}z" fill="${c2}" opacity=".35"/></g>`;
  }
  return frame(o, GOLD);
}

export function spikes() {
  let o = band(54, 6, 'url(#sv)') + bevel(54, 6);
  for (let i = 0; i < 16; i++) { const a = deg(i * 22.5), [x, y] = pt(a, 55), [tx, ty] = pt(a, 74); const [lx, ly] = pt(a - 0.12, 57), [rx, ry] = pt(a + 0.12, 57); o += `<path d="M${n1(lx)} ${n1(ly)}L${n1(tx)} ${n1(ty)}L${n1(rx)} ${n1(ry)}z" fill="url(#sv)" stroke="#3b4350" stroke-width=".8"/><path d="M${n1(x)} ${n1(y)}L${n1(tx)} ${n1(ty)}" stroke="#fff" stroke-opacity=".7" stroke-width=".8"/>`; }
  return frame(o, SILVER);
}

export function rays() {
  let o = '';
  for (let i = 0; i < 24; i++) { const a = deg(i * 15), long = i % 2 === 0, [lx, ly] = pt(a - 0.09, 54), [rx, ry] = pt(a + 0.09, 54), [tx, ty] = pt(a, long ? 90 : 72); o += `<path d="M${n1(lx)} ${n1(ly)}L${n1(tx)} ${n1(ty)}L${n1(rx)} ${n1(ry)}z" fill="${long ? 'url(#gd)' : '#fde68a'}" stroke="#a16207" stroke-width=".6"/>`; }
  return frame(`<g class="rr">${o}</g>` + band(53, 5, 'url(#gd)') + bevel(53, 5), GOLD, '.rr{transform-origin:100px 100px;animation:rr 40s linear infinite}@keyframes rr{to{transform:rotate(360deg)}}');
}

export function pixel() {
  const P = 6;
  let o = '', cells = [];
  // A blocky circle ring: cells whose centre is near radius 56.
  for (let gy = -16; gy <= 16; gy++) for (let gx = -16; gx <= 16; gx++) { const d = Math.hypot(gx, gy) * P; if (d > 50 && d < 62) cells.push([gx, gy]); }
  cells.forEach(([gx, gy], i) => { o += `<rect x="${C + gx * P - P / 2}" y="${C + gy * P - P / 2}" width="${P}" height="${P}" fill="${['#22d3ee', '#a3e635', '#f472b6', '#fde047'][(gx + gy + 40) % 4]}" stroke="#0a0a0a" stroke-width="1"/>`; });
  return fx(`<g shape-rendering="crispEdges">${o}</g>`, { style: '' });
}

export function reel() {
  let o = band(60, 20, '#16161a');
  for (let i = 0; i < 20; i++) { const a = deg(i * 18), [x, y] = pt(a, 60); o += `<rect x="${n1(x - 3.6)}" y="${n1(y - 5)}" width="7.2" height="10" rx="1.6" fill="#f5f5f4" transform="rotate(${i * 18 + 90} ${n1(x)} ${n1(y)})"/>`; }
  return frame(o + band(70.5, 1.6, '#3b3b44') + band(49.6, 1.6, '#3b3b44'), '');
}

export function circuit() {
  const r = rngFor('circuitframe');
  let o = band(54, 3, '#0e7490') + band(54, 1, '#67e8f9');
  for (let i = 0; i < 12; i++) {
    const a = deg(i * 30 + r.range(-6, 6)), [x0, y0] = pt(a, 56), [x1, y1] = pt(a, 56 + r.range(8, 20)), [x2, y2] = pt(a + 0.18, 56 + r.range(16, 28));
    o += `<path d="M${n1(x0)} ${n1(y0)}L${n1(x1)} ${n1(y1)}L${n1(x2)} ${n1(y2)}" fill="none" stroke="#0e7490" stroke-width="1.8"/><circle cx="${n1(x2)}" cy="${n1(y2)}" r="3.2" fill="#0b1c2c" stroke="#22d3ee" stroke-width="1.4"/>`;
  }
  let pulse = '';
  for (let i = 0; i < 4; i++) pulse += orbit(`<circle cx="100" cy="46" r="3" fill="#a5f3fc" filter="url(#gl)"/>`, { dur: 4 + i, delay: i * 1.1 });
  return fx(`<g filter="url(#ds)">${o}</g>` + pulse, { defs: SHADOW });
}

export function thorns() {
  const r = rngFor('thorns');
  let vine = '';
  for (let i = 0; i <= 60; i++) { const a = deg(i * 6), rad = 56 + Math.sin(i * 0.9) * 3.4, [x, y] = pt(a, rad); vine += `${i ? 'L' : 'M'}${n1(x)} ${n1(y)}`; }
  let o = `<path d="${vine}Z" fill="none" stroke="#14532d" stroke-width="5" stroke-linejoin="round"/><path d="${vine}Z" fill="none" stroke="#22803f" stroke-width="2.4" stroke-linejoin="round"/>`;
  for (let i = 0; i < 18; i++) { const a = deg(i * 20 + r.range(-4, 4)), [x, y] = pt(a, 58), [tx, ty] = pt(a + r.range(-0.15, 0.15), 70 + r.range(0, 6)); o += `<path d="M${n1(x - 2)} ${n1(y)}L${n1(tx)} ${n1(ty)}L${n1(x + 2)} ${n1(y)}z" fill="#365314" stroke="#14532d" stroke-width=".5"/>`; }
  for (let i = 0; i < 6; i++) { const a = deg(i * 60 + 20), [x, y] = pt(a, 60); o += `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${i * 60})"><circle r="6.6" fill="#be123c"/><path d="M0-4.6C3-4.6 4.6-2 3.6.6C2.6 3 -1 4 -3 2.4C-4.8.8-3.4-1.8-1.6-2.4C0-3 1.6-1.4 .8.2" fill="none" stroke="#fda4af" stroke-width="1"/></g>`; }
  return frame(o);
}

export function chain() {
  let o = '';
  for (let i = 0; i < 18; i++) { const a = deg(i * 20), [x, y] = pt(a, 58), flat = i % 2 === 0; o += `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${i * 20 + 90})"><rect x="${flat ? -5.4 : -2.6}" y="-8" width="${flat ? 10.8 : 5.2}" height="16" rx="${flat ? 5 : 2.4}" fill="none" stroke="url(#sv)" stroke-width="3"/><rect x="${flat ? -5.4 : -2.6}" y="-8" width="${flat ? 10.8 : 5.2}" height="16" rx="${flat ? 5 : 2.4}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".8"/></g>`; }
  return frame(o, SILVER);
}

export function frost() {
  const r = rngFor('frost');
  let o = band(54, 5, 'url(#fr)') + band(54, 1.2, '#fff');
  for (let i = 0; i < 14; i++) {
    const a = deg(i * (360 / 14) + r.range(-5, 5)), len = r.range(12, 24), [x, y] = pt(a, 55);
    const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
    const branch = (t, s) => `M${n1(x + ux * t)} ${n1(y + uy * t)}L${n1(x + ux * (t + s) + px * s * 0.7)} ${n1(y + uy * (t + s) + py * s * 0.7)}M${n1(x + ux * t)} ${n1(y + uy * t)}L${n1(x + ux * (t + s) - px * s * 0.7)} ${n1(y + uy * (t + s) - py * s * 0.7)}`;
    o += `<path d="M${n1(x)} ${n1(y)}L${n1(x + ux * len)} ${n1(y + uy * len)}${branch(len * 0.4, len * 0.3)}${branch(len * 0.7, len * 0.22)}" stroke="#7dd3fc" stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="M${n1(x)} ${n1(y)}L${n1(x + ux * len)} ${n1(y + uy * len)}${branch(len * 0.4, len * 0.3)}${branch(len * 0.7, len * 0.22)}" stroke="#fff" stroke-width="1" stroke-linecap="round" fill="none"/>`;
  }
  return frame(o, lg('fr', [[0, '#e0f7ff'], [0.5, '#7dd3fc'], [1, '#bae6fd']], [0, 0, 1, 1]), '');
}

export function allstar() {
  let o = band(55, 7, '#1e3a8a') + band(55, 7, 'url(#bgl)') + bevel(55, 7) + band(55, 1.2, '#fff');
  for (let i = 0; i < 10; i++) { const a = deg(i * 36 - 90), [x, y] = pt(a, 55); o += `<path d="${star(n1(x), n1(y), 8, 3.6)}" fill="${i % 2 ? '#fff' : '#fde047'}" stroke="#1e3a8a" stroke-width="1.2" stroke-linejoin="round"/>`; }
  return frame(o, lg('bgl', [[0, '#3b82f6'], [1, '#1e3a8a']], [0, 0, 1, 1]));
}

export function cup() {
  // Two big trophy handles curve out from the sides; the ring is gold.
  const handle = (side) => `<path d="M${C + side * 52} 78C${C + side * 96} 62 ${C + side * 100} 130 ${C + side * 56} 126" fill="none" stroke="url(#gd)" stroke-width="8" stroke-linecap="round"/><path d="M${C + side * 52} 78C${C + side * 96} 62 ${C + side * 100} 130 ${C + side * 56} 126" fill="none" stroke="#fff7c8" stroke-opacity=".6" stroke-width="1.6" stroke-linecap="round" transform="translate(${-side * 1.6} -1.4)"/>`;
  return frame(handle(-1) + handle(1) + band(54, 8, 'url(#gd)') + bevel(54, 8) + `<path d="M84 160H116L112 172H88z" fill="url(#gd)" stroke="#7a5700" stroke-width="1"/><rect x="78" y="172" width="44" height="9" rx="2" fill="#3a2a10"/><rect x="82" y="174" width="36" height="5" fill="url(#gd)"/>`, GOLD);
}

export function crownring() {
  const crown = `<g transform="translate(100 38)"><path d="M-26 8L-30-14L-14-2L0-20L14-2L30-14L26 8z" fill="url(#gd)" stroke="#7a5700" stroke-width="1.4"/><rect x="-26" y="8" width="52" height="7" rx="2" fill="url(#gd)" stroke="#7a5700" stroke-width="1.2"/><circle cx="0" cy="-3" r="3.4" fill="#ef4444" stroke="#7f1d1d" stroke-width=".8"/><circle cx="-15" cy="1" r="2.4" fill="#38bdf8" stroke="#0c4a6e" stroke-width=".6"/><circle cx="15" cy="1" r="2.4" fill="#38bdf8" stroke="#0c4a6e" stroke-width=".6"/><circle cx="-30" cy="-14" r="2.4" fill="#fff7c8"/><circle cx="30" cy="-14" r="2.4" fill="#fff7c8"/><circle cx="0" cy="-20" r="2.6" fill="#fff7c8"/></g>`;
  return frame(band(54, 8, 'url(#gd)') + bevel(54, 8) + crown, GOLD);
}
