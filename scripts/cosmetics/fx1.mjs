import { C, fx, orbit, football, footballDefs, basketball, basketballDefs, baseball, baseballDefs, soccer, soccerDefs, puck, crown, crownDefs, coin, coinDefs, glint, rngFor, lg, rg, n1, n2, star, sparkle } from './fxlib.mjs';

/** A fading arc behind an orbiting object: n dots from the object back along the circle. */
function trail(r, n, spread, color, size) {
  let o = '';
  for (let i = 1; i <= n; i++) { const a = -(i / n) * spread, x = C + Math.sin(a) * r, y = C - Math.cos(a) * r; o += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n2(size * (1 - i / (n + 2)))}" fill="${color}" opacity="${n2(0.55 * (1 - i / n))}"/>`; }
  return o;
}

export function sparks() {
  const r = rngFor('sparks');
  const spark = (rad, dur, delay, size, rev) => orbit(`<g transform="translate(${C} ${C - rad})" filter="url(#gl)"><g class="tw" style="animation-delay:${-delay}s"><path d="${sparkle(0, 0, size)}" fill="#fff6c0"/><circle r="${size * 0.28}" fill="#fff"/></g></g>${trail(rad, 8, 0.5, '#fbbf24', size * 0.22)}`, { dur, delay, rev });
  let dust = '';
  for (let i = 0; i < 12; i++) { const a = r() * Math.PI * 2, rad = r.range(58, 82); dust += `<circle cx="${n1(C + Math.cos(a) * rad)}" cy="${n1(C + Math.sin(a) * rad)}" r="${n2(r.range(0.8, 1.7))}" fill="#fde68a" class="tw" style="animation-delay:${n1(-r() * 2)}s;animation-duration:${n1(r.range(0.8, 1.8))}s"/>`; }
  return fx(spark(66, 5.2, 0, 11) + spark(78, 7.4, 2.4, 8, true) + spark(58, 3.6, 1.2, 7) + dust);
}

function ballFx(key, drawer, defs, { dur = 3.6, rad = 68, spin = 'spin', bounce = false, size = 1.7, trailColor = 'rgba(255,255,255,.7)' } = {}) {
  const inner = `<g transform="translate(${C} ${C - rad})"><g class="${bounce ? 'bnc' : 'fb'}"><g class="${spin}">${drawer(size)}</g></g></g>`;
  return fx(orbit(inner + trail(rad, 14, 0.8, trailColor, 3.2), { dur }), {
    defs,
    style: '.spin{animation:sp .6s linear infinite;transform-box:fill-box;transform-origin:center}@keyframes sp{to{transform:rotate(360deg)}}.spiral{animation:spi .5s linear infinite;transform-box:fill-box;transform-origin:center}@keyframes spi{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.55)}}.bnc{animation:bn .7s cubic-bezier(.5,0,.5,1) infinite alternate;transform-box:fill-box;transform-origin:center}@keyframes bn{from{transform:translateY(-9px) scale(1)}to{transform:translateY(9px) scale(1.1,.9)}}',
  });
}
export const footballFx = () => ballFx('football', football, footballDefs, { dur: 4.2, spin: 'spiral', trailColor: 'rgba(180,95,42,.7)' });
export const basketballFx = () => ballFx('basketball', basketball, basketballDefs, { dur: 4.6, bounce: true, trailColor: 'rgba(251,146,60,.6)' });
export const baseballFx = () => ballFx('baseball', baseball, baseballDefs, { dur: 2.2, size: 1.5, trailColor: 'rgba(220,38,38,.55)' });
export const soccerFx = () => ballFx('soccer', soccer, soccerDefs, { dur: 4, bounce: true, trailColor: 'rgba(255,255,255,.65)' });

export function hockeyFx() {
  const r = rngFor('hockey');
  let spray = '';
  for (let i = 0; i < 16; i++) { const a = -(i / 16) * 1.2, rad = 66 + r.range(-6, 6); spray += `<circle cx="${n1(C + Math.sin(a) * rad)}" cy="${n1(C - Math.cos(a) * rad)}" r="${n2(r.range(0.8, 2))}" fill="#e0f2fe" opacity="${n2(0.9 * (1 - i / 16))}"/>`; }
  const inner = `<g transform="translate(${C} ${C - 66})"><g transform="rotate(90)">${puck(1.6)}</g></g>${spray}`;
  return fx(orbit(inner, { dur: 3 }));
}

