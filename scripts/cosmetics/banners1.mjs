import { rng, svg, lg, rg, grainDef, grain, blurDef, stars, TWINKLE_CSS, bokeh, crowd, shade, mix, skyline, FLICKER_CSS, hex, star, sparkle, n1, n2, wave } from './lib.mjs';

const W = 1200, H = 300;

/** Gridiron: striped turf in perspective, yard lines, hash marks, a goal post and the last light of the evening. */
export function field() {
  const r = rng('field');
  let stripes = '', lines = '', hashes = '';
  const horizon = 96;
  // Perspective stripes: wedges that widen toward the viewer.
  for (let i = -8; i < 24; i++) {
    const x0 = (i / 16) * 1500 - 150, x1 = x0 + 95;
    const bx0 = 600 + (x0 - 600) * 2.6, bx1 = 600 + (x1 - 600) * 2.6;
    stripes += `<path d="M${n1(x0)} ${horizon}L${n1(x1)} ${horizon}L${n1(bx1)} ${H}L${n1(bx0)} ${H}z" fill="${i % 2 ? '#2f8a3a' : '#2a7d34'}"/>`;
  }
  // Yard lines run across; spacing grows toward the viewer.
  for (let k = 0; k < 9; k++) {
    const t = Math.pow(k / 8, 1.8), y = horizon + t * (H - horizon), sw = 1 + t * 5;
    lines += `<rect x="0" y="${n1(y)}" width="${W}" height="${n1(sw)}" fill="#fff" opacity="${n2(0.55 + t * 0.4)}"/>`;
    for (const hx of [0.38, 0.62]) hashes += `<rect x="${n1(W * hx)}" y="${n1(y + sw + 1 + t * 5)}" width="${n1(2 + t * 4)}" height="${n1(6 + t * 16)}" fill="#fff" opacity="${n2(0.6 + t * 0.3)}"/>`;
  }
  let blades = '';
  for (let i = 0; i < 260; i++) { const y = horizon + 6 + Math.pow(r(), 0.7) * (H - horizon - 6), t = (y - horizon) / (H - horizon); blades += `<rect x="${n1(r() * W)}" y="${n1(y)}" width="${n1(0.8 + t * 1.2)}" height="${n1(2 + t * 6)}" fill="#0d4a1a" opacity="${n2(0.15 + r() * 0.2)}"/>`; }
  const post = `<g transform="translate(980 ${horizon - 4})"><rect x="-1.5" y="-10" width="3" height="46" fill="#facc15"/><path d="M-34 -52V-10H34V-52" fill="none" stroke="#facc15" stroke-width="3" stroke-linejoin="round"/><rect x="-20" y="-52" width="2" height="44" fill="#facc15" opacity=".7" transform="translate(-14 0)"/></g>`;
  return svg(W, H, {
    defs: lg('sky', [[0, '#1b2a5a'], [0.55, '#e0763a'], [1, '#ffd08a']]) + lg('shade', [[0, '#000', 0.35], [0.5, '#000', 0], [1, '#000', 0.25]]) + rg('glow', [[0, '#ffe9b0', 0.85], [1, '#ffe9b0', 0]], [0.5, 0.5, 0.5]) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="#2a7d34"/><rect width="${W}" height="${horizon + 2}" fill="url(#sky)"/><ellipse cx="1000" cy="${horizon}" rx="280" ry="70" fill="url(#glow)"/>`
      + `<g fill="#0d1330" opacity=".9">${[...Array(18)].map((_, i) => `<rect x="${i * 70 - 10}" y="${horizon - 22 - (i % 3) * 8}" width="64" height="${24 + (i % 3) * 8}"/>`).join('')}</g>`
      + stripes + blades + lines + hashes + post
      + `<rect width="${W}" height="${H}" fill="url(#shade)"/>` + grain(W, H),
  });
}

/** Hardwood: glossy planks in perspective, the paint and a centre circle, a backboard on the right. */
export function court() {
  const r = rng('court');
  let planks = '';
  const horizon = 70;
  for (let i = -6; i < 28; i++) {
    const x0 = (i / 22) * 1700 - 250, x1 = x0 + 79;
    const bx0 = 600 + (x0 - 600) * 2.4, bx1 = 600 + (x1 - 600) * 2.4;
    const c = ['#c98a3e', '#d19445', '#be7f35', '#d89d4d'][Math.abs(i) % 4];
    planks += `<path d="M${n1(x0)} ${horizon}L${n1(x1)} ${horizon}L${n1(bx1)} ${H}L${n1(bx0)} ${H}z" fill="${c}"/>`;
  }
  let grainLines = '';
  for (let i = 0; i < 90; i++) { const x = r() * W, y = horizon + r() * (H - horizon); grainLines += `<path d="M${n1(x)} ${n1(y)}q${n1(r.range(10, 40))} ${n1(r.range(-2, 2))} ${n1(r.range(40, 120))} 0" stroke="#7c4a14" stroke-width="${n2(0.4 + r() * 0.7)}" fill="none" opacity="${n2(0.15 + r() * 0.2)}"/>`; }
  return svg(W, H, {
    defs: lg('wall', [[0, '#17110c'], [1, '#3a2a1c']]) + lg('gloss', [[0, '#fff', 0.34], [0.4, '#fff', 0], [1, '#000', 0.25]]) + rg('spot', [[0, '#fff3cf', 0.55], [1, '#fff3cf', 0]]) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="#c98a3e"/><rect width="${W}" height="${horizon + 2}" fill="url(#wall)"/>`
      + `<g opacity=".7">${crowd(r, W, 34, { rows: 3, size: 11, color: '#241a12', jitter: 4 })}</g>`
      + planks + grainLines
      // the paint, free-throw line and centre arc in perspective
      + `<path d="M470 ${horizon}L740 ${horizon}L860 ${H}L350 ${H}z" fill="#9e2b25" opacity=".9"/><path d="M470 ${horizon}L740 ${horizon}L860 ${H}L350 ${H}z" fill="none" stroke="#fff" stroke-width="3"/>`
      + `<ellipse cx="605" cy="${horizon + 74}" rx="92" ry="22" fill="none" stroke="#fff" stroke-width="3"/><path d="M180 ${horizon}Q600 ${horizon + 300} 1020 ${horizon}" fill="none" stroke="#fff" stroke-width="3" opacity=".9"/>`
      + `<g transform="translate(1100 20)"><rect x="-4" y="40" width="8" height="150" fill="#2b2b2f"/><rect x="-60" y="0" width="120" height="76" rx="3" fill="#e5e7eb" opacity=".92" stroke="#111" stroke-width="3"/><rect x="-22" y="30" width="44" height="30" fill="none" stroke="#d62828" stroke-width="3"/><path d="M-20 68H20" stroke="#ea580c" stroke-width="5"/><path d="M-20 70L-14 100M20 70L14 100M-8 70L-6 100M8 70L6 100" stroke="#fff" stroke-width="1.4"/></g>`
      + `<rect width="${W}" height="${H}" fill="url(#gloss)"/><ellipse cx="300" cy="${horizon + 20}" rx="360" ry="120" fill="url(#spot)"/>` + grain(W, H),
  });
}

