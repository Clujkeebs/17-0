// Art for the drop-only items: two effects (Meteor shower, Laser show) and a banner (Total eclipse).
import { C, fx, glint, rngFor, lg, rg, n1, n2 } from './fxlib.mjs';
import { svg, rng, stars, TWINKLE_CSS, grain, grainDef, wave } from './lib.mjs';

/**
 * Meteor shower: streaks fall past the picture from upper right to lower left. Every path stays outside the
 * avatar (radius 50), so the face is never covered. Resting pose (reduced motion) has them mid-flight.
 */
export function meteors() {
  const r = rngFor('meteors');
  const ang = (35 * Math.PI) / 180, ux = -Math.cos(ang), uy = Math.sin(ang), nx = Math.sin(ang), ny = Math.cos(ang);
  const offsets = [62, -64, 78, -80, 94, -92, 68];
  let body = '';
  offsets.forEach((o, i) => {
    // Resting point: 40 units along the path from the centre line's foot of the perpendicular.
    const t = r.range(-70, 20), x = C + o * nx + t * ux, y = C + o * ny + t * uy;
    const len = r.range(34, 52), w = r.range(1.6, 2.6), dur = n1(r.range(3, 4.8)), delay = n1(-r.range(0, 4.5));
    const tail = `M0 0L${n1(-ux * len)} ${n1(-uy * len)}`;
    const cool = i % 3 === 0, ring = cool ? '#2563eb' : '#ea580c';
    body += `<g transform="translate(${n1(x)} ${n1(y)})"><g class="mt" style="animation-duration:${dur}s;animation-delay:${delay}s">`
      + `<path d="${tail}" stroke="url(#mt${cool ? 'b' : 'a'})" stroke-width="${n2(w * 3)}" stroke-linecap="round" opacity=".45" filter="url(#bl)"/>`
      + `<path d="${tail}" stroke="url(#mt${cool ? 'b' : 'a'})" stroke-width="${n2(w * 1.3)}" stroke-linecap="round" fill="none"/>`
      + `<circle r="${n2(w * 3.2)}" fill="${ring}" opacity=".28"/><circle r="${n2(w * 1.7)}" fill="#fff" stroke="${ring}" stroke-width="1.3" filter="url(#gl)"/></g></g>`;
  });
  // A few stars that twinkle in the gaps.
  for (let i = 0; i < 5; i++) { const a = r.range(0, Math.PI * 2), d = r.range(60, 92); body += `<g transform="translate(${n1(C + Math.cos(a) * d)} ${n1(C + Math.sin(a) * d)})" class="tw" style="animation-delay:${n1(-r() * 2)}s">${glint(r.range(2, 3.4), '#fff7d6')}</g>`; }
  const travel = `${n1(ux * 300)}px ${n1(uy * 300)}px`, back = `${n1(-ux * 120)}px ${n1(-uy * 120)}px`;
  return fx(body, {
    defs: lg('mta', [[0, '#f97316', 0], [0.6, '#f97316', 0.85], [1, '#fde047', 1]], [0, 0, 1, 0]).replace('x1="0" y1="0" x2="1" y2="0"', `x1="${n1(-ux)}" y1="${n1(-uy)}" x2="0" y2="0"`)
      + lg('mtb', [[0, '#2563eb', 0], [0.6, '#2563eb', 0.85], [1, '#67e8f9', 1]], [0, 0, 1, 0]).replace('x1="0" y1="0" x2="1" y2="0"', `x1="${n1(-ux)}" y1="${n1(-uy)}" x2="0" y2="0"`),
    style: `.mt{animation:mt linear infinite}@keyframes mt{0%{transform:translate(${back});opacity:0}12%{opacity:1}78%{opacity:1}100%{transform:translate(${travel});opacity:0}}`,
  }).replace('<path d="M0 0', '<path d="M0 0');
}

