import { rng, svg, lg, rg, grainDef, grain, blurDef, stars, TWINKLE_CSS, bokeh, crowd, shade, mix, skyline, FLICKER_CSS, hex, star, sparkle, n1, n2, wave } from './lib.mjs';

const W = 1200, H = 300;

/** A teardrop flame path with base width w and height h at x (feet at y). */
function flame(r, x, y, w, h) {
  const lean = r.range(-w * 0.35, w * 0.35), tip = { x: x + lean, y: y - h };
  return `M${n1(x - w / 2)} ${n1(y)}C${n1(x - w * 0.6)} ${n1(y - h * 0.35)} ${n1(x - w * 0.15 + lean * 0.4)} ${n1(y - h * 0.55)} ${n1(tip.x)} ${n1(tip.y)}C${n1(x + w * 0.15 + lean * 0.4)} ${n1(y - h * 0.55)} ${n1(x + w * 0.6)} ${n1(y - h * 0.35)} ${n1(x + w / 2)} ${n1(y)}z`;
}

/** Inferno: a wall of layered, flickering flames with heat glow and rising embers. */
export function inferno() {
  const r = rng('inferno');
  const layer = (n, minH, maxH, minW, maxW, cls, fill, extra = '') => {
    let o = '';
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * (W + 100) - 50 + r.range(-20, 20); o += `<path d="${flame(r, x, H + 20, r.range(minW, maxW), r.range(minH, maxH))}" fill="${fill}" class="${cls}" style="animation-delay:${n1(-r() * 3)}s;animation-duration:${n1(r.range(0.9, 1.9))}s" ${extra}/>`; }
    return o;
  };
  let embers = '';
  for (let i = 0; i < 40; i++) embers += `<circle cx="${n1(r() * W)}" cy="${H}" r="${n2(r.range(1, 2.8))}" fill="${r.pick(['#fde047', '#fb923c', '#fff7ae'])}" class="em" style="animation-duration:${n1(r.range(2.5, 6))}s;animation-delay:${n1(-r() * 6)}s;--dx:${r.int(-50, 50)}px"/>`;
  return svg(W, H, {
    defs: lg('sky', [[0, '#090302'], [0.6, '#2a0a06'], [1, '#6b1a07']]) + lg('f1', [[0, '#7f1d1d'], [1, '#c2410c']]) + lg('f2', [[0, '#c2410c'], [0.6, '#f97316'], [1, '#fbbf24']]) + lg('f3', [[0, '#f59e0b'], [0.6, '#fde047'], [1, '#fffbe0']])
      + rg('heat', [[0, '#ff7a1a', 0.55], [1, '#ff7a1a', 0]], [0.5, 1, 0.8]) + `<filter id="b1" x="-10%" y="-20%" width="120%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="3" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="46"/><feGaussianBlur stdDeviation="5"/></filter><filter id="b2" x="-10%" y="-20%" width="120%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves="3" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="30"/><feGaussianBlur stdDeviation="1.6"/></filter><filter id="b3" x="-10%" y="-20%" width="120%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.03 0.05" numOctaves="2" seed="5" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="18"/></filter>` + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#sky)"/><ellipse cx="600" cy="${H}" rx="760" ry="230" fill="url(#heat)"/>`
      + `<g filter="url(#b1)">${layer(22, 140, 230, 90, 170, 'fl', 'url(#f1)')}</g><g filter="url(#b2)">${layer(26, 110, 190, 60, 120, 'fl', 'url(#f2)')}</g><g filter="url(#b3)">${layer(30, 70, 140, 40, 80, 'fl', 'url(#f3)')}</g>`
      + embers + grain(W, H),
    style: '.fl{transform-box:fill-box;transform-origin:50% 100%;animation-name:flk;animation-iteration-count:infinite;animation-timing-function:ease-in-out;animation-direction:alternate}@keyframes flk{0%{transform:scale(1,1) skewX(-2deg)}50%{transform:scale(.92,1.12) skewX(3deg)}100%{transform:scale(1.06,.9) skewX(-3deg)}}.em{animation-name:up;animation-iteration-count:infinite;animation-timing-function:ease-out}@keyframes up{0%{transform:translate(0,0);opacity:1}100%{transform:translate(var(--dx),-280px);opacity:0}}',
  });
}