/** Infield: grass stripes, the dirt arc, chalk lines and bases, evening light. */
export function diamond() {
  const r = rng('diamond');
  let mow = '';
  for (let i = 0; i < 16; i++) mow += `<rect x="${i * 80 - 40}" y="0" width="80" height="${H}" fill="${i % 2 ? '#2f8a3a' : '#2a7d34'}"/>`;
  let specks = '';
  for (let i = 0; i < 300; i++) specks += `<circle cx="${n1(r() * W)}" cy="${n1(r() * H)}" r="${n2(0.5 + r() * 1.2)}" fill="#7a4a22" opacity="${n2(0.1 + r() * 0.2)}"/>`;
  const base = (x, y, rot = 45) => `<rect x="-9" y="-9" width="18" height="18" fill="#fff" stroke="#d1d5db" stroke-width="1.5" transform="translate(${x} ${y}) rotate(${rot})"/>`;
  return svg(W, H, {
    defs: rg('dirt', [[0, '#d19a63'], [1, '#a8723f']], [0.5, 0.5, 0.6]) + rg('sun', [[0, '#ffd58a', 0.7], [1, '#ffd58a', 0]]) + lg('dusk', [[0, '#000', 0.4], [0.5, '#000', 0], [1, '#000', 0.3]], [0, 0, 1, 0]) + grainDef(),
    body: mow
      + `<path d="M150 ${H + 40}L600 -20L1050 ${H + 40}" fill="none" stroke="#fff" stroke-width="5" opacity=".9"/>`
      + `<ellipse cx="600" cy="${H + 30}" rx="520" ry="270" fill="url(#dirt)"/>`
      + `<ellipse cx="600" cy="${H + 30}" rx="520" ry="270" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/>` + specks
      + `<path d="M600 252L852 150L600 48L348 150z" fill="#2c7d35" stroke="#fff" stroke-width="3" opacity=".95"/>`
      + `<ellipse cx="600" cy="150" rx="22" ry="12" fill="#c1894f"/><rect x="590" y="147" width="20" height="5" fill="#fff"/>`
      + base(600, 252, 0) + base(852, 150) + base(600, 48) + base(348, 150)
      + `<ellipse cx="1090" cy="40" rx="320" ry="170" fill="url(#sun)"/><rect width="${W}" height="${H}" fill="url(#dusk)"/>` + grain(W, H),
  });
}

