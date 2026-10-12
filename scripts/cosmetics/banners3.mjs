import { rng, svg, lg, rg, grainDef, grain, blurDef, stars, TWINKLE_CSS, bokeh, crowd, shade, mix, skyline, FLICKER_CSS, hex, star, sparkle, n1, n2, wave } from './lib.mjs';

const W = 1200, H = 300;

/** Trophy room: dark wood shelves, gold trophies under spotlights, drifting dust. */
export function trophy() {
  const r = rng('trophy');
  const cup = (x, y, s, kind) => {
    const g = `<g transform="translate(${x} ${y}) scale(${s})">`;
    if (kind === 0) return `${g}<path d="M-26 -62H26C26 -30 14 -16 4 -12V-2H18V10H-18V-2H-4V-12C-14 -16 -26 -30 -26 -62z" fill="url(#gold)" stroke="#7a5700" stroke-width="2"/><path d="M-26 -52C-48 -52 -48 -26 -22 -26M26 -52C48 -52 48 -26 22 -26" fill="none" stroke="url(#gold)" stroke-width="6"/><path d="M-12 -56V-34" stroke="#fff6c7" stroke-width="4" stroke-linecap="round" opacity=".7"/><rect x="-22" y="10" width="44" height="14" rx="2" fill="#3a2a10"/><rect x="-16" y="13" width="32" height="8" fill="#e8c547"/></g>`;
    if (kind === 1) return `${g}<path d="M0 -70L10 -46L36 -44L16 -28L22 -2L0 -16L-22 -2L-16 -28L-36 -44L-10 -46z" fill="url(#gold)" stroke="#7a5700" stroke-width="2"/><rect x="-6" y="-2" width="12" height="22" fill="url(#gold)"/><rect x="-24" y="18" width="48" height="12" rx="2" fill="#3a2a10"/></g>`;
    return `${g}<ellipse cx="0" cy="-34" rx="26" ry="34" fill="#f5f5f4" stroke="#9ca3af" stroke-width="2"/><path d="M-26 -34C-14 -50 14 -50 26 -34M-26 -34C-14 -18 14 -18 26 -34" fill="none" stroke="#c8102e" stroke-width="2"/><rect x="-18" y="-2" width="36" height="12" rx="2" fill="#3a2a10"/></g>`;
  };
  let dust = '';
  for (let i = 0; i < 50; i++) dust += `<circle cx="${n1(r() * W)}" cy="${n1(r() * H)}" r="${n2(r.range(0.8, 2.2))}" fill="#ffe9a8" opacity="${n2(r.range(0.2, 0.7))}" class="dst" style="animation-duration:${n1(r.range(8, 18))}s;animation-delay:${n1(-r() * 14)}s"/>`;
  return svg(W, H, {
    defs: lg('wood', [[0, '#2b1a0e'], [1, '#150c05']], [0, 0, 1, 0]) + lg('gold', [[0, '#fff1b0'], [0.4, '#e8c547'], [1, '#8a6400']], [0, 0, 1, 1]) + lg('shelf', [[0, '#7a4a22'], [1, '#3b2310']]) + lg('beam', [[0, '#fff3c4', 0.5], [1, '#fff3c4', 0]]) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#wood)"/>` + [...Array(20)].map((_, i) => `<rect x="${i * 62}" y="0" width="2" height="${H}" fill="#000" opacity=".25"/>`).join('')
      + [0, 1].map((row) => `<rect y="${126 + row * 126}" width="${W}" height="10" fill="url(#shelf)"/><rect y="${136 + row * 126}" width="${W}" height="8" fill="#000" opacity=".4"/>`).join('')
      + [90, 330, 570, 810, 1050].map((x, i) => `<path d="M${x} -10L${x - 110} 140L${x + 110} 140z" fill="url(#beam)"/>`).join('')
      + [60, 190, 300, 420, 540, 660, 800, 930, 1060, 1150].map((x, i) => cup(x, 126, 0.8 + (i % 3) * 0.12, i % 3)).join('')
      + [120, 270, 440, 610, 760, 900, 1080].map((x, i) => cup(x, 252, 0.7 + (i % 3) * 0.1, (i + 1) % 3)).join('')
      + dust + grain(W, H),
    style: '.dst{animation-name:fl;animation-iteration-count:infinite;animation-timing-function:ease-in-out}@keyframes fl{0%,100%{transform:translate(0,0);opacity:.2}50%{transform:translate(18px,-22px);opacity:.9}}',
  });
}