/** Under the lights: the stands from inside the bowl, camera flashes and sweeping light beams. */
export function stadium() {
  const r = rng('stadium');
  const colors = ['#c8102e', '#f5f5f4', '#1f3a8a', '#facc15', '#16a34a', '#0f172a'];
  let seats = '';
  for (let row = 0; row < 11; row++) {
    const y = 150 + row * 11.5, sc = 1 + row * 0.05;
    for (let x = -10; x < W + 10; x += 7 * sc) {
      const sag = Math.pow((x - 600) / 600, 2) * 22; // the bowl curves toward the corners
      seats += `<rect x="${n1(x)}" y="${n1(y - sag * (1 - row / 14))}" width="${n1(5 * sc)}" height="${n1(6 * sc)}" rx="1.4" fill="${r() < 0.5 ? '#0b0e1a' : r.pick(colors)}" opacity="${n2(0.55 + r() * 0.35)}"/>`;
    }
  }
  let flashes = '';
  for (let i = 0; i < 46; i++) flashes += `<circle cx="${n1(r() * W)}" cy="${n1(150 + r() * 140)}" r="${n2(r.range(1.5, 3.2))}" fill="#fff" class="fl" style="animation-delay:${n1(r() * 5)}s;animation-duration:${n1(r.range(2, 5))}s"/>`;
  const tower = (x) => `<g><rect x="${x - 40}" y="22" width="80" height="34" rx="3" fill="#10162a"/>${[...Array(12)].map((_, i) => `<circle cx="${n1(x - 33 + (i % 6) * 13)}" cy="${n1(32 + Math.floor(i / 6) * 14)}" r="4.4" fill="#fffbe6"/>`).join('')}<circle cx="${x}" cy="40" r="90" fill="url(#halo)"/></g>`;
  return svg(W, H, {
    defs: lg('sky', [[0, '#04061a'], [1, '#141f45']]) + rg('halo', [[0, '#fff7cf', 0.75], [0.4, '#fff7cf', 0.16], [1, '#fff7cf', 0]]) + lg('beam', [[0, '#fff7cf', 0.35], [1, '#fff7cf', 0]]) + blurDef('bl', 3) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#sky)"/>${stars(r, 60, W, 90, { maxY: 90, twinkle: 0.3 })}`
      + `<g class="sw1"><path d="M240 40L-40 ${H}L520 ${H}z" fill="url(#beam)"/></g><g class="sw2"><path d="M960 40L680 ${H}L1240 ${H}z" fill="url(#beam)"/></g>`
      + `<rect y="130" width="${W}" height="170" fill="#090c18"/>` + seats + `<rect y="196" width="${W}" height="6" fill="#090c18"/><rect y="246" width="${W}" height="6" fill="#090c18"/>` + [150, 330, 520, 700, 880, 1060].map((x) => `<path d="M${x} 150L${x - 20} 300" stroke="#090c18" stroke-width="7"/>`).join('') + `<g filter="url(#bl)" opacity=".55"><rect y="270" width="${W}" height="30" fill="#2ba14a"/></g>`
      + tower(240) + tower(960) + flashes + grain(W, H),
    style: TWINKLE_CSS + '.fl{animation-name:fl;animation-iteration-count:infinite;animation-timing-function:steps(1)}@keyframes fl{0%,94%{opacity:0}95%{opacity:1}100%{opacity:0}}.sw1{transform-origin:240px 40px;animation:sw 9s ease-in-out infinite alternate}.sw2{transform-origin:960px 40px;animation:sw 11s ease-in-out infinite alternate-reverse}@keyframes sw{from{transform:rotate(-14deg)}to{transform:rotate(14deg)}}',
  });
}