/** Night game: four light banks with beams, the glow of the crowd and a lit field. */
export function night() {
  const r = rng('night');
  let towers = '', beams = '';
  [[150, 70], [420, 56], [780, 56], [1050, 70]].forEach(([x, y], i) => {
    let lamps = '';
    for (let a = 0; a < 4; a++) for (let b = 0; b < 5; b++) lamps += `<circle cx="${n1(x - 26 + b * 13)}" cy="${n1(y - 22 + a * 11)}" r="4.2" fill="#fffbe6"/>`;
    towers += `<rect x="${x - 3}" y="${y + 20}" width="6" height="${H - y}" fill="#0a0e1c"/><rect x="${x - 34}" y="${y - 30}" width="68" height="52" rx="3" fill="#10162a"/>${lamps}<circle cx="${x}" cy="${y}" r="70" fill="url(#halo)"/>`;
    beams += `<path d="M${x - 30} ${y + 20}L${x - 260 + i * 10} ${H}L${x + 260 + i * 10} ${H}L${x + 30} ${y + 20}z" fill="url(#beam)"/>`;
  });
  return svg(W, H, {
    defs: lg('sky', [[0, '#050816'], [1, '#101b3d']]) + rg('halo', [[0, '#fff7cf', 0.8], [0.4, '#fff7cf', 0.18], [1, '#fff7cf', 0]]) + lg('beam', [[0, '#fff7cf', 0.28], [1, '#fff7cf', 0]]) + lg('turf', [[0, '#1d6f31'], [1, '#0f4a21']]) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#sky)"/>${stars(r, 90, W, 90, { maxY: 90, twinkle: 0.3 })}${bokeh(r, 14, W, H, ['#fff7cf', '#9ec1ff'], { y0: 120, y1: 230, minR: 10, maxR: 36, op: [0.05, 0.14] })}`
      + beams
      + `<g opacity=".95">${crowd(r, W, 196, { rows: 3, size: 12, color: '#0a0d18', jitter: 3 })}</g>`
      + `<rect y="246" width="${W}" height="54" fill="url(#turf)"/><path d="M0 252H${W}" stroke="#fff" stroke-width="2" opacity=".6"/>` + towers
      + `<g>${[...Array(26)].map(() => `<rect x="${n1(r() * W)}" y="${n1(180 + r() * 60)}" width="2" height="2" fill="#fff" class="tw" style="animation-delay:${n1(r() * 3)}s"/>`).join('')}</g>` + grain(W, H),
    style: TWINKLE_CSS,
  });
}

/** Golden hour: a low sun, layered ridges and a stadium rim, with light rays that drift. */
export function sunset() {
  const r = rng('sunset');
  let rays = '';
  for (let i = 0; i < 14; i++) { const a = -Math.PI + (i / 13) * Math.PI, x2 = 760 + Math.cos(a) * 900, y2 = 210 + Math.sin(a) * 900; rays += `<path d="M760 210L${n1(x2 - 30)} ${n1(y2)}L${n1(x2 + 30)} ${n1(y2)}z" fill="#ffe3a3" opacity="${n2(0.05 + r() * 0.07)}"/>`; }
  const ridge = (y, amp, c, seed) => { const rr = rng(seed); let d = `M0 ${H}L0 ${y}`; for (let x = 0; x <= W; x += 40) d += `L${x} ${n1(y - rr() * amp)}`; return `<path d="${d}L${W} ${H}z" fill="${c}"/>`; };
  return svg(W, H, {
    defs: lg('sky', [[0, '#3b2a6e'], [0.35, '#c4486c'], [0.65, '#f58a4a'], [1, '#ffd58a']]) + rg('sun', [[0, '#fff6d6'], [0.35, '#ffd56a'], [1, '#ffb040', 0]]) + blurDef('b', 6) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#sky)"/>${stars(r, 40, W, 90, { maxY: 90, twinkle: 0.2 })}<g class="ray">${rays}</g>`
      + `<circle cx="760" cy="214" r="140" fill="url(#sun)" opacity=".8"/><circle cx="760" cy="214" r="52" fill="#fff4cc"/>`
      + `<g fill="#2b1a3a" opacity=".5"><path d="M110 70q10-8 20 0q10-8 20 0" fill="none" stroke="#2b1a3a" stroke-width="2"/><path d="M180 100q8-6 16 0q8-6 16 0" fill="none" stroke="#2b1a3a" stroke-width="2"/><path d="M360 60q8-6 16 0q8-6 16 0" fill="none" stroke="#2b1a3a" stroke-width="2"/></g>`
      + ridge(200, 36, '#7a2f55', 'r1') + ridge(232, 30, '#4a1d45', 'r2')
      + `<path d="M700 ${H}V228Q760 196 820 228V${H}z" fill="#1b0f2b"/><g fill="#1b0f2b">${[...Array(10)].map((_, i) => `<rect x="${690 + i * 14}" y="${222 - (i % 2) * 4}" width="10" height="${H}" />`).join('')}</g>`
      + ridge(262, 18, '#1e0f2e', 'r3') + grain(W, H),
    style: TWINKLE_CSS + '.ray{transform-origin:760px 210px;animation:ray 18s ease-in-out infinite alternate}@keyframes ray{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}',
  });
}