/** Laser show: colored beams sweep out from behind the picture; a thin neon rim and sparkles in front. */
export function lasers() {
  const r = rngFor('lasers');
  const beam = (a, color, w, len = 112) => {
    const x = C + Math.cos(a) * len, y = C + Math.sin(a) * len, px = -Math.sin(a) * w, py = Math.cos(a) * w;
    return `<path d="M${C} ${C}L${n1(x + px)} ${n1(y + py)}L${n1(x - px)} ${n1(y - py)}z" fill="${color}"/>`;
  };
  const set = (n, colors, w, phase) => Array.from({ length: n }, (_, i) => beam(phase + (i / n) * Math.PI * 2, colors[i % colors.length], w)).join('');
  const back = fx(
    `<g class="lz lz1" filter="url(#bl)" opacity=".5">${set(8, ['#ff2bd6', '#22d3ee', '#a3e635', '#facc15'], 3.2, 0.2)}</g>`
    + `<g class="lz lz1" opacity=".85">${set(8, ['#ff2bd6', '#22d3ee', '#a3e635', '#facc15'], 0.9, 0.2)}</g>`
    + `<g class="lz lz2" filter="url(#bl)" opacity=".4">${set(6, ['#22d3ee', '#ff2bd6', '#facc15'], 3, 0.6)}</g>`
    + `<g class="lz lz2" opacity=".75">${set(6, ['#22d3ee', '#ff2bd6', '#facc15'], 0.8, 0.6)}</g>`
    + `<circle cx="100" cy="100" r="52" fill="url(#lzg)"/>`,
    { defs: rg('lzg', [[0.7, '#ff2bd6', 0.0], [0.9, '#ff2bd6', 0.35], [1, '#22d3ee', 0]], [0.5, 0.5, 0.5]),
      style: '.lz{transform-origin:100px 100px;animation:lz linear infinite}.lz1{animation-duration:16s}.lz2{animation-duration:23s;animation-direction:reverse}@keyframes lz{to{transform:rotate(360deg)}}' },
  );
  let sp = '';
  for (let i = 0; i < 7; i++) { const a = r.range(0, Math.PI * 2), d = r.range(56, 88); sp += `<g transform="translate(${n1(C + Math.cos(a) * d)} ${n1(C + Math.sin(a) * d)})" class="tw" style="animation-delay:${n1(-r() * 2)}s">${glint(r.range(2, 3.6), i % 2 ? '#a5f3fc' : '#fbcfe8')}</g>`; }
  const front = fx(`<circle cx="100" cy="100" r="51.5" fill="none" stroke="url(#lzr)" stroke-width="1.6" filter="url(#gl)" class="lzr"/>` + sp, {
    defs: `<linearGradient id="lzr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff2bd6"/><stop offset=".5" stop-color="#22d3ee"/><stop offset="1" stop-color="#a3e635"/></linearGradient>`,
    style: '.lzr{animation:lzh 6s linear infinite}@keyframes lzh{0%,100%{opacity:.95}50%{opacity:.55}}',
  });
  return { '': front, '-back': back };
}

/** Total eclipse: a black moon with a breathing corona over a ridge line, a bright glint on its rim, and stars. */
export function eclipse() {
  const W = 1200, H = 300, cx = 740, cy = 128, R = 78;
  const r = rng('eclipse');
  let rays = '';
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 + r.range(-0.08, 0.08), len = r.range(70, 190), w = r.range(1.2, 3.2);
    const x0 = cx + Math.cos(a) * (R - 4), y0 = cy + Math.sin(a) * (R - 4), x1 = cx + Math.cos(a) * (R + len), y1 = cy + Math.sin(a) * (R + len);
    const px = -Math.sin(a) * w, py = Math.cos(a) * w;
    rays += `<path d="M${n1(x0 + px)} ${n1(y0 + py)}L${n1(x1)} ${n1(y1)}L${n1(x0 - px)} ${n1(y0 - py)}z" fill="url(#ray)" opacity="${n2(r.range(0.25, 0.7))}"/>`;
  }
  const ridge = wave(W, 262, 9, 260, 0.6, H) ;
  const ridge2 = wave(W, 278, 7, 190, 2.1, H);
  return svg(W, H, {
    defs: lg('sky', [[0, '#04010c'], [0.6, '#0d0624'], [1, '#1b0d3d']]) + rg('corona', [[0.55, '#fff3c4', 0.95], [0.62, '#fbbf24', 0.55], [0.8, '#f97316', 0.16], [1, '#7c3aed', 0]], [0.5, 0.5, 0.5])
      + lg('ray', [[0, '#fff3c4', 0.9], [1, '#fbbf24', 0]], [0, 0, 1, 0]) + rg('glint', [[0, '#fff', 1], [0.25, '#fff7d6', 0.8], [1, '#fbbf24', 0]]) + grainDef('grain', 0.06),
    body: `<rect width="${W}" height="${H}" fill="url(#sky)"/>${stars(r, 120, W, 200, { maxY: 200, twinkle: 0.3 })}`
      + `<g class="co"><circle cx="${cx}" cy="${cy}" r="${R * 2.1}" fill="url(#corona)"/>${rays}</g>`
      + `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#02000a"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#fde68a" stroke-width="1.4" opacity=".85"/>`
      + `<g class="gl"><circle cx="${cx - R * 0.72}" cy="${cy - R * 0.62}" r="16" fill="url(#glint)"/><path d="M${cx - R * 0.72 - 30} ${cy - R * 0.62}H${cx - R * 0.72 + 30}M${cx - R * 0.72} ${cy - R * 0.62 - 30}V${cy - R * 0.62 + 30}" stroke="#fff" stroke-width="1.2" opacity=".8"/></g>`
      + `<path d="${ridge}" fill="#05020f"/><path d="${ridge2}" fill="#020008"/>` + grain(W, H),
    style: TWINKLE_CSS + '.co{transform-origin:740px 128px;animation:co 7s ease-in-out infinite alternate}@keyframes co{from{opacity:.82;transform:scale(.97)}to{opacity:1;transform:scale(1.03)}}.gl{animation:gl 4.5s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes gl{0%,100%{opacity:.55;transform:scale(.85)}50%{opacity:1;transform:scale(1.1)}}',
  });
}
