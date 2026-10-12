import { C, fx, orbit, heart, glint, rngFor, lg, rg, n1, n2, star, sparkle } from './fxlib.mjs';

const fall = (name, from, to, dur, extra = '') => `.${name}{animation:${name} ${dur}s linear infinite;${extra}}@keyframes ${name}{from{transform:${from};opacity:0}10%{opacity:1}90%{opacity:1}to{transform:${to};opacity:0}}`;

export function snow() {
  const r = rngFor('snow');
  let o = '';
  for (let i = 0; i < 34; i++) {
    const x = r.range(8, 192), s = r.range(1.4, 4.2), dur = r.range(5, 11), dx = r.range(-16, 16), flake = s > 2.8;
    const arms = `M0-${n1(s * 1.6)}V${n1(s * 1.6)}M-${n1(s * 1.4)}-${n1(s * 0.8)}L${n1(s * 1.4)} ${n1(s * 0.8)}M-${n1(s * 1.4)} ${n1(s * 0.8)}L${n1(s * 1.4)}-${n1(s * 0.8)}`;
    const shape = flake ? `<path d="${arms}" stroke="#3b82f6" stroke-opacity=".55" stroke-width="2.6" stroke-linecap="round"/><path d="${arms}" stroke="#fff" stroke-width="1.1" stroke-linecap="round"/>` : `<circle r="${n2(s * 0.75)}" fill="#fff" stroke="#60a5fa" stroke-width=".8"/>`;
    o += `<g class="sf" style="--x:${n1(x)}px;--dx:${n1(dx)}px;animation-duration:${n1(dur)}s;animation-delay:${n1(-r() * dur)}s"><g opacity="${n2(r.range(0.8, 1))}">${shape}</g></g>`;
  }
  return fx(o, { style: '.sf{animation-name:sf;animation-timing-function:linear;animation-iteration-count:infinite}@keyframes sf{from{transform:translate(var(--x),-10px) rotate(0);opacity:0}8%{opacity:1}92%{opacity:1}to{transform:translate(calc(var(--x) + var(--dx)),212px) rotate(200deg);opacity:0}}' });
}

export function confetti() {
  const r = rngFor('confetti');
  const cols = ['#E8C547', '#DC2626', '#a855f7', '#F97316', '#0ea5e9', '#84cc16', '#ec4899'];
  let o = '';
  for (let i = 0; i < 40; i++) {
    const x = r.range(6, 194), w = r.range(3.6, 6.6), h = r.range(2.2, 3.8), dur = r.range(3, 7);
    o += `<rect class="cf" x="${-w / 2}" y="${-h / 2}" width="${n1(w)}" height="${n1(h)}" fill="${r.pick(cols)}" style="--x:${n1(x)}px;--dx:${r.int(-22, 22)}px;--r:${r.int(300, 900)}deg;animation-duration:${n1(dur)}s;animation-delay:${n1(-r() * dur)}s"/>`;
  }
  return fx(o, { style: '.cf{animation-name:cf;animation-timing-function:linear;animation-iteration-count:infinite;transform-box:fill-box;transform-origin:center}@keyframes cf{from{transform:translate(var(--x),-10px) rotate(0);opacity:0}8%{opacity:1}90%{opacity:1}to{transform:translate(calc(var(--x) + var(--dx)),212px) rotate(var(--r));opacity:0}}' });
}

export function embers() {
  const r = rngFor('embers');
  let o = '';
  for (let i = 0; i < 28; i++) {
    const x = r.range(30, 170), s = r.range(1, 3), dur = r.range(2.4, 5);
    o += `<g class="em" style="--x:${n1(x)}px;--dx:${r.int(-26, 26)}px;animation-duration:${n1(dur)}s;animation-delay:${n1(-r() * dur)}s"><circle r="${n2(s * 2.6)}" fill="#f97316" opacity=".4" filter="url(#bl)"/><circle r="${n2(s * 1.15)}" fill="${r.pick(['#ea580c', '#f97316', '#dc2626', '#f59e0b'])}"/><circle r="${n2(s * 0.5)}" fill="#fff3b0"/></g>`;
  }
  return fx(o, { style: '.em{animation-name:em;animation-timing-function:ease-out;animation-iteration-count:infinite}@keyframes em{from{transform:translate(var(--x),196px);opacity:0}12%{opacity:1}to{transform:translate(calc(var(--x) + var(--dx)),20px);opacity:0}}' });
}

export function fireflies() {
  const r = rngFor('fireflies');
  let o = '';
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, rad = r.range(56, 88), x = C + Math.cos(a) * rad, y = C + Math.sin(a) * rad, dur = r.range(3, 6);
    o += `<g transform="translate(${n1(x)} ${n1(y)})"><g class="ff" style="--dx:${r.int(-14, 14)}px;--dy:${r.int(-14, 14)}px;animation-duration:${n1(dur)}s;animation-delay:${n1(-r() * dur)}s"><circle r="6.5" fill="#a3e635" opacity=".45" filter="url(#bl)"/><circle r="2.1" fill="#fefce8" stroke="#65a30d" stroke-width=".7"/><circle r="3.2" fill="#84cc16" opacity=".75" class="pu" style="animation-delay:${n1(-r() * 3)}s"/></g></g>`;
  }
  return fx(o, { style: '.ff{animation:ff ease-in-out infinite alternate}@keyframes ff{from{transform:translate(0,0)}to{transform:translate(var(--dx),var(--dy))}}.pu{animation:pu 1.6s ease-in-out infinite alternate}@keyframes pu{from{opacity:.1}to{opacity:.9}}' });
}