/** Launch season: black and gold, a laurel and a big 17-0 in foil with a slow shine. */
export function launch() {
  const r = rng('launch');
  let lines = '';
  for (let i = -6; i < 30; i++) lines += `<path d="M${i * 46} ${H}L${i * 46 + 240} 0" stroke="#e8c547" stroke-width="${i % 4 === 0 ? 2.2 : 0.8}" opacity="${i % 4 === 0 ? 0.35 : 0.14}"/>`;
  const leaf = (x, y, a, s = 1) => `<path transform="translate(${x} ${y}) rotate(${a}) scale(${s})" d="M0 0C10-6 22-4 30 4C18 8 8 8 0 0z" fill="url(#gold)"/>`;
  let laurel = '';
  for (let i = 0; i < 9; i++) { const t = i / 8, a = 110 + t * 150; laurel += leaf(900 + Math.cos((a * Math.PI) / 180) * 120 - 14, 150 + Math.sin((a * Math.PI) / 180) * 120, a + 40, 1.1 - t * 0.3); laurel += leaf(1160 - (900 + Math.cos((a * Math.PI) / 180) * 120) + 940 - 1160 + 1160 - 14 - 0, 150 + Math.sin((a * Math.PI) / 180) * 120, 180 - a - 40, 1.1 - t * 0.3).replace('scale', 'scale'); }
  return svg(W, H, {
    defs: lg('bg', [[0, '#070707'], [1, '#1b1407']], [0, 0, 1, 1]) + lg('gold', [[0, '#fff1b0'], [0.4, '#e8c547'], [1, '#8a6400']], [0, 0, 1, 1]) + lg('shine', [[0, '#fff', 0], [0.5, '#fff', 0.55], [1, '#fff', 0]], [0, 0, 1, 0]) + `<clipPath id="txt"><text x="1010" y="196" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="150" font-weight="900">17-0</text></clipPath>` + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#bg)"/>${lines}`
      + `<text x="1010" y="196" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="150" font-weight="900" fill="url(#gold)">17-0</text>`
      + `<g clip-path="url(#txt)"><rect class="sh" x="-300" y="0" width="240" height="${H}" fill="url(#shine)" transform="skewX(-20)"/></g>`
      + `<rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="10" fill="none" stroke="url(#gold)" stroke-width="2.2" opacity=".9"/><rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="6" fill="none" stroke="#e8c547" stroke-width=".8" opacity=".5"/>`
      + stars(r, 36, W, H, { color: '#fde68a', twinkle: 0.5, max: 1.4 }) + grain(W, H),
    style: TWINKLE_CSS + '.sh{animation:sh 7s ease-in-out infinite}@keyframes sh{0%,55%{transform:translateX(0) skewX(-20deg)}100%{transform:translateX(1500px) skewX(-20deg)}}',
  });
}

/** Founder (owner): crimson and black with an embossed gold shield and slow rays. */
export function founder() {
  let rays = '';
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; rays += `<path d="M900 150L${n1(900 + Math.cos(a - 0.05) * 900)} ${n1(150 + Math.sin(a - 0.05) * 900)}L${n1(900 + Math.cos(a + 0.05) * 900)} ${n1(150 + Math.sin(a + 0.05) * 900)}z" fill="#e8c547" opacity="${i % 2 ? 0.07 : 0.03}"/>`; }
  return svg(W, H, {
    defs: lg('bg', [[0, '#0a0a0a'], [0.55, '#3b0a0a'], [1, '#0a0a0a']], [0, 0, 1, 0]) + lg('gold', [[0, '#fff1b0'], [0.45, '#e8c547'], [1, '#7a5700']], [0, 0, 1, 1]) + lg('rub', [[0, '#ef4444'], [1, '#7f1d1d']], [0, 0, 1, 1]) + rg('glow', [[0, '#e8c547', 0.5], [1, '#e8c547', 0]]) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#bg)"/><g class="rot">${rays}</g><circle cx="900" cy="150" r="170" fill="url(#glow)"/>`
      + `<g transform="translate(900 150)"><path d="M0-112L84-84V-6C84 52 44 92 0 112C-44 92-84 52-84-6V-84z" fill="url(#gold)" stroke="#fff1b0" stroke-width="2"/><path d="M0-96L70-72V-4C70 44 36 78 0 94C-36 78-70 44-70-4V-72z" fill="url(#rub)"/><path d="${star(0, -2, 46, 20)}" fill="url(#gold)"/><path d="M-30 -62H30L22 -50H-22z" fill="#fff1b0" opacity=".8"/></g>`
      + `<rect x="12" y="12" width="${W - 24}" height="${H - 24}" fill="none" stroke="url(#gold)" stroke-width="2"/><path d="M12 40V12H40M${W - 12} 40V12H${W - 40}M12 ${H - 40}V${H - 12}H40M${W - 12} ${H - 40}V${H - 12}H${W - 40}" stroke="#fff1b0" stroke-width="3" fill="none"/>` + grain(W, H),
    style: '.rot{transform-origin:900px 150px;animation:rot 60s linear infinite}@keyframes rot{to{transform:rotate(360deg)}}',
  });
}