/** Open water: dawn sky, a sun path on the water and five drifting wave layers. */
export function ocean() {
  const r = rng('ocean');
  const layer = (y, a, L, c, dur, op = 1) => `<g class="wv" style="animation-duration:${dur}s"><path d="${wave(W * 2, y, a, L, r() * 6, H + 20)}" fill="${c}" opacity="${op}"/></g>`;
  let glints = '';
  for (let i = 0; i < 60; i++) glints += `<rect x="${n1(780 + r.range(-90, 90) * (0.4 + (i / 60)))}" y="${n1(150 + (i / 60) * 120)}" width="${n1(r.range(6, 28))}" height="1.6" fill="#fff6d0" opacity="${n2(r.range(0.3, 0.9))}" class="tw" style="animation-delay:${n1(r() * 3)}s"/>`;
  return svg(W, H, {
    defs: lg('sky', [[0, '#1e3a8a'], [0.5, '#f472b6'], [0.8, '#fdba74'], [1, '#fde68a']]) + rg('sun', [[0, '#fff7d6'], [0.3, '#fde68a'], [1, '#fb923c', 0]]) + lg('sea', [[0, '#0e7490'], [1, '#082f49']]) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#sky)"/>${stars(r, 40, W, 70, { maxY: 70, twinkle: 0.3 })}<circle cx="800" cy="140" r="160" fill="url(#sun)" opacity=".85"/><circle cx="800" cy="144" r="34" fill="#fff4cc"/>`
      + `<rect y="146" width="${W}" height="${H - 146}" fill="url(#sea)"/>` + glints
      + layer(160, 5, 300, '#0e7490', 26, 0.9) + layer(188, 7, 260, '#0b5f7a', 20, 0.95) + layer(216, 9, 330, '#0a4c68', 16) + layer(246, 11, 280, '#073b55', 12) + layer(272, 13, 360, '#052e44', 9)
      + `<path d="M170 148l22-34 4 34z M178 148l-10-26 10 26z" fill="#10172a" opacity=".85"/><path d="M174 148H196" stroke="#10172a" stroke-width="3"/>` + grain(W, H),
    style: TWINKLE_CSS + '.wv{animation-name:dr;animation-timing-function:linear;animation-iteration-count:infinite}@keyframes dr{from{transform:translateX(0)}to{transform:translateX(-600px)}}',
  });
}

/** Skyline: a city at dusk, two layers of towers with windows that flicker, a moon and traffic below. */
export function city() {
  const r = rng('city');
  let cars = '';
  for (let i = 0; i < 14; i++) cars += `<rect x="-60" y="${n1(278 + (i % 2) * 8)}" width="${n1(r.range(30, 70))}" height="2.2" rx="1" fill="${i % 3 ? '#fde68a' : '#f87171'}" class="car" style="animation-duration:${n1(r.range(5, 12))}s;animation-delay:${n1(-r() * 12)}s${i % 3 ? '' : ';animation-direction:reverse'}"/>`;
  return svg(W, H, {
    defs: lg('sky', [[0, '#120a2e'], [0.5, '#5b2a6e'], [0.8, '#e0567a'], [1, '#ffb27a']]) + rg('moon', [[0, '#fff8e7'], [1, '#fff8e7', 0]]) + blurDef('bl', 6) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#sky)"/>${stars(r, 70, W, 130, { maxY: 130, twinkle: 0.4 })}<circle cx="980" cy="70" r="70" fill="url(#moon)" opacity=".7"/><circle cx="980" cy="70" r="26" fill="#fff8e7"/><circle cx="970" cy="64" r="5" fill="#e8dcc0" opacity=".6"/><circle cx="990" cy="80" r="7" fill="#e8dcc0" opacity=".5"/>`
      + `<g opacity=".8">${skyline(r, W, 270, { minH: 70, maxH: 180, minW: 30, maxW: 70, color: '#2a1a46', win: '#fcd9a0', winChance: 0.18, flicker: 0.05 })}</g>`
      + skyline(r, W, 290, { minH: 50, maxH: 150, minW: 24, maxW: 60, color: '#0a0818', win: '#fde68a', winChance: 0.33, flicker: 0.14 })
      + `<g filter="url(#bl)" opacity=".5"><rect y="276" width="${W}" height="24" fill="#ff7a59"/></g>` + cars + grain(W, H),
    style: TWINKLE_CSS + FLICKER_CSS + '.car{animation-name:dr;animation-timing-function:linear;animation-iteration-count:infinite}@keyframes dr{from{transform:translateX(0)}to{transform:translateX(1300px)}}',
  });
}