export function sakuraFx() {
  const r = rngFor('sakurafx');
  let o = '';
  for (let i = 0; i < 22; i++) {
    const x = r.range(6, 194), s = r.range(0.9, 1.6), dur = r.range(5, 10);
    o += `<g class="pt" style="--x:${n1(x)}px;--dx:${r.int(-40, 40)}px;--r:${r.int(240, 720)}deg;animation-duration:${n1(dur)}s;animation-delay:${n1(-r() * dur)}s"><path transform="scale(${n2(s)})" d="M0 0C2.5-5 8-4 7 1.5C6 6 .5 5 0 0z" fill="${r.pick(['#ffc4d8', '#ffb0cc', '#ffd9e6'])}" stroke="#f08ab0" stroke-width=".4"/></g>`;
  }
  return fx(o, { style: '.pt{animation-name:pt;animation-timing-function:linear;animation-iteration-count:infinite}@keyframes pt{from{transform:translate(var(--x),-10px) rotate(0);opacity:0}8%{opacity:1}92%{opacity:1}to{transform:translate(calc(var(--x) + var(--dx)),210px) rotate(var(--r));opacity:0}}' });
}

export function hearts() {
  const r = rngFor('hearts');
  let o = '';
  for (let i = 0; i < 12; i++) {
    const x = r.range(24, 176), s = r.range(0.8, 1.7), dur = r.range(3.2, 6);
    o += `<g class="ht" style="--x:${n1(x)}px;--dx:${r.int(-18, 18)}px;animation-duration:${n1(dur)}s;animation-delay:${n1(-r() * dur)}s"><g transform="scale(${n2(s)})">${heart(r.pick(['#fb7185', '#f43f5e', '#ff8fb1', '#e11d48']), '#9f1239')}</g></g>`;
  }
  return fx(o, { style: '.ht{animation-name:ht;animation-timing-function:ease-out;animation-iteration-count:infinite}@keyframes ht{from{transform:translate(var(--x),190px) scale(.5);opacity:0}15%{opacity:1}to{transform:translate(calc(var(--x) + var(--dx)),14px) scale(1);opacity:0}}' });
}

export function starsFx() {
  const r = rngFor('starsfx');
  let o = '';
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r() * 0.3, rad = r.range(60, 88), s = r.range(4, 9), x = C + Math.cos(a) * rad, y = C + Math.sin(a) * rad;
    o += `<g transform="translate(${n1(x)} ${n1(y)})"><g class="tw" style="animation-delay:${n1(-r() * 2)}s;animation-duration:${n1(r.range(0.9, 2))}s"><path d="${star(0, 0, s, s * 0.45)}" fill="${i % 3 ? '#fde047' : '#fff'}" stroke="#d97706" stroke-width=".6" filter="url(#gl)"/></g></g>`;
  }
  const shoot = (delay, y0) => `<g class="ss" style="animation-delay:${delay}s;--y:${y0}px"><path d="M0 0L-40 -14" stroke="url(#tl)" stroke-width="2" stroke-linecap="round"/><circle r="2.2" fill="#fff"/></g>`;
  return fx(o + shoot(0, 30) + shoot(2.6, 60), { defs: lg('tl', [[0, '#fff'], [1, '#fff', 0]], [0, 0, 1, 0]), style: '.ss{animation:ss 4.5s linear infinite;opacity:0}@keyframes ss{0%{transform:translate(230px,var(--y));opacity:0}6%{opacity:1}30%{transform:translate(20px,calc(var(--y) + 100px));opacity:0}100%{opacity:0;transform:translate(20px,calc(var(--y) + 100px))}}' });
}

export function bubbles() {
  const r = rngFor('bubbles');
  let o = '';
  for (let i = 0; i < 16; i++) {
    const x = r.range(20, 180), s = r.range(3, 9), dur = r.range(4, 8);
    o += `<g class="bb" style="--x:${n1(x)}px;--dx:${r.int(-20, 20)}px;animation-duration:${n1(dur)}s;animation-delay:${n1(-r() * dur)}s"><circle r="${n2(s)}" fill="url(#bg)" stroke="#38bdf8" stroke-opacity=".9" stroke-width=".9"/><path d="M${n1(-s * 0.55)} ${n1(-s * 0.2)}Q${n1(-s * 0.45)} ${n1(-s * 0.6)} ${n1(s * 0.05)} ${n1(-s * 0.66)}" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".9"/></g>`;
  }
  return fx(o, { defs: rg('bg', [[0, '#fff', 0.12], [0.7, '#7dd3fc', 0.28], [1, '#818cf8', 0.55]]), style: '.bb{animation-name:bb;animation-timing-function:ease-in-out;animation-iteration-count:infinite}@keyframes bb{from{transform:translate(var(--x),204px);opacity:0}12%{opacity:1}to{transform:translate(calc(var(--x) + var(--dx)),-6px);opacity:0}}' });
}