/** Draft night: a stage with a big LED wall, crossing spotlights and a crowd with raised hands. */
export function draft() {
  const r = rng('draft');
  const beam = (x, c, cls) => `<path class="${cls}" d="M${x} -10L${x - 120} ${H}L${x + 120} ${H}z" fill="${c}" opacity=".3"/>`;
  let hands = '';
  for (let i = 0; i < 34; i++) { const x = 20 + i * 36 + r.range(-8, 8), h = r.range(18, 40); hands += `<path d="M${n1(x)} 290V${n1(268 - h)}" stroke="#05030b" stroke-width="5" stroke-linecap="round"/><circle cx="${n1(x)}" cy="${n1(264 - h)}" r="4.4" fill="#05030b"/>`; }
  return svg(W, H, {
    defs: lg('bg', [[0, '#12062a'], [1, '#2b0f4f']]) + lg('wall', [[0, '#ff2d95'], [0.5, '#7a3cff'], [1, '#00c2ff']], [0, 0, 1, 1]) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#bg)"/>`
      + beam(200, '#ff4fb0', 'sa') + beam(1000, '#4fb6ff', 'sb') + beam(600, '#fff', 'sc')
      + `<rect x="330" y="40" width="540" height="150" rx="6" fill="#0a0418" stroke="#3b2a6b" stroke-width="4"/><rect x="342" y="52" width="516" height="126" fill="url(#wall)"/>`
      + `<g opacity=".4">${[...Array(10)].map((_, i) => `<rect x="${342 + i * 52}" y="52" width="26" height="126" fill="#fff" opacity="${i % 2 ? 0.1 : 0.22}"/>`).join('')}</g>`
      + `<text x="600" y="136" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="68" fill="#fff" stroke="#12062a" stroke-width="2" letter-spacing="4">DRAFT</text>`
      + `<rect x="300" y="190" width="600" height="14" fill="#1b0b36"/><rect x="300" y="204" width="600" height="3" fill="#ff2d95"/>`
      + `<rect y="270" width="${W}" height="30" fill="#05030b"/>${hands}`
      + [...Array(80)].map(() => { const c = ['#ff2d95', '#00c2ff', '#facc15', '#fff'][Math.floor(r() * 4)]; return `<rect x="${n1(r() * W)}" y="-10" width="${n1(r.range(5, 10))}" height="3.4" fill="${c}" class="c" style="animation-duration:${n1(r.range(4, 9))}s;animation-delay:${n1(-r() * 9)}s;--r:${r.int(180, 800)}deg"/>`; }).join('')
      + grain(W, H),
    style: '.sa{transform-origin:200px -10px;animation:sw 7s ease-in-out infinite alternate}.sb{transform-origin:1000px -10px;animation:sw 9s ease-in-out infinite alternate-reverse}.sc{transform-origin:600px -10px;animation:sw 12s ease-in-out infinite alternate}@keyframes sw{from{transform:rotate(-16deg)}to{transform:rotate(16deg)}}.c{animation-name:cf;animation-timing-function:linear;animation-iteration-count:infinite;transform-box:fill-box;transform-origin:center}@keyframes cf{from{transform:translateY(0) rotate(0)}to{transform:translateY(330px) rotate(var(--r))}}',
  });
}

/** Synthwave: a banded sun, a neon mountain line and a perspective grid that rolls toward you. */
export function synthwave() {
  const r = rng('synth');
  let grid = '';
  for (let i = -16; i <= 16; i++) grid += `<path d="M600 160L${600 + i * 130} ${H}" stroke="#ff3dd0" stroke-width="1.6" opacity=".8"/>`;
  return svg(W, H, {
    defs: lg('sky', [[0, '#12033a'], [0.6, '#5b0a8a'], [1, '#ff3d8a']]) + lg('sun', [[0, '#ffe45e'], [0.5, '#ff7a3d'], [1, '#ff2d95']]) + `<mask id="sl"><rect width="${W}" height="${H}" fill="#fff"/>${[...Array(7)].map((_, i) => `<rect x="440" y="${100 + i * 13 + i * i * 0.9}" width="320" height="${2 + i * 1.3}" fill="#000"/>`).join('')}</mask>` + blurDef('g', 3) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#sky)"/>${stars(r, 60, W, 130, { maxY: 130, twinkle: 0.5 })}`
      + `<g mask="url(#sl)"><circle cx="600" cy="136" r="92" fill="url(#sun)"/></g><circle cx="600" cy="136" r="94" fill="none" stroke="#ff9ac6" stroke-width="1.5" opacity=".5" filter="url(#g)"/>`
      + `<path d="M0 160L90 132L150 150L240 108L330 148L420 126L500 160H700L790 124L880 152L960 112L1050 146L1130 130L1200 160" fill="#12033a" stroke="#00e5ff" stroke-width="2.4" filter="url(#g)"/><path d="M0 160L90 132L150 150L240 108L330 148L420 126L500 160H700L790 124L880 152L960 112L1050 146L1130 130L1200 160V162H0z" fill="#12033a"/>`
      + `<rect y="160" width="${W}" height="${H - 160}" fill="#12033a"/>${grid}`
      + `<g class="gr">${[...Array(10)].map((_, i) => `<rect x="0" y="${160 + Math.pow(i / 9, 2.2) * 140}" width="${W}" height="${1 + i * 0.35}" fill="#ff3dd0" opacity=".85"/>`).join('')}</g><rect y="160" width="${W}" height="${H - 160}" fill="url(#sky)" opacity=".18"/>` + grain(W, H),
    style: TWINKLE_CSS + '.gr{animation:gr 1.6s linear infinite}@keyframes gr{from{transform:translateY(0)}to{transform:translateY(20px)}}',
  });
}