/** End zone: painted stripes and a chevron field mark with a worn texture. */
export function endzone() {
  const r = rng('endzone');
  let stripes = '', scuffs = '';
  for (let i = -4; i < 20; i++) stripes += `<path d="M${i * 90} ${H}L${i * 90 + 150} 0H${i * 90 + 195}L${i * 90 + 45} ${H}z" fill="${i % 2 ? '#fff' : '#1a2f7a'}" opacity="${i % 2 ? 0.92 : 1}"/>`;
  for (let i = 0; i < 180; i++) scuffs += `<path d="M${n1(r() * W)} ${n1(r() * H)}l${n1(r.range(4, 22))} ${n1(r.range(-3, 3))}" stroke="${r() < 0.5 ? '#0b1640' : '#2d4bb0'}" stroke-width="${n2(0.5 + r() * 1.2)}" opacity="${n2(0.1 + r() * 0.25)}"/>`;
  return svg(W, H, {
    defs: lg('base', [[0, '#16276a'], [1, '#233b94']]) + lg('lite', [[0, '#fff', 0.25], [0.5, '#fff', 0], [1, '#000', 0.25]]) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#base)"/>${stripes}${scuffs}`
      + `<rect x="0" y="0" width="${W}" height="14" fill="#fff"/><rect x="0" y="${H - 14}" width="${W}" height="14" fill="#fff"/><rect x="0" y="22" width="${W}" height="3" fill="#facc15"/>`
      + `<rect width="${W}" height="${H}" fill="url(#lite)"/>` + grain(W, H),
  });
}

/** Snow game: a grey-blue sky, floodlight halos and snow that falls in three layers. */
export function snow() {
  const r = rng('snow');
  const layer = (n, size, speed, op) => { let o = ''; for (let i = 0; i < n; i++) o += `<circle cx="${n1(r() * W)}" cy="${n1(-10 - r() * H)}" r="${n2(size * (0.6 + r() * 0.8))}" fill="#fff" opacity="${n2(op * (0.6 + r() * 0.4))}" class="f" style="animation-duration:${n2(speed * (0.8 + r() * 0.5))}s;animation-delay:${n1(-r() * speed)}s"/>`; return o; };
  return svg(W, H, {
    defs: lg('sky', [[0, '#3e4c66'], [1, '#aeb9cd']]) + rg('halo', [[0, '#fffbe8', 0.9], [1, '#fffbe8', 0]]) + blurDef('b', 1.4) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#sky)"/>`
      + [160, 520, 880].map((x) => `<circle cx="${x}" cy="46" r="120" fill="url(#halo)"/><circle cx="${x}" cy="46" r="9" fill="#fff"/>`).join('')
      + `<g opacity=".7">${crowd(r, W, 150, { rows: 2, size: 11, color: '#33405a' })}</g>`
      + `<rect y="198" width="${W}" height="102" fill="#e8eef7"/><path d="M0 198H${W}" stroke="#fff" stroke-width="3"/><path d="M0 238H${W}M0 276H${W}" stroke="#c4d0e2" stroke-width="2"/><path d="M200 198L120 ${H}M600 198V${H}M1000 198L1080 ${H}" stroke="#cbd6e8" stroke-width="3"/>`
      + `<g filter="url(#b)">${layer(60, 2.2, 7, 0.55)}</g>${layer(90, 1.6, 9, 0.8)}${layer(70, 3, 5.5, 0.95)}` + grain(W, H),
    style: '.f{animation-name:fall;animation-timing-function:linear;animation-iteration-count:infinite}@keyframes fall{from{transform:translate(0,0)}to{transform:translate(-40px,420px)}}',
  });
}