export function rainFx() {
  const r = rngFor('rainfx');
  let o = '';
  for (let i = 0; i < 42; i++) {
    const x = r.range(10, 190), dur = r.range(0.6, 1.1);
    o += `<path class="dr" d="M0 0l-3 9" stroke="#5aa2f5" stroke-width="${n2(r.range(1, 1.7))}" stroke-linecap="round" style="--x:${n1(x)}px;animation-duration:${n2(dur)}s;animation-delay:${n2(-r() * dur)}s" opacity="${n2(r.range(0.6, 1))}"/>`;
  }
  const cloud = `<g transform="translate(100 24)" filter="url(#gl)"><g class="cl"><ellipse cx="0" cy="4" rx="34" ry="10" fill="#d4dbe6"/><circle cx="-14" cy="-2" r="12" fill="#e2e8f0"/><circle cx="4" cy="-8" r="15" fill="#f1f5f9"/><circle cx="20" cy="-1" r="11" fill="#e2e8f0"/><ellipse cx="0" cy="8" rx="32" ry="6" fill="#94a3b8" opacity=".55"/></g></g>`;
  return fx(cloud + o, { style: '.dr{animation-name:dr;animation-timing-function:linear;animation-iteration-count:infinite}@keyframes dr{from{transform:translate(var(--x),34px);opacity:0}15%{opacity:1}to{transform:translate(calc(var(--x) - 14px),196px);opacity:0}}.cl{animation:cl 5s ease-in-out infinite alternate}@keyframes cl{from{transform:translateX(-5px)}to{transform:translateX(5px)}}' });
}

export function fireworks() {
  const r = rngFor('fireworks');
  const T = 4.8;
  /** One shell: a rocket climbs, flashes, and streaks fly out along rays with a few embers drifting down after. */
  const burst = (cx, cy, c1, c2, delay, R, n) => {
    let rays = '', embers = '';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.08, len = R * (i % 2 ? 0.68 : 1) * r.range(0.92, 1.08);
      rays += `<path class="fwr" pathLength="1" d="M${n1(cx)} ${n1(cy)}L${n1(cx + Math.cos(a) * len)} ${n1(cy + Math.sin(a) * len)}" stroke="${i % 3 === 0 ? c2 : c1}" stroke-width="${i % 2 ? 1.3 : 2}" stroke-linecap="round" fill="none"/>`;
      if (i % 2 === 0) embers += `<circle class="fwd" cx="${n1(cx + Math.cos(a) * len * 0.92)}" cy="${n1(cy + Math.sin(a) * len * 0.92)}" r="1.6" fill="${c1}"/>`;
    }
    return `<g style="--d:${-delay}s"><g filter="url(#gl)"><path class="fwl" d="M${cx} ${cy + 44}V${cy}" stroke="${c1}" stroke-width="2.2" stroke-linecap="round" fill="none"/><circle class="fwf" cx="${cx}" cy="${cy}" r="9" fill="${c2}"/>${rays}${embers}</g></g>`;
  };
  const body = burst(44, 40, '#f43f5e', '#fda4af', 0, 32, 18) + burst(156, 34, '#f59e0b', '#fde68a', 1.0, 34, 20) + burst(100, 14, '#3b82f6', '#93c5fd', 2.0, 28, 16)
    + burst(170, 150, '#a855f7', '#d8b4fe', 2.9, 26, 16) + burst(30, 154, '#10b981', '#6ee7b7', 3.8, 26, 16);
  const style = `.fwr,.fwl,.fwf,.fwd{animation-duration:${T}s;animation-iteration-count:infinite;animation-delay:var(--d);opacity:0}
.fwr{stroke-dasharray:.34 1.4;animation-name:fwr;animation-timing-function:cubic-bezier(.15,.7,.3,1)}
@keyframes fwr{0%,12%{stroke-dashoffset:.34;opacity:0}13%{opacity:1}34%{stroke-dashoffset:-1.05;opacity:1}42%{opacity:0;stroke-dashoffset:-1.05}100%{opacity:0;stroke-dashoffset:-1.05}}
.fwl{stroke-dasharray:.35 1.4;animation-name:fwl;animation-timing-function:ease-out}
@keyframes fwl{0%{stroke-dashoffset:.35;opacity:0}2%{opacity:1}12%{stroke-dashoffset:-.3;opacity:1}14%{opacity:0}100%{opacity:0}}
.fwf{animation-name:fwf;transform-box:fill-box;transform-origin:center}
@keyframes fwf{0%,11%{opacity:0;transform:scale(.2)}13%{opacity:.95;transform:scale(1)}24%{opacity:0;transform:scale(2.2)}100%{opacity:0}}
.fwd{animation-name:fwd}
@keyframes fwd{0%,30%{opacity:0;transform:translateY(0)}34%{opacity:1}60%{opacity:0;transform:translateY(12px)}100%{opacity:0}}`;
  return fx(body, { style });
}