export function cometFx() {
  let tail = '';
  const N = 34;
  for (let i = 1; i <= N; i++) { const a = -(i / N) * 1.9, x = C + Math.sin(a) * 66, y = C - Math.cos(a) * 66; tail += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n2(5.2 * (1 - i / (N + 4)))}" fill="${i < 8 ? '#fdba74' : i < 18 ? '#fb923c' : '#ea580c'}" opacity="${n2(0.95 * Math.pow(1 - i / N, 1.4))}"/>`; }
  const head = `<g transform="translate(${C} ${C - 66})" filter="url(#gl2)"><circle r="7" fill="#fff"/><circle r="4" fill="#fff9d6"/></g>`;
  return fx(orbit(`<g filter="url(#gl)">${tail}</g>${head}`, { dur: 2.4 }));
}

export function coinsFx() {
  const c = (rad, dur, delay, rev) => orbit(`<g transform="translate(${C} ${C - rad})"><g class="flip" style="animation-delay:${-delay}s">${coin(1.5)}</g></g>`, { dur, delay, rev });
  const glints = [0, 1, 2, 3].map((i) => orbit(`<g transform="translate(${C} ${C - 82})" class="tw" style="animation-delay:${-i * 0.4}s">${glint(5, '#fff3b0')}</g>`, { dur: 9, delay: i * 2.2 })).join('');
  return fx(c(66, 5.5, 0) + c(66, 5.5, 1.83) + c(66, 5.5, 3.66) + glints, { defs: coinDefs, style: '.flip{animation:fl 1.1s linear infinite;transform-box:fill-box;transform-origin:center}@keyframes fl{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.12)}}' });
}

export function crownFx() {
  let sp = '';
  for (let i = 0; i < 5; i++) sp += orbit(`<g transform="translate(${C} ${C - 78})" class="tw" style="animation-delay:${-i * 0.3}s">${glint(4.2, '#fde68a')}</g>`, { dur: 6, delay: i * 1.2 });
  return fx(orbit(`<g transform="translate(${C} ${C - 66})" filter="url(#gl)">${crown(1.9)}</g>${trail(66, 10, 0.55, '#f2c94c', 3)}`, { dur: 6 }) + sp, { defs: crownDefs });
}

export function beeFx() {
  const bee = `<g transform="scale(1.5)"><g class="wing"><ellipse cx="-3" cy="-7" rx="7" ry="4" fill="#e0f2fe" opacity=".8"/><ellipse cx="4" cy="-7" rx="7" ry="4" fill="#e0f2fe" opacity=".8"/></g><ellipse rx="10" ry="6.4" fill="#facc15" stroke="#111" stroke-width="1.2"/><path d="M-3.4-5.6V5.6M1.4-6.2V6.2M6-5V5" stroke="#111" stroke-width="2.4"/><circle cx="10" cy="-.6" r="2.8" fill="#111"/><path d="M-10 0L-14 1" stroke="#111" stroke-width="1.2" stroke-linecap="round"/></g>`;
  // A figure of eight around the picture: a slow sideways swing with a vertical swing at double speed.
  return fx(`<g transform="translate(100 100)"><g class="ex"><g class="ey"><g class="bob">${bee}</g></g></g></g>`, {
    style: '.ex{animation:ex 3.6s cubic-bezier(.37,0,.63,1) infinite alternate}@keyframes ex{from{transform:translateX(-64px)}to{transform:translateX(64px)}}.ey{animation:ey 1.8s cubic-bezier(.37,0,.63,1) infinite alternate}@keyframes ey{from{transform:translateY(-34px)}to{transform:translateY(34px)}}.bob{animation:bb .5s ease-in-out infinite alternate}@keyframes bb{from{transform:rotate(-8deg)}to{transform:rotate(8deg)}}.wing{animation:wg .08s linear infinite alternate;transform-box:fill-box;transform-origin:50% 100%}@keyframes wg{from{transform:scaleY(1)}to{transform:scaleY(.3)}}',
  });
}