/** Comic: halftone dots, speed lines and a POW burst. */
export function comic() {
  let lines = '';
  for (let i = 0; i < 44; i++) { const a = (i / 44) * Math.PI * 2; lines += `<path d="M900 150L${n1(900 + Math.cos(a - 0.02) * 1100)} ${n1(150 + Math.sin(a - 0.02) * 1100)}L${n1(900 + Math.cos(a + 0.02) * 1100)} ${n1(150 + Math.sin(a + 0.02) * 1100)}z" fill="#fff" opacity="${i % 2 ? 0.55 : 0.2}"/>`; }
  return svg(W, H, {
    defs: `<pattern id="ht" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="6" cy="6" r="3.2" fill="#e11d48" opacity=".55"/></pattern>` + lg('bg', [[0, '#fde047'], [1, '#fb923c']], [0, 0, 1, 1]),
    body: `<rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" fill="url(#ht)"/><g class="sp">${lines}</g>`
      + `<g transform="translate(900 150)" class="pow"><path d="${star(0, 0, 150, 98, 14, -Math.PI / 2)}" fill="#fff" stroke="#111" stroke-width="7" stroke-linejoin="round"/><path d="${star(0, 0, 124, 80, 14, -Math.PI / 2)}" fill="#ef4444" stroke="#111" stroke-width="5" stroke-linejoin="round"/>`
      + `<text x="0" y="22" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="82" fill="#fde047" stroke="#111" stroke-width="5" paint-order="stroke" transform="rotate(-8)">POW!</text></g>`
      + `<rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="none" stroke="#111" stroke-width="8"/>`,
    style: '.sp{transform-origin:900px 150px;animation:sp 24s linear infinite}@keyframes sp{to{transform:rotate(360deg)}}.pow{animation:pw 1.1s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center}@keyframes pw{from{transform:translate(900px,150px) scale(.96)}to{transform:translate(900px,150px) scale(1.04)}}',
  });
}

/** Circuit: right-angle traces, pads and pulses of light travelling along them. */
export function circuit() {
  const r = rng('circuit');
  let traces = '', pads = '', pulses = '';
  for (let i = 0; i < 36; i++) {
    let x = Math.round(r() * 60) * 20, y = Math.round(r() * 15) * 20, d = `M${x} ${y}`;
    const seg = r.int(3, 6);
    for (let k = 0; k < seg; k++) { const horizontal = k % 2 === 0; const len = r.int(2, 9) * 20 * (r() < 0.5 ? -1 : 1); if (horizontal) x += len; else y += len; d += `L${x} ${y}`; }
    traces += `<path d="${d}" fill="none" stroke="#0e7490" stroke-width="2.4" opacity=".7"/>`;
    pads += `<circle cx="${x}" cy="${y}" r="5" fill="#0b1c2c" stroke="#22d3ee" stroke-width="2"/>`;
    if (i % 3 === 0) pulses += `<path d="${d}" fill="none" stroke="#a5f3fc" stroke-width="3" stroke-linecap="round" pathLength="100" stroke-dasharray="6 94" class="pl" style="animation-delay:${n1(-r() * 5)}s;animation-duration:${n1(r.range(3, 7))}s"/>`;
  }
  return svg(W, H, {
    defs: lg('bg', [[0, '#04101c'], [1, '#08213a']], [0, 0, 1, 1]) + blurDef('g', 2),
    body: `<rect width="${W}" height="${H}" fill="url(#bg)"/>${traces}${pads}<g filter="url(#g)">${pulses}</g>${pulses}`
      + [[300, 100], [760, 200]].map(([x, y]) => `<rect x="${x - 40}" y="${y - 30}" width="80" height="60" rx="4" fill="#0b1c2c" stroke="#22d3ee" stroke-width="2.4"/>${[...Array(5)].map((_, i) => `<rect x="${x - 48}" y="${y - 24 + i * 11}" width="8" height="5" fill="#22d3ee"/><rect x="${x + 40}" y="${y - 24 + i * 11}" width="8" height="5" fill="#22d3ee"/>`).join('')}<rect x="${x - 20}" y="${y - 12}" width="40" height="24" fill="#22d3ee" opacity=".15"/>`).join(''),
    style: '.pl{stroke-dashoffset:0;animation-name:pl;animation-timing-function:linear;animation-iteration-count:infinite}@keyframes pl{from{stroke-dashoffset:100}to{stroke-dashoffset:-100}}',
  });
}