/** The Hive (gift): honeycomb with a glowing amber core and bees crossing. */
export function hive() {
  const r = rng('hive');
  let cells = '';
  const R = 26, dx = R * Math.sqrt(3), dy = R * 1.5;
  for (let row = -1; row < 12; row++) for (let col = -1; col < 24; col++) {
    const cx = col * dx + (row % 2 ? dx / 2 : 0), cy = row * dy, d = Math.hypot(cx - 600, cy - 150) / 700;
    cells += `<path d="${hex(cx, cy, R - 2)}" fill="${r() < 0.18 ? '#7c2d12' : `rgb(${Math.round(255 - d * 80)},${Math.round(176 - d * 70)},${Math.round(30 - d * 15)})`}" stroke="#7a3b05" stroke-width="2.2" opacity="${n2(0.85 + r() * 0.15)}"/>`;
  }
  const bee = (y, dur, delay, sc, rev) => `<g class="bee" style="animation-duration:${dur}s;animation-delay:${delay}s${rev ? ';animation-direction:reverse' : ''}"><g transform="translate(0 ${y}) scale(${sc})"><g class="bob"><ellipse cx="-4" cy="-9" rx="9" ry="5" fill="#e0f2fe" opacity=".75" class="wing"/><ellipse cx="6" cy="-9" rx="9" ry="5" fill="#e0f2fe" opacity=".75" class="wing"/><ellipse cx="0" cy="0" rx="14" ry="9" fill="#facc15" stroke="#111" stroke-width="1.6"/><path d="M-5-8V8M2-9V9M9-7V7" stroke="#111" stroke-width="3.4"/><circle cx="14" cy="-1" r="4" fill="#111"/></g></g></g>`;
  return svg(W, H, {
    defs: rg('core', [[0, '#fff1b0', 0.95], [0.5, '#f59e0b', 0.35], [1, '#f59e0b', 0]]) + lg('shade', [[0, '#000', 0.35], [0.5, '#000', 0], [1, '#000', 0.45]], [0, 0, 1, 0]) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="#7a3b05"/>${cells}<ellipse cx="600" cy="150" rx="520" ry="200" fill="url(#core)"/><rect width="${W}" height="${H}" fill="url(#shade)"/>`
      + bee(70, 11, 0, 1, false) + bee(190, 15, -6, 1.3, true) + bee(250, 9, -3, 0.8, false) + grain(W, H),
    style: '.bee{animation-name:fly;animation-timing-function:linear;animation-iteration-count:infinite}@keyframes fly{from{transform:translateX(-80px)}to{transform:translateX(1280px)}}.bob{animation:bob .9s ease-in-out infinite alternate}@keyframes bob{from{transform:translateY(-5px) rotate(-4deg)}to{transform:translateY(5px) rotate(4deg)}}.wing{animation:wg .09s linear infinite alternate;transform-box:fill-box;transform-origin:50% 100%}@keyframes wg{from{transform:scaleY(1)}to{transform:scaleY(.35)}}',
  });
}

/** Tunnel: the walk out, a concrete tunnel in perspective with fog and a bright field at the end. */
export function tunnel() {
  const r = rng('tunnel');
  let frames = '';
  for (let i = 0; i < 9; i++) { const t = i / 8, s = 1 - t * 0.9, w = 1180 * s, h = 300 * s; frames += `<rect x="${n1(600 - w / 2)}" y="${n1(150 - h / 2)}" width="${n1(w)}" height="${n1(h)}" fill="none" stroke="#2a2d3a" stroke-width="${n2(10 * s)}" opacity="${n2(0.9 - t * 0.4)}"/>`; }
  let rays = '';
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; rays += `<path d="M600 150L${n1(600 + Math.cos(a - 0.04) * 800)} ${n1(150 + Math.sin(a - 0.04) * 800)}L${n1(600 + Math.cos(a + 0.04) * 800)} ${n1(150 + Math.sin(a + 0.04) * 800)}z" fill="#fff" opacity="${n2(0.04 + r() * 0.05)}"/>`; }
  const fig = (x, s) => `<g transform="translate(${x} 188) scale(${s})" fill="#05060a"><circle cx="0" cy="-34" r="7"/><path d="M-11 -26Q0 -32 11 -26L13 4H-13z"/><path d="M-9 4H-3L-4 26H-10zM3 4H9L10 26H4z"/></g>`;
  return svg(W, H, {
    defs: rg('end', [[0, '#fff', 1], [0.3, '#fffbe6', 0.95], [1, '#a7e6ff', 0]], [0.5, 0.5, 0.5]) + lg('wall', [[0, '#0b0c12'], [1, '#1b1d28']]) + blurDef('f', 10) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#wall)"/>${frames}`
      + `<rect x="548" y="118" width="104" height="64" fill="#e8fbff"/><ellipse cx="600" cy="150" rx="150" ry="110" fill="url(#end)"/>${rays}`
      + fig(570, 0.8) + fig(600, 0.9) + fig(632, 0.8)
      + `<g filter="url(#f)" opacity=".45"><ellipse class="fog" cx="300" cy="230" rx="260" ry="40" fill="#cfe9ff"/><ellipse class="fog2" cx="900" cy="240" rx="280" ry="46" fill="#cfe9ff"/></g>`
      + `<rect y="260" width="${W}" height="40" fill="#07080d"/><path d="M0 262H${W}" stroke="#fff" stroke-opacity=".08" stroke-width="2"/>` + grain(W, H),
    style: '.fog{animation:fg 14s ease-in-out infinite alternate}.fog2{animation:fg 17s ease-in-out infinite alternate-reverse}@keyframes fg{from{transform:translateX(-80px)}to{transform:translateX(80px)}}',
  });
}

