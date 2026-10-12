import { C, fx, orbit, glint, rngFor, lg, rg, n1, n2, star, sparkle } from './fxlib.mjs';

export function halo() {
  const r = rngFor('halo');
  let sp = '';
  for (let i = 0; i < 6; i++) { const x = 100 + r.range(-38, 38), y = 26 + r.range(-12, 8); sp += `<g transform="translate(${n1(x)} ${n1(y)})" class="tw" style="animation-delay:${n1(-r() * 2)}s">${glint(r.range(2.4, 4.4), '#fff7c2')}</g>`; }
  return fx(`<g class="hb"><ellipse cx="100" cy="26" rx="34" ry="9" fill="none" stroke="#f59e0b" stroke-width="9" opacity=".35" filter="url(#bl)"/><ellipse cx="100" cy="26" rx="32" ry="8.5" fill="none" stroke="url(#hg)" stroke-width="5.2"/><ellipse cx="100" cy="24.6" rx="30" ry="7" fill="none" stroke="#fffbe0" stroke-width="1.6" opacity=".9"/>${sp}</g>`, {
    defs: lg('hg', [[0, '#fde68a'], [0.5, '#f59e0b'], [1, '#fcd34d']], [0, 0, 1, 0]),
    style: '.hb{animation:hb 3s ease-in-out infinite}@keyframes hb{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',
  });
}