/** Playbook: chalk plays on a slate board in a wooden frame. */
export function playbook() {
  const r = rng('playbook');
  const X = (x, y) => `<path d="M${x - 9} ${y - 9}L${x + 9} ${y + 9}M${x + 9} ${y - 9}L${x - 9} ${y + 9}" stroke="#f5f5f4" stroke-width="3.2" stroke-linecap="round"/>`;
  const O = (x, y) => `<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#fde68a" stroke-width="3.2"/>`;
  const route = (d) => `<path d="${d}" fill="none" stroke="#fde68a" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 0" class="ch"/>`;
  const arrow = (x, y, a) => `<path d="M-9 -7L0 0L-9 7" transform="translate(${x} ${y}) rotate(${a})" fill="none" stroke="#fde68a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  let dust = '';
  for (let i = 0; i < 90; i++) dust += `<circle cx="${n1(r() * W)}" cy="${n1(r() * H)}" r="${n2(0.6 + r() * 2)}" fill="#fff" opacity="${n2(0.03 + r() * 0.06)}"/>`;
  return svg(W, H, {
    defs: lg('slate', [[0, '#25382f'], [1, '#1a2923']]) + lg('wood', [[0, '#8b5a2b'], [1, '#5e3a18']]) + grainDef('g2', 0.2, 0.5),
    body: `<rect width="${W}" height="${H}" fill="url(#slate)"/>${dust}<rect width="${W}" height="${H}" filter="url(#g2)"/>`
      + `<path d="M40 150H1160" stroke="#f5f5f4" stroke-width="2" opacity=".35" stroke-dasharray="8 10"/>`
      + [0, 1, 2, 3, 4].map((i) => X(620 + i * 34, 196)).join('') + [0, 1, 2, 3, 4].map((i) => O(620 + i * 34, 112)).join('')
      + route('M700 196C700 150 760 120 840 120') + arrow(842, 120, 0) + route('M654 196C640 150 600 130 540 130') + arrow(538, 130, 180) + route('M620 196V60') + arrow(620, 58, -90)
      + route('M760 196C800 196 860 196 940 150C980 126 1040 120 1090 90') + arrow(1092, 89, -30)
      + X(240, 100) + X(300, 100) + O(270, 200) + route('M270 192C270 160 300 140 340 140') + arrow(342, 140, 0)
      + `<rect width="${W}" height="${H}" fill="none" stroke="url(#wood)" stroke-width="22"/><rect x="11" y="11" width="${W - 22}" height="${H - 22}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="2"/>`
      + `<rect x="${W / 2 - 160}" y="${H - 22}" width="320" height="10" fill="#6b4423"/>`,
    style: '.ch{stroke-dasharray:600;stroke-dashoffset:600;animation:draw 6s ease-out infinite}@keyframes draw{0%{stroke-dashoffset:600}40%,100%{stroke-dashoffset:0}}',
  });
}

/** Jumbotron: an LED dot grid with colour bars sweeping across it. */
export function jumbotron() {
  return svg(W, H, {
    defs: `<pattern id="dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="3.2" fill="#fff"/></pattern><mask id="m"><rect width="${W}" height="${H}" fill="url(#dots)"/></mask>`
      + lg('a', [[0, '#ff3d5a'], [1, '#ffb703']], [0, 0, 1, 0]) + lg('b', [[0, '#00c2ff'], [1, '#7a5cff']], [0, 0, 1, 0]) + lg('c', [[0, '#00e676'], [1, '#00bcd4']], [0, 0, 1, 0]),
    body: `<rect width="${W}" height="${H}" fill="#06070d"/><g mask="url(#m)"><rect width="${W}" height="${H}" fill="#12142a"/>`
      + `<g class="s1"><rect x="-500" y="30" width="500" height="46" fill="url(#a)"/><rect x="-500" y="120" width="500" height="26" fill="url(#c)"/></g>`
      + `<g class="s2"><rect x="-700" y="76" width="700" height="38" fill="url(#b)"/><rect x="-700" y="186" width="700" height="52" fill="url(#a)"/></g>`
      + `<g class="s3"><rect x="-420" y="152" width="420" height="30" fill="url(#c)"/><rect x="-420" y="250" width="420" height="30" fill="url(#b)"/></g></g>`
      + `<rect width="${W}" height="${H}" fill="none" stroke="#1d2036" stroke-width="12"/>`,
    style: '.s1{animation:sw 9s linear infinite}.s2{animation:sw 13s linear infinite -4s}.s3{animation:sw 7s linear infinite -2s}@keyframes sw{to{transform:translateX(2000px)}}',
  });
}

/** Throwback: 80s warm-up stripes on a sunset gradient with grain. */
export function retro() {
  const r = rng('retro');
  const bars = [['#f59e0b', 0], ['#ea580c', 1], ['#db2777', 2], ['#7c3aed', 3], ['#2563eb', 4]];
  let stripes = '';
  bars.forEach(([c, i]) => { stripes += `<path d="M-100 ${H - 40 - i * 30}L${W + 100} ${-60 - i * 30}" stroke="${c}" stroke-width="22" fill="none"/>`; });
  return svg(W, H, {
    defs: lg('bg', [[0, '#1e1b4b'], [1, '#4c1d95']]) + lg('shine', [[0, '#fff', 0], [0.5, '#fff', 0.2], [1, '#fff', 0]], [0, 0, 1, 0]) + grainDef('g', 0.07, 0.7),
    body: `<rect width="${W}" height="${H}" fill="url(#bg)"/>${stars(r, 40, W, H, { twinkle: 0.4, max: 1.2 })}<g transform="translate(0 60)">${stripes}</g><g transform="translate(0 130)" opacity=".85">${stripes}</g>`
      + `<rect class="sh" x="-300" width="200" height="${H}" fill="url(#shine)" transform="skewX(-18)"/>` + grain(W, H, 'g'),
    style: TWINKLE_CSS + '.sh{animation:sh 8s ease-in-out infinite}@keyframes sh{0%,40%{transform:translateX(0) skewX(-18deg)}100%{transform:translateX(1600px) skewX(-18deg)}}',
  });
}