/** Pitch: a soccer pitch at dusk in perspective with a goal, floodlights and a ball. */
export function pitch() {
  const r = rng('pitch');
  const horizon = 90;
  let stripes = '';
  for (let i = -10; i < 26; i++) { const x0 = (i / 18) * 1500 - 150, x1 = x0 + 90; stripes += `<path d="M${n1(x0)} ${horizon}L${n1(x1)} ${horizon}L${n1(600 + (x1 - 600) * 2.8)} ${H}L${n1(600 + (x0 - 600) * 2.8)} ${H}z" fill="${i % 2 ? '#2f9b45' : '#278a3b'}"/>`; }
  let net = '';
  for (let i = 0; i <= 12; i++) net += `<path d="M${960 + i * 12} ${horizon - 40}L${966 + i * 11} ${horizon + 6}" stroke="#fff" stroke-width=".8" opacity=".6"/>`;
  for (let i = 0; i <= 6; i++) net += `<path d="M960 ${horizon - 40 + i * 8}H1104" stroke="#fff" stroke-width=".8" opacity=".6"/>`;
  return svg(W, H, {
    defs: lg('sky', [[0, '#16224d'], [0.6, '#d9647a'], [1, '#ffc58a']]) + rg('fl', [[0, '#fff7cf', 0.9], [1, '#fff7cf', 0]]) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="#278a3b"/><rect width="${W}" height="${horizon + 2}" fill="url(#sky)"/>${stars(r, 30, W, 70, { maxY: 70 })}`
      + `<g fill="#0c1230" opacity=".95">${[...Array(20)].map((_, i) => `<rect x="${i * 64 - 10}" y="${horizon - 18 - (i % 4) * 7}" width="60" height="${22 + (i % 4) * 7}"/>`).join('')}</g>`
      + [[140, 30], [1060, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="80" fill="url(#fl)"/><rect x="${x - 3}" y="${y}" width="6" height="${horizon - y}" fill="#0c1230"/><rect x="${x - 26}" y="${y - 10}" width="52" height="20" fill="#10162a"/>${[...Array(8)].map((_, i) => `<circle cx="${x - 20 + (i % 4) * 13}" cy="${y - 4 + Math.floor(i / 4) * 9}" r="3.4" fill="#fffbe6"/>`).join('')}`).join('')
      + stripes
      + `<path d="M60 ${H}L${600 - 700 * 0.35} ${horizon + 6}H${600 + 700 * 0.35}L1140 ${H}" fill="none" stroke="#fff" stroke-width="3" opacity=".85"/>`
      + `<ellipse cx="600" cy="${horizon + 112}" rx="170" ry="40" fill="none" stroke="#fff" stroke-width="3" opacity=".9"/><path d="M0 ${horizon + 74}H${W}" stroke="#fff" stroke-width="3" opacity=".9"/>`
      + `<g>${net}<path d="M960 ${horizon + 6}V${horizon - 40}H1104V${horizon + 6}" fill="none" stroke="#fff" stroke-width="4"/></g>`
      + `<g transform="translate(330 232)"><ellipse cx="0" cy="14" rx="16" ry="4" fill="#000" opacity=".3"/><circle r="15" fill="#fff" stroke="#222" stroke-width="1.6"/><path d="M0 -6L6 -2L4 5H-4L-6 -2z" fill="#222"/><path d="M0 -6V-15M6 -2L14 -5M4 5L9 12M-4 5L-9 12M-6 -2L-14 -5" stroke="#222" stroke-width="1.4"/></g>`
      + grain(W, H),
  });
}