function bolt(r, a, r0, r1, kinks = 5) {
  let d = '', ang = a;
  for (let i = 0; i <= kinks; i++) {
    const t = i / kinks, rad = r0 + (r1 - r0) * t, off = i === 0 || i === kinks ? 0 : r.range(-9, 9) * (Math.PI / 180) * 3;
    d += `${i ? 'L' : 'M'}${n1(C + Math.cos(ang + off) * rad)} ${n1(C + Math.sin(ang + off) * rad)}`;
  }
  return d;
}
export function lightning() {
  const r = rngFor('lightning');
  let o = '';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + r() * 0.4, d = bolt(r, a, 96, 56, 6), delay = n1(i * 0.4 + r() * 0.2);
    o += `<g class="lb" style="animation-delay:${delay}s"><path d="${d}" fill="none" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".55" filter="url(#bl)"/><path d="${d}" fill="none" stroke="#2563eb" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#f0fbff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  return fx(`<circle class="lf" cx="100" cy="100" r="54" fill="none" stroke="#7dd3fc" stroke-width="3" filter="url(#gl)"/>` + o, {
    style: '.lb{animation:lb 3.3s steps(1) infinite;opacity:0}@keyframes lb{0%{opacity:0}2%{opacity:1}5%{opacity:.2}7%{opacity:1}12%{opacity:0}100%{opacity:0}}.lf{animation:lf 3.3s steps(1) infinite;opacity:0}@keyframes lf{0%,100%{opacity:0}2%{opacity:.9}10%{opacity:0}}',
  });
}

/** Flame tongues around the avatar; the back layer is the fire, the front a few sparks and a rim of light. */
function flameShape(x, y, ang, w, h, r) {
  // A teardrop standing at (x, y), pointing along ang (radians), with a wavy tip.
  const ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux, lean = r.range(-0.25, 0.25) * w;
  const P = (t, s) => `${n1(x + ux * t + px * s)} ${n1(y + uy * t + py * s)}`;
  return `M${P(0, -w / 2)}C${P(h * 0.3, -w * 0.62)} ${P(h * 0.55, -w * 0.2 + lean)} ${P(h, lean)}C${P(h * 0.55, w * 0.2 + lean)} ${P(h * 0.3, w * 0.62)} ${P(0, w / 2)}z`;
}
function flames(r, { from, to, n, rad, minH, maxH, minW, maxW }) {
  const layer = (scale, fill, filter) => {
    let o = '';
    for (let i = 0; i < n; i++) {
      const th = from + ((to - from) * i) / (n - 1) + r.range(-0.05, 0.05), x = C + Math.cos(th) * rad, y = C + Math.sin(th) * rad;
      // Point mostly up, leaning outward.
      const vx = Math.cos(th) * 0.55, vy = Math.sin(th) * 0.55 - 0.9, ang = Math.atan2(vy, vx), h = r.range(minH, maxH) * scale, w = r.range(minW, maxW) * scale;
      o += `<path class="fl" d="${flameShape(x, y, ang, w, h, r)}" fill="${fill}" style="animation-delay:${n1(-r() * 2)}s;animation-duration:${n1(r.range(0.7, 1.5))}s"/>`;
    }
    return `<g${filter ? ` filter="url(#${filter})"` : ''}>${o}</g>`;
  };
  return layer(1.3, 'url(#f1)', 'wob1') + layer(1, 'url(#f2)', 'wob2') + layer(0.62, 'url(#f3)', 'wob3');
}
const FIRE_DEFS = lg('f1', [[0, '#b91c1c'], [1, '#ea580c']], [0, 1, 0, 0]) + lg('f2', [[0, '#ea580c'], [0.7, '#fb923c'], [1, '#fde047']], [0, 1, 0, 0]) + lg('f3', [[0, '#f59e0b'], [0.6, '#fde047'], [1, '#fffbe0']], [0, 1, 0, 0])
  + `<filter id="wob1" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16"/><feGaussianBlur stdDeviation="2.4"/></filter>`
  + `<filter id="wob2" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="6" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="11"/><feGaussianBlur stdDeviation="0.9"/></filter>`
  + `<filter id="wob3" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7"/></filter>`;
const FIRE_CSS = '.fl{transform-box:fill-box;transform-origin:50% 100%;animation-name:flk;animation-iteration-count:infinite;animation-timing-function:ease-in-out;animation-direction:alternate}@keyframes flk{0%{transform:scale(1,1) skewX(-3deg)}50%{transform:scale(.9,1.14) skewX(4deg)}100%{transform:scale(1.07,.9) skewX(-4deg)}}.em{animation-name:em;animation-timing-function:ease-out;animation-iteration-count:infinite}@keyframes em{from{transform:translate(var(--x),var(--y));opacity:1}to{transform:translate(calc(var(--x) + var(--dx)),calc(var(--y) - 70px));opacity:0}}';
function sparksUp(r, n) {
  let o = '';
  for (let i = 0; i < n; i++) { const a = r.range(0.2, Math.PI - 0.2), x = C + Math.cos(a) * r.range(40, 70), y = C + Math.sin(a) * 40 + 10, dur = r.range(1.4, 3); o += `<circle class="em" r="${n2(r.range(0.9, 1.9))}" fill="${r.pick(['#fde047', '#fb923c', '#fff3b0'])}" style="--x:${n1(x)}px;--y:${n1(y)}px;--dx:${r.int(-20, 20)}px;animation-duration:${n1(dur)}s;animation-delay:${n1(-r() * dur)}s"/>`; }
  return o;
}
export function flamesFx() {
  const r = rngFor('flames');
  const back = fx(`<ellipse cx="100" cy="132" rx="70" ry="42" fill="#ff7a1a" opacity=".28" filter="url(#bl)"/>` + flames(r, { from: -0.35, to: Math.PI + 0.35, n: 16, rad: 46, minH: 36, maxH: 62, minW: 14, maxW: 24 }), { defs: FIRE_DEFS, style: FIRE_CSS });
  const front = fx(sparksUp(r, 14), { style: FIRE_CSS });
  return { '': front, '-back': back };
}
export function ringfireFx() {
  const r = rngFor('ringfire');
  const back = fx(flames(r, { from: 0, to: Math.PI * 2, n: 22, rad: 47, minH: 20, maxH: 36, minW: 9, maxW: 15 }), { defs: FIRE_DEFS, style: FIRE_CSS });
  return { '': fx(sparksUp(r, 8), { style: FIRE_CSS }), '-back': back };
}

export function gyro() {
  const ring = (rx, ry, rot, color, dur, delay) => `<g transform="rotate(${rot} 100 100)"><g class="gy" style="animation-duration:${dur}s;animation-delay:${-delay}s"><ellipse cx="100" cy="100" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="1.8" opacity=".85" filter="url(#gl)"/><g class="rn" style="animation-duration:${dur * 0.6}s"><circle cx="100" cy="${100 - ry}" r="4.4" fill="${color}" filter="url(#gl2)"/><circle cx="100" cy="${100 - ry}" r="1.8" fill="#fff"/></g></g></g>`;
  return fx(ring(78, 78, 0, '#22d3ee', 6, 0) + ring(86, 30, 62, '#a78bfa', 8, 2) + ring(86, 30, -62, '#fbbf24', 10, 4), {
    style: '.gy{transform-box:view-box;transform-origin:100px 100px;animation:gy linear infinite}@keyframes gy{0%{transform:rotateX(0deg) rotateZ(0)}100%{transform:rotateX(0deg) rotateZ(360deg)}}.rn{transform-origin:100px 100px;animation:orb linear infinite}',
  });
}

export function shockwave() {
  const ring = (delay, c) => `<circle class="sw" cx="100" cy="100" r="50" fill="none" stroke="${c}" stroke-width="4" style="animation-delay:${delay}s" filter="url(#gl)"/>`;
  let ticks = '';
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; ticks += `<path class="tk" d="M${n1(C + Math.cos(a) * 54)} ${n1(C + Math.sin(a) * 54)}L${n1(C + Math.cos(a) * 62)} ${n1(C + Math.sin(a) * 62)}" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" style="animation-delay:${n1((i % 3) * 0.3)}s"/>`; }
  return fx(ring(0, '#38bdf8') + ring(0.9, '#818cf8') + ring(1.8, '#22d3ee') + ticks, {
    style: '.sw{transform-box:view-box;transform-origin:100px 100px;animation:sw 2.7s ease-out infinite;opacity:0}@keyframes sw{0%{transform:scale(1);opacity:.95;stroke-width:5}100%{transform:scale(1.9);opacity:0;stroke-width:.6}}.tk{animation:tk 2.7s ease-out infinite;opacity:0;transform-box:view-box;transform-origin:100px 100px}@keyframes tk{0%{opacity:1;transform:scale(1)}60%{opacity:0;transform:scale(1.25)}100%{opacity:0}}',
  });
}