/** Hall: black marble with gold veins (ridged noise) and an engraved double border. */
export function marble() {
  return svg(W, H, {
    defs: `<filter id="mar" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.005 0.012" numOctaves="4" seed="4" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.55  0 0 0 0 0.6  0 0 0 1.4 -0.45"/></filter>`
      + `<filter id="vein" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.0035 0.008" numOctaves="5" seed="11"/><feColorMatrix type="matrix" values="0 0 0 0 0.93  0 0 0 0 0.77  0 0 0 0 0.3  5 0 0 0 -2"/><feComponentTransfer><feFuncA type="table" tableValues="0 0 0 0 0 0 0 .1 .4 .85 1 .85 .4 .1 0 0 0 0 0 0 0"/></feComponentTransfer><feGaussianBlur stdDeviation="0.45"/></filter>`
      + `<filter id="vein2" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.014" numOctaves="4" seed="23"/><feColorMatrix type="matrix" values="0 0 0 0 0.85  0 0 0 0 0.85  0 0 0 0 0.9  5 0 0 0 -2"/><feComponentTransfer><feFuncA type="table" tableValues="0 0 0 0 0 0 0 0 0 0 .3 .8 1 .8 .3 0 0 0 0 0 0"/></feComponentTransfer><feGaussianBlur stdDeviation="0.5"/></filter>`
      + lg('gold', [[0, '#fff1b0'], [0.5, '#e8c547'], [1, '#7a5700']], [0, 0, 1, 1]) + lg('sh', [[0, '#fff', 0], [0.5, '#fff', 0.22], [1, '#fff', 0]], [0, 0, 1, 0]),
    body: `<rect width="${W}" height="${H}" fill="#0c0c0e"/><rect width="${W}" height="${H}" filter="url(#mar)" opacity=".55"/><rect width="${W}" height="${H}" filter="url(#vein2)" opacity=".35"/><rect width="${W}" height="${H}" filter="url(#vein)" opacity=".85"/>`
      + `<rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="url(#gold)" stroke-width="5"/><rect x="28" y="28" width="${W - 56}" height="${H - 56}" fill="none" stroke="#e8c547" stroke-width="1.2" opacity=".7"/>`
      + [[14, 14], [W - 14, 14], [14, H - 14], [W - 14, H - 14]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="url(#gold)"/><circle cx="${x}" cy="${y}" r="3.4" fill="#7a1f1f"/>`).join('')
      + `<rect class="sh" x="-300" width="200" height="${H}" fill="url(#sh)" transform="skewX(-20)"/>`,
    style: '.sh{animation:sh 9s ease-in-out infinite}@keyframes sh{0%,50%{transform:translateX(0) skewX(-20deg)}100%{transform:translateX(1600px) skewX(-20deg)}}',
  });
}

/** Northern lights: stars, mountains and drifting aurora curtains with vertical rays. */
export function aurora() {
  const r = rng('aurora');
  const curtain = (id, y, amp, L, dur, delay, rays, col) => {
    let ry = '';
    for (let i = 0; i < rays; i++) { const x = (i / rays) * W * 1.1 - 30, h = r.range(90, 190); ry += `<rect x="${n1(x)}" y="${n1(y - 30 + amp * Math.sin(x / L * 6.28))}" width="${n1(r.range(2, 7))}" height="${n1(h)}" fill="url(#${id}r)" opacity="${n2(r.range(0.3, 0.9))}"/>`; }
    return `<g class="a" style="animation-duration:${dur}s;animation-delay:${delay}s"><path d="${wave(W, y, amp, L, 0, y + 130)}" fill="url(#${id})" opacity=".8"/>${ry}</g>`;
  };
  return svg(W, H, {
    defs: lg('sky', [[0, '#020817'], [1, '#0a2238']]) + lg('g1', [[0, '#34d399', 0], [0.3, '#34d399', 0.95], [1, '#34d399', 0]]) + lg('g1r', [[0, '#a7f3d0', 0], [0.4, '#6ee7b7', 1], [1, '#34d399', 0]])
      + lg('g2', [[0, '#38bdf8', 0], [0.3, '#38bdf8', 0.85], [1, '#38bdf8', 0]]) + lg('g2r', [[0, '#bae6fd', 0], [0.4, '#7dd3fc', 1], [1, '#38bdf8', 0]])
      + lg('g3', [[0, '#c084fc', 0], [0.3, '#c084fc', 0.8], [1, '#c084fc', 0]]) + lg('g3r', [[0, '#e9d5ff', 0], [0.4, '#d8b4fe', 1], [1, '#c084fc', 0]]) + blurDef('bl', 9) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#sky)"/>${stars(r, 120, W, 200, { maxY: 200, twinkle: 0.35 })}`
      + `<g filter="url(#bl)" style="mix-blend-mode:screen">${curtain('g3', 62, 22, 520, 20, -7, 40)}${curtain('g2', 92, 26, 460, 15, -3, 46)}${curtain('g1', 78, 30, 400, 11, 0, 52)}</g>`
      + `<path d="M0 ${H}V210L90 176L160 206L260 150L340 200L430 168L520 214L640 154L720 196L830 160L930 206L1040 170L1120 200L1200 176V${H}z" fill="#07101d"/><path d="M0 ${H}V248L120 226L240 250L400 220L560 252L720 228L900 254L1060 230L1200 250V${H}z" fill="#040a14"/>`
      + `<g opacity=".35"><path d="M0 252H${W}" stroke="#34d399" stroke-width="40" filter="url(#bl)"/></g>` + grain(W, H),
    style: TWINKLE_CSS + '.a{animation:dr 16s ease-in-out infinite alternate}@keyframes dr{from{transform:translateX(-80px) scaleY(.88)}to{transform:translateX(80px) scaleY(1.18)}}',
  });
}

/** Parade: confetti raining through a spotlit stadium. */
export function confetti() {
  const r = rng('confetti');
  const cols = ['#facc15', '#ef4444', '#fff', '#fb923c', '#38bdf8', '#a3e635'];
  let bits = '';
  for (let i = 0; i < 150; i++) { const c = r.pick(cols), w = r.range(6, 14), h = r.range(3.5, 7); bits += `<rect x="${n1(r() * W)}" y="-20" width="${n1(w)}" height="${n1(h)}" fill="${c}" class="c" style="animation-duration:${n1(r.range(4, 9))}s;animation-delay:${n1(-r() * 9)}s;--r:${r.int(180, 900)}deg;--dx:${r.int(-60, 60)}px"/>`; }
  return svg(W, H, {
    defs: lg('bg', [[0, '#1a0b2e'], [1, '#43194f']]) + lg('beam', [[0, '#fff3c4', 0.5], [1, '#fff3c4', 0]]) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#bg)"/>`
      + [200, 600, 1000].map((x, i) => `<path d="M${x} -10L${x - 170} ${H}L${x + 170} ${H}z" fill="url(#beam)" class="bm" style="animation-delay:${i * -1.4}s"/>`).join('')
      + `<g opacity=".8">${crowd(r, W, 236, { rows: 3, size: 13, color: '#12071f' })}</g>` + bits + grain(W, H),
    style: '.c{animation-name:cf;animation-timing-function:linear;animation-iteration-count:infinite;transform-box:fill-box;transform-origin:center}@keyframes cf{from{transform:translate(0,0) rotate(0)}to{transform:translate(var(--dx),340px) rotate(var(--r))}}.bm{animation:bm 5s ease-in-out infinite alternate}@keyframes bm{from{opacity:.55}to{opacity:1}}',
  });
}

/** Vault (owner): black steel, a gold lattice and ruby gems with a slow glint. */
export function vault() {
  let lat = '';
  for (let i = -3; i < 22; i++) lat += `<path d="M${i * 64} 0L${i * 64 + 300} ${H}M${i * 64 + 300} 0L${i * 64} ${H}" stroke="#e8c547" stroke-width="1.2" opacity=".26"/>`;
  const gem = (x, y, s) => `<g transform="translate(${x} ${y})"><path d="M0 ${-s}L${s} 0L0 ${s}L${-s} 0z" fill="url(#rub)" stroke="#fff1b0" stroke-width="1.6"/><path d="M0 ${-s}L${s * 0.35} ${-s * 0.2}L0 ${s * 0.1}L${-s * 0.35} ${-s * 0.2}z" fill="#fecaca" opacity=".8"/></g>`;
  return svg(W, H, {
    defs: lg('bg', [[0, '#050505'], [1, '#16110a']], [0, 0, 1, 1]) + lg('gold', [[0, '#fff1b0'], [0.5, '#e8c547'], [1, '#7a5700']], [0, 0, 1, 1]) + lg('rub', [[0, '#f87171'], [1, '#7f1d1d']], [0, 0, 1, 1]) + lg('sh', [[0, '#fff', 0], [0.5, '#fff', 0.35], [1, '#fff', 0]], [0, 0, 1, 0]) + grainDef(),
    body: `<rect width="${W}" height="${H}" fill="url(#bg)"/>${lat}`
      + `<rect x="10" y="10" width="${W - 20}" height="${H - 20}" fill="none" stroke="url(#gold)" stroke-width="3"/>`
      + [[120, 150, 20], [330, 70, 12], [330, 230, 12], [870, 70, 12], [870, 230, 12], [1080, 150, 20], [600, 36, 14], [600, 264, 14]].map(([x, y, s]) => gem(x, y, s)).join('')
      + `<circle cx="600" cy="150" r="96" fill="none" stroke="url(#gold)" stroke-width="2.4"/><circle cx="600" cy="150" r="76" fill="none" stroke="#e8c547" stroke-width="1" stroke-dasharray="3 7" class="spin"/>`
      + `<rect class="sh" x="-300" width="220" height="${H}" fill="url(#sh)" transform="skewX(-20)"/>` + grain(W, H),
    style: '.sh{animation:sh 8s ease-in-out infinite}@keyframes sh{0%,45%{transform:translateX(0) skewX(-20deg)}100%{transform:translateX(1600px) skewX(-20deg)}}.spin{transform-origin:600px 150px;animation:sp 40s linear infinite}@keyframes sp{to{transform:rotate(360deg)}}',
  });
}