/** Galaxy: deep space with nebula clouds, a ringed planet and the odd shooting star. */
export function galaxy() {
  const r = rng('galaxy');
  return svg(W, H, {
    defs: `<filter id="neb" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.009" numOctaves="5" seed="12" result="t"/><feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.2  0 0 0 0 0.9  2.2 0 0 0 -0.7"/></filter><filter id="neb2" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.005 0.01" numOctaves="5" seed="31" result="t"/><feColorMatrix type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.6  0 0 0 0 0.95  2.2 0 0 0 -0.8"/></filter>`
      + lg('bg', [[0, '#04020f'], [1, '#0b0524']], [0, 0, 1, 1]) + rg('pl', [[0, '#fbbf8a'], [0.7, '#c2603a'], [1, '#5b2a1a']], [0.35, 0.3, 0.8]),
    body: `<rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" filter="url(#neb)" opacity=".75"/><rect width="${W}" height="${H}" filter="url(#neb2)" opacity=".5"/>${stars(r, 220, W, H, { twinkle: 0.3, max: 1.8 })}`
      + `<g transform="translate(950 130) rotate(-18)"><ellipse cx="0" cy="0" rx="130" ry="26" fill="none" stroke="#fde7c8" stroke-width="10" opacity=".35"/><circle r="62" fill="url(#pl)"/><path d="M-62 -6Q0 22 62 -6" fill="none" stroke="#7a3a22" stroke-width="3" opacity=".4"/><path d="M-130 0Q0 -26 130 0" fill="none" stroke="#fde7c8" stroke-width="10" opacity=".5" transform="scale(1 -1)"/></g>`
      + `<g class="ss1"><path d="M0 0L-90 -30" stroke="url(#tail)" stroke-width="2.4" stroke-linecap="round"/><circle r="2.6" fill="#fff"/></g><g class="ss2"><path d="M0 0L-70 -22" stroke="url(#tail)" stroke-width="2" stroke-linecap="round"/><circle r="2.2" fill="#fff"/></g>`,
    style: TWINKLE_CSS + '.ss1{animation:ss 7s linear infinite}.ss2{animation:ss 11s linear infinite -5s}@keyframes ss{0%{transform:translate(1250px,20px);opacity:0}4%{opacity:1}22%{transform:translate(500px,260px);opacity:0}100%{transform:translate(500px,260px);opacity:0}}',
  }).replace('</defs>', lg('tail', [[0, '#fff'], [1, '#fff', 0]], [0, 0, 1, 0]) + '</defs>');
}