export function electric() {
  const r = rngFor('electric');
  let o = '';
  for (let k = 0; k < 9; k++) {
    const a0 = (k / 9) * Math.PI * 2 + r() * 0.2, span = r.range(0.35, 0.7);
    let d = '';
    for (let i = 0; i <= 9; i++) { const a = a0 + (i / 9) * span, rad = 57 + (i === 0 || i === 9 ? 0 : r.range(-5, 7)); d += `${i ? 'L' : 'M'}${n1(C + Math.cos(a) * rad)} ${n1(C + Math.sin(a) * rad)}`; }
    o += `<g class="ea" style="animation-delay:${n1(r() * 1.4)}s;animation-duration:${n1(r.range(0.7, 1.5))}s"><path d="${d}" fill="none" stroke="#38bdf8" stroke-width="7" opacity=".5" filter="url(#bl)" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#2563eb" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#e8fbff" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  return fx(`<circle cx="100" cy="100" r="54" fill="none" stroke="#60a5fa" stroke-width="1.6" opacity=".6" class="ep"/>` + o, { style: '.ea{animation-name:ea;animation-iteration-count:infinite;animation-timing-function:steps(1)}@keyframes ea{0%{opacity:0}10%{opacity:1}30%{opacity:.25}45%{opacity:1}70%{opacity:0}100%{opacity:0}}.ep{animation:ep .5s ease-in-out infinite alternate}@keyframes ep{from{opacity:.25}to{opacity:.8}}' });
}

function auraFx(key, colors) {
  const r = rngFor(key);
  const [c1, c2, c3] = colors;
  let wisps = '';
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, x = C + Math.cos(a) * 50, y = C + Math.sin(a) * 50, h = r.range(24, 44); wisps += `<path class="fl" d="M${n1(x - 6)} ${n1(y)}Q${n1(x - 2)} ${n1(y - h * 0.6)} ${n1(x + r.range(-4, 4))} ${n1(y - h)}Q${n1(x + 3)} ${n1(y - h * 0.5)} ${n1(x + 6)} ${n1(y)}z" fill="${r.pick([c1, c2])}" opacity=".6" transform="rotate(${n1((a * 180) / Math.PI + 90)} ${n1(x)} ${n1(y)})" style="animation-delay:${n1(-r() * 2)}s;animation-duration:${n1(r.range(1.4, 2.4))}s"/>`; }
  let motes = '';
  for (let i = 0; i < 16; i++) { const a = r() * Math.PI * 2, x = C + Math.cos(a) * r.range(52, 74), y = C + Math.sin(a) * r.range(52, 74), dur = r.range(2, 4); motes += `<circle class="em" r="${n2(r.range(1, 2.2))}" fill="${c3}" filter="url(#gl)" style="--x:${n1(x)}px;--y:${n1(y)}px;--dx:${r.int(-10, 10)}px;animation-duration:${n1(dur)}s;animation-delay:${n1(-r() * dur)}s"/>`; }
  const back = fx(`<circle class="ap" cx="100" cy="100" r="74" fill="url(#ag)"/><g filter="url(#bl)">${wisps}</g>`, {
    defs: rg('ag', [[0.55, c1, 0.55], [0.8, c2, 0.22], [1, c2, 0]]),
    style: FIRE_CSS.replace('translate(calc(var(--x) + var(--dx)),calc(var(--y) - 70px))', 'translate(calc(var(--x) + var(--dx)),calc(var(--y) - 40px))') + '.ap{animation:ap 2.6s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center}@keyframes ap{from{transform:scale(.94);opacity:.8}to{transform:scale(1.06);opacity:1}}',
  });
  return { '': fx(motes, { style: FIRE_CSS }), '-back': back };
}
export const auraGold = () => auraFx('aura-gold', ['#facc15', '#f59e0b', '#fff3b0']);
export const auraBlue = () => auraFx('aura-blue', ['#38bdf8', '#2563eb', '#e0f7ff']);
export const auraViolet = () => auraFx('aura-violet', ['#c084fc', '#7c3aed', '#f3e8ff']);

export function glitch() {
  const r = rngFor('glitch');
  let o = '';
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, rad = r.range(55, 82), w = r.range(8, 30), h = r.range(2, 6);
    o += `<rect class="gl" x="${n1(C + Math.cos(a) * rad - w / 2)}" y="${n1(C + Math.sin(a) * rad - h / 2)}" width="${n1(w)}" height="${n1(h)}" fill="${r.pick(['#22d3ee', '#f0abfc', '#fff', '#f43f5e'])}" style="animation-delay:${n1(r() * 2.4)}s;animation-duration:${n1(r.range(1.2, 2.6))}s"/>`;
  }
  return fx(`<g class="gj"><circle cx="97" cy="100" r="52" fill="none" stroke="#22d3ee" stroke-width="1.8" opacity=".7"/><circle cx="103" cy="100" r="52" fill="none" stroke="#f43f5e" stroke-width="1.8" opacity=".7"/></g>` + o, {
    style: '.gl{animation-name:gl;animation-iteration-count:infinite;animation-timing-function:steps(1);opacity:0}@keyframes gl{0%{opacity:0}8%{opacity:1;transform:translateX(6px)}12%{opacity:0}30%{opacity:1;transform:translateX(-8px)}34%{opacity:0}64%{opacity:1;transform:translateX(4px)}70%{opacity:0}100%{opacity:0}}.gj{animation:gj 1.8s steps(1) infinite}@keyframes gj{0%,70%{transform:translate(0,0)}72%{transform:translate(-3px,1px)}76%{transform:translate(4px,-1px)}80%,100%{transform:translate(0,0)}}',
  });
}

function wing(side, r) {
  // Feather fans from the shoulder at the avatar's side. side: -1 left, 1 right.
  const root = { x: C + side * 46, y: C + 8 };
  const rows = [{ n: 9, a0: -118, a1: -8, L: 74, W: 13, fill: 'url(#wg1)', op: 1 }, { n: 8, a0: -100, a1: 4, L: 56, W: 12, fill: 'url(#wg2)', op: 1 }, { n: 6, a0: -80, a1: 14, L: 38, W: 10, fill: 'url(#wg3)', op: 1 }];
  let o = '';
  rows.forEach((row, ri) => {
    for (let i = 0; i < row.n; i++) {
      const t = i / (row.n - 1), deg = row.a0 + (row.a1 - row.a0) * t, ang = (deg * Math.PI) / 180, flip = side === 1 ? ang : Math.PI - ang;
      const L = row.L * (1 - 0.32 * t) * (1 + (ri === 0 ? 0 : 0)), w = row.W;
      const ux = Math.cos(flip), uy = Math.sin(flip), px = -uy, py = ux;
      const P = (tt, s) => `${n1(root.x + ux * tt + px * s)} ${n1(root.y + uy * tt + py * s)}`;
      o += `<path d="M${P(0, -2)}C${P(L * 0.3, -w * 0.9)} ${P(L * 0.8, -w * 0.7)} ${P(L, 0)}C${P(L * 0.8, w * 0.7)} ${P(L * 0.3, w * 0.9)} ${P(0, 2)}z" fill="${row.fill}" stroke="#b6c3d6" stroke-width=".7"/><path d="M${P(2, 0)}L${P(L * 0.92, 0)}" stroke="#cbd5e1" stroke-width=".6" opacity=".8"/>`;
    }
  });
  return `<g class="wf${side === 1 ? 'r' : 'l'}" style="transform-origin:${root.x}px ${root.y}px">${o}</g>`;
}
export function wingsFx() {
  const r = rngFor('wings');
  const back = fx(`<g filter="url(#sd)">${wing(-1, r)}${wing(1, r)}</g>`, {
    defs: lg('wg1', [[0, '#ffffff'], [1, '#e2e8f0']], [0, 0, 1, 1]) + lg('wg2', [[0, '#fffdf2'], [1, '#fde9a8']], [0, 0, 1, 1]) + lg('wg3', [[0, '#fff'], [1, '#fde68a']], [0, 0, 1, 1])
      + `<filter id="sd" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.6" flood-color="#475569" flood-opacity=".35"/></filter>`,
    style: '.wfl{animation:wl 3.2s ease-in-out infinite}.wfr{animation:wr 3.2s ease-in-out infinite}@keyframes wl{0%,100%{transform:rotate(0)}50%{transform:rotate(-7deg)}}@keyframes wr{0%,100%{transform:rotate(0)}50%{transform:rotate(7deg)}}',
  });
  let sp = '';
  for (let i = 0; i < 8; i++) sp += `<g transform="translate(${n1(100 + r.range(-84, 84))} ${n1(40 + r.range(0, 90))})" class="tw" style="animation-delay:${n1(-r() * 2)}s">${glint(r.range(2, 3.6), '#fff8d0')}</g>`;
  return { '': fx(sp), '-back': back };
}