/** Rink: ice with faceoff circles, a blue line and red centre line, skate marks and boards. */
export function rink() {
  const r = rng('rink');
  let scratches = '';
  for (let i = 0; i < 90; i++) { const x = r() * W, y = 70 + r() * 230; scratches += `<path d="M${n1(x)} ${n1(y)}q${n1(r.range(30, 160))} ${n1(r.range(-24, 24))} ${n1(r.range(80, 300))} ${n1(r.range(-10, 10))}" fill="none" stroke="#fff" stroke-width="${n2(0.5 + r() * 1)}" opacity="${n2(0.1 + r() * 0.3)}"/>`; }
  let ads = '';
  for (let i = 0; i < 9; i++) ads += `<rect x="${i * 140 + 8}" y="38" width="124" height="22" rx="2" fill="${['#c8102e', '#1f3a8a', '#0f172a', '#facc15'][i % 4]}" opacity=".85"/>`;
  return svg(W, H, {
    defs: lg('ice', [[0, '#e4f4ff'], [1, '#a9d4f0']]) + lg('glass', [[0, '#fff', 0.5], [1, '#fff', 0]]) + rg('spot', [[0, '#fff', 0.8], [1, '#fff', 0]]) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#ice)"/>${scratches}`
      + `<rect width="${W}" height="68" fill="#e9eef5"/>${ads}<rect y="62" width="${W}" height="8" fill="#ffffff"/><rect y="68" width="${W}" height="6" fill="#0f172a" opacity=".25"/>`
      + `<rect x="190" y="70" width="14" height="230" fill="#1d4ed8" opacity=".85"/><rect x="996" y="70" width="14" height="230" fill="#1d4ed8" opacity=".85"/><rect x="593" y="70" width="14" height="230" fill="#dc2626" opacity=".9"/><path d="M600 70V300" stroke="#fff" stroke-width="2" stroke-dasharray="6 6"/>`
      + [[600, 190, 68], [330, 190, 56], [870, 190, 56]].map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="none" stroke="#dc2626" stroke-width="3.4" opacity=".85"/><circle cx="${x}" cy="${y}" r="9" fill="#dc2626" opacity=".85"/>`).join('')
      + `<circle cx="600" cy="190" r="68" fill="none" stroke="#1d4ed8" stroke-width="2" opacity="0"/><ellipse cx="260" cy="120" rx="360" ry="140" fill="url(#spot)" opacity=".5"/><rect width="${W}" height="${H}" fill="url(#glass)" opacity=".22"/>`
      + `<g transform="translate(980 250) rotate(-12)"><ellipse cx="0" cy="8" rx="20" ry="5" fill="#000" opacity=".2"/><rect x="-18" y="-6" width="36" height="14" rx="6" fill="#111"/><rect x="-18" y="-6" width="36" height="5" rx="3" fill="#3a3a44"/></g>` + grain(W, H),
  });
}

/** Ballpark: a diamond-lit evening stand with light towers and fireworks. */
export function ballpark() {
  const r = rng('ballpark');
  const burst = (x, y, c, delay, rad) => { let o = ''; for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; o += `<circle cx="${x}" cy="${y}" r="2.2" fill="${c}" class="fw" style="--tx:${n1(Math.cos(a) * rad)}px;--ty:${n1(Math.sin(a) * rad)}px;animation-delay:${delay}s"/>`; } return o; };
  return svg(W, H, {
    defs: lg('sky', [[0, '#070a1e'], [1, '#1b2a5c']]) + lg('turf', [[0, '#1e7a34'], [1, '#115526']]) + rg('halo', [[0, '#fff7cf', 0.8], [1, '#fff7cf', 0]]) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#sky)"/>${stars(r, 60, W, 110, { maxY: 110, twinkle: 0.3 })}`
      + burst(300, 80, '#f87171', 0, 70) + burst(620, 60, '#facc15', 1.4, 90) + burst(930, 90, '#60a5fa', 2.6, 70)
      + `<path d="M0 214Q600 150 1200 214V300H0z" fill="#0b1024"/><g opacity=".9">${crowd(r, W, 196, { rows: 4, size: 10, color: '#0a0e1e', jitter: 3 })}</g>`
      + `<rect y="246" width="${W}" height="54" fill="url(#turf)"/><path d="M0 250Q600 232 1200 250" stroke="#d9a066" stroke-width="10" fill="none" opacity=".8"/>`
      + [[110, 120], [1090, 120]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="90" fill="url(#halo)"/><rect x="${x - 3}" y="${y}" width="6" height="140" fill="#080b1a"/><rect x="${x - 32}" y="${y - 26}" width="64" height="40" rx="3" fill="#10162a"/>${[...Array(10)].map((_, i) => `<circle cx="${x - 24 + (i % 5) * 12}" cy="${y - 16 + Math.floor(i / 5) * 14}" r="4" fill="#fffbe6"/>`).join('')}`).join('')
      + `<rect x="540" y="60" width="120" height="56" rx="4" fill="#0e1428" stroke="#2a3a6b" stroke-width="2"/><text x="600" y="98" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-size="30" fill="#fbbf24">17 : 0</text>` + grain(W, H),
    style: TWINKLE_CSS + '.fw{transform-box:fill-box;animation:fw 4s ease-out infinite;opacity:0}@keyframes fw{0%{transform:translate(0,0);opacity:1}60%{opacity:1}100%{transform:translate(var(--tx),var(--ty));opacity:0}}',
  });
}