/** Rain game: a night field under floodlights with rain streaking down and puddles. */
export function rain() {
  const r = rng('rain');
  let drops = '';
  for (let i = 0; i < 130; i++) drops += `<path d="M${n1(r() * 1400)} -20l-7 22" stroke="#cfe6ff" stroke-width="${n2(r.range(0.8, 1.6))}" opacity="${n2(r.range(0.25, 0.7))}" class="rn" style="animation-duration:${n2(r.range(0.55, 1.1))}s;animation-delay:${n1(-r() * 1.2)}s"/>`;
  return svg(W, H, {
    defs: lg('sky', [[0, '#0a1020'], [1, '#27344f']]) + rg('halo', [[0, '#e6f1ff', 0.8], [1, '#e6f1ff', 0]]) + lg('turf', [[0, '#1c5a30'], [1, '#0d3a1c']]) + lg('puddle', [[0, '#fff', 0.35], [1, '#fff', 0]]) + blurDef('b', 1.2) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#sky)"/>`
      + [200, 600, 1000].map((x) => `<circle cx="${x}" cy="40" r="150" fill="url(#halo)"/><circle cx="${x}" cy="40" r="10" fill="#fff"/>`).join('')
      + `<g opacity=".6">${crowd(r, W, 150, { rows: 3, size: 11, color: '#101a2c' })}</g><rect y="214" width="${W}" height="86" fill="url(#turf)"/>`
      + [[260, 258, 90], [700, 270, 130], [980, 250, 70]].map(([x, y, rx]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx / 7}" fill="#9ec3e6" opacity=".35"/><ellipse cx="${x}" cy="${y}" rx="${rx * 0.8}" ry="${rx / 12}" fill="url(#puddle)"/><ellipse class="rp" cx="${x + 10}" cy="${y}" rx="${rx / 4}" ry="${rx / 26}" fill="none" stroke="#fff" stroke-width="1.2"/>`).join('')
      + `<g filter="url(#b)" opacity=".5">${drops}</g>${drops}` + grain(W, H),
    style: '.rn{animation-name:rn;animation-timing-function:linear;animation-iteration-count:infinite}@keyframes rn{from{transform:translate(0,0)}to{transform:translate(-90px,340px)}}.rp{transform-box:fill-box;transform-origin:center;animation:rp 1.4s ease-out infinite}@keyframes rp{from{transform:scale(.3);opacity:1}to{transform:scale(2);opacity:0}}',
  });
}

/** Gilded: an art-deco sunburst in gold on black, with corner fans, concentric arcs and a sweeping shine. */
export function gilded() {
  let rays = '', arcs = '', fans = '';
  for (let i = 0; i < 36; i++) { const a0 = Math.PI + (i / 36) * Math.PI, a1 = Math.PI + ((i + 0.5) / 36) * Math.PI; rays += `<path d="M600 330L${n1(600 + Math.cos(a0) * 700)} ${n1(330 + Math.sin(a0) * 700)}L${n1(600 + Math.cos(a1) * 700)} ${n1(330 + Math.sin(a1) * 700)}z" fill="#e8c547" opacity="${i % 2 ? 0.1 : 0.05}"/>`; }
  for (let i = 0; i < 9; i++) arcs += `<path d="M${600 - (70 + i * 26)} 330A${70 + i * 26} ${70 + i * 26} 0 0 1 ${600 + (70 + i * 26)} 330" fill="none" stroke="url(#gold)" stroke-width="${i % 3 === 0 ? 3.2 : 1.1}" opacity="${i % 3 === 0 ? 0.95 : 0.5}"/>`;
  const corner = (x, y, sx, sy) => `<g transform="translate(${x} ${y}) scale(${sx} ${sy})">${[...Array(6)].map((_, i) => `<path d="M${20 + i * 14} 0A${20 + i * 14} ${20 + i * 14} 0 0 1 0 ${20 + i * 14}" fill="none" stroke="url(#gold)" stroke-width="${i % 2 ? 1.2 : 2.4}" opacity="${n2(0.95 - i * 0.1)}"/>`).join('')}<path d="M0 0L104 0M0 0L0 104M0 0L74 74" stroke="url(#gold)" stroke-width="1.2" opacity=".6"/></g>`;
  return svg(W, H, {
    defs: lg('bg', [[0, '#0a0a0a'], [1, '#1c1608']], [0, 0, 1, 1]) + lg('gold', [[0, '#fff1b0'], [0.45, '#e8c547'], [1, '#7a5700']], [0, 0, 1, 1]) + lg('sh', [[0, '#fff', 0], [0.5, '#fff', 0.35], [1, '#fff', 0]], [0, 0, 1, 0]) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#bg)"/>${rays}${arcs}<circle cx="600" cy="330" r="46" fill="url(#gold)"/>`
      + corner(14, 14, 1, 1) + corner(W - 14, 14, -1, 1) + corner(14, H - 14, 1, -1) + corner(W - 14, H - 14, -1, -1)
      + `<rect x="10" y="10" width="${W - 20}" height="${H - 20}" fill="none" stroke="url(#gold)" stroke-width="3"/><rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="none" stroke="#e8c547" stroke-width="1" opacity=".6"/>`
      + `<rect class="sh" x="-300" width="260" height="${H}" fill="url(#sh)" transform="skewX(-20)"/>` + grain(W, H),
    style: '.sh{animation:sh 7s ease-in-out infinite}@keyframes sh{0%,45%{transform:translateX(0) skewX(-20deg)}100%{transform:translateX(1600px) skewX(-20deg)}}',
  });
}

/** Sakura: a pale dawn, blossoming branches and petals drifting down. */
export function sakura() {
  const r = rng('sakura');
  const blossom = (x, y, s) => `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${Math.round(r() * 72)}) scale(${n2(s)})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-5.5" rx="3.6" ry="5.4" fill="#ffd0e0" stroke="#f08ab0" stroke-width=".5" transform="rotate(${a})"/>`).join('')}<circle r="1.8" fill="#e11d74"/></g>`;
  let branches = '', petals = '';
  const branch = (x0, y0, dir) => { let x = x0, y = y0, d = `M${x} ${y}`, out = ''; for (let i = 0; i < 9; i++) { x += dir * r.range(40, 70); y += r.range(-26, 18); d += `L${n1(x)} ${n1(y)}`; for (let k = 0; k < 5; k++) out += blossom(x + r.range(-34, 34), y + r.range(-30, 30), r.range(0.8, 1.7)); } return `<path d="${d}" fill="none" stroke="#4a2f2a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` + out; };
  branches = branch(-20, 30, 1) + branch(1220, 70, -1);
  for (let i = 0; i < 40; i++) petals += `<path d="M0 0C4-6 10-4 9 2C7 8 0 6 0 0z" fill="#ffc4d8" opacity="${n2(r.range(0.6, 1))}" class="pt" style="transform:translate(${n1(r() * W)}px,-20px) scale(${n2(r.range(0.8, 1.6))});animation-duration:${n1(r.range(7, 14))}s;animation-delay:${n1(-r() * 14)}s;--dx:${r.int(-120, 140)}px"/>`;
  return svg(W, H, {
    defs: lg('sky', [[0, '#ffe5ee'], [0.6, '#fff1f4'], [1, '#e8f1ff']]) + rg('sun', [[0, '#fff', 0.9], [1, '#fff', 0]]) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="640" cy="90" r="150" fill="url(#sun)"/><circle cx="640" cy="90" r="46" fill="#ffd9c7" opacity=".8"/>`
      + `<path d="M0 ${H}V230Q200 190 420 232T860 226T1200 214V${H}z" fill="#c9a6c2" opacity=".6"/><path d="M0 ${H}V258Q300 226 600 262T1200 246V${H}z" fill="#8f6f93" opacity=".7"/>`
      + branches + petals + grain(W, H),
    style: '.pt{animation-name:pt;animation-timing-function:linear;animation-iteration-count:infinite}@keyframes pt{to{translate:var(--dx) 340px;rotate:540deg}}',
  });
}

/** Matrix: columns of green code falling and fading. */
export function matrix() {
  const r = rng('matrix');
  const glyphs = '01ABCDEF7391ｱｲｳｴｵｶｷｸｹｺ+=#$%*:'.split('');
  let cols = '';
  for (let c = 0; c < 56; c++) {
    const x = c * 22 + 6, n = r.int(9, 18), dur = n1(r.range(4, 11));
    let t = '';
    for (let k = 0; k < n; k++) t += `<text x="${x}" y="${k * 18}" fill="${k === n - 1 ? '#e8ffe8' : '#22ff66'}" opacity="${n2(Math.max(0.12, (k + 1) / n))}" font-family="ui-monospace, Menlo, monospace" font-size="16">${glyphs[Math.floor(r() * glyphs.length)]}</text>`;
    cols += `<g class="mc" style="animation-duration:${dur}s;animation-delay:${n1(-r() * dur)}s">${t}</g>`;
  }
  return svg(W, H, {
    defs: lg('bg', [[0, '#010a04'], [1, '#03150a']]) + rg('v', [[0, '#000', 0], [1, '#000', 0.7]], [0.5, 0.5, 0.75]),
    body: `<rect width="${W}" height="${H}" fill="url(#bg)"/>${cols}<rect width="${W}" height="${H}" fill="url(#v)"/>`,
    style: '.mc{animation-name:mc;animation-timing-function:linear;animation-iteration-count:infinite}@keyframes mc{from{transform:translateY(-300px)}to{transform:translateY(320px)}}',
  });
}

/** Pixel city: an 8-bit skyline, moon and drifting clouds in crisp blocks. */
export function pixelcity() {
  const r = rng('pixel');
  const P = 8;
  let sky = '', bld = '';
  for (let y = 0; y < H / P; y++) sky += `<rect y="${y * P}" width="${W}" height="${P}" fill="${['#1b1048', '#241258', '#2f1766', '#3d1c74', '#522283', '#6d2a8e', '#8f3592', '#b94397', '#e0559b'][Math.min(8, Math.floor((y / (H / P)) * 9))]}"/>`;
  let x = 0;
  while (x < W) { const bw = P * r.int(4, 8), bh = P * r.int(6, 20); const c = ['#10082a', '#170c3a', '#0c0620'][r.int(0, 2)]; bld += `<rect x="${x}" y="${H - bh}" width="${bw}" height="${bh}" fill="${c}"/>`; for (let wy = H - bh + P; wy < H - P; wy += P * 2) for (let wx = x + P; wx < x + bw - P; wx += P * 2) if (r() < 0.45) bld += `<rect x="${wx}" y="${wy}" width="${P}" height="${P}" fill="${r.pick(['#ffd23f', '#ff6ec7', '#7df9ff'])}" opacity=".9"${r() < 0.1 ? ` class="wf" style="animation-delay:${n1(r() * 4)}s"` : ''}/>`; x += bw + P * r.int(0, 1); }
  const cloud = (cx, cy, s) => `<g transform="translate(${cx} ${cy}) scale(${s})" fill="#ffe0f0" opacity=".75"><rect x="0" y="8" width="56" height="8"/><rect x="8" y="0" width="24" height="8"/><rect x="24" y="16" width="40" height="8"/></g>`;
  return svg(W, H, {
    body: `<g shape-rendering="crispEdges">${sky}${stars(r, 40, W, 130, { maxY: 130, min: 1.6, max: 2.2, twinkle: 0.4 }).replace(/<circle/g, '<rect').replace(/ r="([\d.]+)"/g, (m, v) => ` width="${Math.round(v * 2)}" height="${Math.round(v * 2)}"`)}`
      + `<circle cx="1000" cy="76" r="40" fill="#fff6d6"/><circle cx="1014" cy="68" r="34" fill="#e8d9b0" opacity=".35"/><g class="cl">${cloud(100, 70, 2)}${cloud(500, 40, 1.6)}${cloud(860, 110, 2.2)}</g>${bld}</g>`,
    style: TWINKLE_CSS + FLICKER_CSS + '.cl{animation:cl 40s linear infinite}@keyframes cl{to{transform:translateX(-320px)}}',
  });
}

/** Summit: layered peaks at dawn with snow caps, a flag on the top and mist rolling through. */
export function summit() {
  const r = rng('summit');
  const peak = (cx, top, w, base, fill, cap) => `<path d="M${cx - w} ${base}L${cx - w * 0.25} ${top + 40}L${cx} ${top}L${cx + w * 0.3} ${top + 36}L${cx + w} ${base}z" fill="${fill}"/>` + (cap ? `<path d="M${cx - w * 0.28} ${top + 38}L${cx} ${top}L${cx + w * 0.32} ${top + 34}L${cx + w * 0.16} ${top + 44}L${cx + w * 0.02} ${top + 32}L${cx - w * 0.12} ${top + 46}z" fill="#f4f8ff"/>` : '');
  return svg(W, H, {
    defs: lg('sky', [[0, '#2a3c7a'], [0.5, '#e87d86'], [1, '#ffd9a0']]) + rg('sun', [[0, '#fff3c4'], [1, '#ffd38a', 0]]) + blurDef('m', 8) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#sky)"/>${stars(r, 40, W, 80, { maxY: 80, twinkle: 0.3 })}<circle cx="300" cy="170" r="140" fill="url(#sun)"/><circle cx="300" cy="172" r="30" fill="#fff6d6"/>`
      + peak(980, 36, 260, H, '#5a5f9a', true) + peak(640, 70, 230, H, '#46497f', true) + peak(1160, 96, 200, H, '#3a3d6c', false)
      + `<path d="M980 36V8L1000 14L980 20" fill="#ef4444" stroke="#7f1d1d"/><path d="M980 36V8" stroke="#3b2a24" stroke-width="2"/>`
      + `<g filter="url(#m)" opacity=".6"><ellipse class="ms" cx="300" cy="238" rx="360" ry="26" fill="#ffe9e2"/><ellipse class="ms2" cx="900" cy="256" rx="400" ry="30" fill="#ffe9e2"/></g>`
      + peak(240, 120, 320, H, '#2a2c52', false) + peak(60, 150, 220, H, '#1f2040', false) + `<path d="M0 ${H}V262Q300 238 600 266T1200 252V${H}z" fill="#14152e"/>` + grain(W, H),
    style: TWINKLE_CSS + '.ms{animation:ms 16s ease-in-out infinite alternate}.ms2{animation:ms 20s ease-in-out infinite alternate-reverse}@keyframes ms{from{transform:translateX(-100px)}to{transform:translateX(100px)}}',
  });
}

/** Scoreboard: an old-school amber bulb board reading 17 : 0 with a flashing "FINAL". */
export function scoreboard() {
  const digits = { '1': ['010', '110', '010', '010', '010', '010', '111'], '7': ['111', '001', '001', '010', '010', '010', '010'], '0': ['111', '101', '101', '101', '101', '101', '111'], ':': ['0', '1', '0', '0', '0', '1', '0'] };
  const bulb = (x, y, on) => `<circle cx="${x}" cy="${y}" r="5.4" fill="${on ? '#ffb020' : '#2a1c05'}" ${on ? 'filter="url(#glow)"' : ''}/>${on ? `<circle cx="${x}" cy="${y}" r="2.2" fill="#fff3b0"/>` : ''}`;
  let out = '';
  const drawChar = (ch, ox, oy) => { const g = digits[ch]; g.forEach((row, ry) => [...row].forEach((c, rx) => { out += bulb(ox + rx * 15, oy + ry * 15, c === '1'); })); };
  drawChar('1', 410, 70); drawChar('7', 470, 70); drawChar(':', 548, 70); drawChar('0', 620, 70);
  const label = (t, x, y) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="22" letter-spacing="6" fill="#ffb020" opacity=".9">${t}</text>`;
  return svg(W, H, {
    defs: lg('frame', [[0, '#3a3f4a'], [1, '#14161b']]) + `<filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>` + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="#0b0b0e"/><rect x="170" y="20" width="860" height="260" rx="10" fill="url(#frame)"/><rect x="186" y="36" width="828" height="228" rx="6" fill="#0a0806"/>`
      + out + label('HOME', 300, 62) + label('AWAY', 900, 62)
      + `<g class="fn"><text x="600" y="250" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="28" letter-spacing="10" fill="#ff5a3d">FINAL</text></g>`
      + [...Array(28)].map((_, i) => `<circle cx="${190 + i * 30.5}" cy="28" r="2.4" fill="#ffb020" class="bl" style="animation-delay:${(i % 2) * 0.5}s"/>`).join('')
      + `<rect width="${W}" height="${H}" fill="none"/>` + grain(W, H),
    style: '.fn{animation:fn 1.2s steps(1) infinite}@keyframes fn{0%,60%{opacity:1}61%,100%{opacity:.15}}.bl{animation:fn 1s steps(1) infinite}',
  });
}

/** Hologram: iridescent foil with a diffraction sweep and a faint grid. */
export function hologram() {
  return svg(W, H, {
    defs: lg('base', [[0, '#22d3ee'], [0.22, '#818cf8'], [0.45, '#e879f9'], [0.68, '#fbbf24'], [1, '#34d399']], [0, 0, 1, 1]) + lg('pr', [[0, '#ff0080', 0.5], [0.33, '#ffee00', 0.4], [0.66, '#00e5ff', 0.5], [1, '#7a00ff', 0.5]], [0, 0, 1, 0]) + lg('sw', [[0, '#fff', 0], [0.5, '#fff', 0.8], [1, '#fff', 0]], [0, 0, 1, 0])
      + `<filter id="f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.01 0.02" numOctaves="2" seed="5"/><feColorMatrix type="hueRotate" values="0"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .8 -.1"/></filter>` + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#base)"/><g opacity=".55">${[...Array(12)].map((_, i) => `<path d="M${i * 110 - 40} ${H}L${i * 110 + 150} 0" stroke="url(#pr)" stroke-width="46" opacity="${i % 2 ? 0.8 : 0.4}"/>`).join('')}</g><rect width="${W}" height="${H}" filter="url(#f)" opacity=".35"/>`
      + [...Array(20)].map((_, i) => `<path d="M0 ${i * 16}H${W}" stroke="#fff" stroke-width="1" opacity=".18"/>`).join('') + [...Array(40)].map((_, i) => `<path d="M${i * 32} 0V${H}" stroke="#fff" stroke-width="1" opacity=".14"/>`).join('')
      + `<rect class="sw" x="-400" width="360" height="${H}" fill="url(#sw)" transform="skewX(-25)"/><rect class="sw2" x="-400" width="160" height="${H}" fill="url(#sw)" transform="skewX(-25)" opacity=".7"/>` + grain(W, H),
    style: '.sw{animation:sw 5s ease-in-out infinite}.sw2{animation:sw 5s ease-in-out infinite .35s}@keyframes sw{0%{transform:translateX(0) skewX(-25deg)}100%{transform:translateX(2000px) skewX(-25deg)}}',
  });
}
