// Effect overlays: 200 x 200 canvases with the avatar in the middle (a circle of radius 50 at 100,100).
// The overlay is drawn at twice the avatar's size, so anything outside r=50 floats around the picture.
import { rng, svg, lg, rg, n1, n2, star, sparkle, hex } from './lib.mjs';

export const C = 100;

export const fx = (body, { defs = '', style = '' } = {}) =>
  svg(200, 200, { defs: defs + GLOW, body, style: BASE_CSS + style, slice: false });

const GLOW = `<filter id="gl" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
  + `<filter id="gl2" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="4.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
  + `<filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>`;

export const BASE_CSS = '.orb{transform-origin:100px 100px;animation:orb linear infinite}@keyframes orb{to{transform:rotate(360deg)}}'
  + '.tw{animation:tw 1.3s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center}@keyframes tw{from{opacity:.4;transform:scale(.6)}to{opacity:1;transform:scale(1.15)}}'
  + '.fb{transform-box:fill-box;transform-origin:center}';

/** Something that rides a circular path of radius r around the avatar; the child is drawn at (100, 100 - r). */
export const orbit = (inner, { dur = 4, delay = 0, rev = false } = {}) =>
  `<g class="orb" style="animation-duration:${dur}s;animation-delay:${-delay}s${rev ? ';animation-direction:reverse' : ''}">${inner}</g>`;

// --- little objects, each drawn around (0,0) with a nominal radius of about 10

export const football = (s = 1) => `<g transform="scale(${s})"><ellipse rx="13" ry="8" transform="rotate(-25)" fill="url(#fb)" stroke="#4a2209" stroke-width="1"/><path d="M-5-2.2L5 2.2M-2.6-3.4l1.6 3.8M0-4.4l1.6 3.8M2.6-5.4l1.6 3.8" transform="rotate(-25)" stroke="#fff" stroke-width="1.1" stroke-linecap="round" fill="none"/><path d="M-9-2Q-6-6 -2-7" transform="rotate(-25)" stroke="#fff" stroke-opacity=".35" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>`;
export const footballDefs = lg('fb', [[0, '#b45f2a'], [0.5, '#8b4513'], [1, '#5c2e0b']], [0, 0, 0, 1]);

export const basketball = (s = 1) => `<g transform="scale(${s})"><circle r="9.5" fill="url(#bb)" stroke="#6b2a0a" stroke-width="1"/><path d="M-9.5 0H9.5M0-9.5V9.5M-6.7-6.7Q-2 0 -6.7 6.7M6.7-6.7Q2 0 6.7 6.7" stroke="#4a1d08" stroke-width="1" fill="none"/><path d="M-6-5Q-3-8 1-8.5" stroke="#fff" stroke-opacity=".4" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>`;
export const basketballDefs = rg('bb', [[0, '#fb923c'], [0.7, '#ea580c'], [1, '#9a3412']], [0.35, 0.3, 0.8]);

export const baseball = (s = 1) => `<g transform="scale(${s})"><circle r="8.5" fill="url(#bs)" stroke="#a3a3a3" stroke-width=".8"/><path d="M-5.5-5.5Q-1 0 -5.5 5.5M5.5-5.5Q1 0 5.5 5.5" stroke="#dc2626" stroke-width="1" fill="none" stroke-dasharray="1.2 1.4"/></g>`;
export const baseballDefs = rg('bs', [[0, '#fff'], [0.7, '#f5f5f4'], [1, '#c7c7c7']], [0.35, 0.3, 0.8]);

export const soccer = (s = 1) => `<g transform="scale(${s})"><circle r="9.5" fill="url(#sc)" stroke="#2a2a2a" stroke-width="1"/><path d="M0-3.6L3.4-1.1L2.1 2.9H-2.1L-3.4-1.1z" fill="#1c1c1c"/><path d="M0-3.6V-9M3.4-1.1L8.6-2.9M2.1 2.9L5.3 7.3M-2.1 2.9L-5.3 7.3M-3.4-1.1L-8.6-2.9" stroke="#1c1c1c" stroke-width="1" fill="none"/><path d="M-6-5Q-3-8 1-8.5" stroke="#fff" stroke-opacity=".5" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>`;
export const soccerDefs = rg('sc', [[0, '#fff'], [0.75, '#f1f1f1'], [1, '#bdbdbd']], [0.35, 0.3, 0.8]);

export const puck = (s = 1) => `<g transform="scale(${s})"><ellipse cy="2" rx="10" ry="4.5" fill="#0a0a0a"/><rect x="-10" y="-3" width="20" height="5" fill="#16161a"/><ellipse cy="-3" rx="10" ry="4.5" fill="#2a2a32"/><ellipse cy="-3.4" rx="6" ry="2.6" fill="#3c3c46"/></g>`;

export const crown = (s = 1) => `<g transform="scale(${s})"><path d="M-11 6L-13-6L-6 0L0-9L6 0L13-6L11 6z" fill="url(#cg)" stroke="#7a5700" stroke-width="1"/><rect x="-11" y="6" width="22" height="3.4" rx="1" fill="#b8860b"/><circle cy="1" r="2" fill="#dc2626"/><circle cx="-7" cy="3" r="1.2" fill="#38bdf8"/><circle cx="7" cy="3" r="1.2" fill="#38bdf8"/></g>`;
export const crownDefs = lg('cg', [[0, '#fff1b0'], [0.5, '#e8c547'], [1, '#8a6400']], [0, 0, 0, 1]);

export const coin = (s = 1) => `<g transform="scale(${s})"><circle r="8" fill="url(#cn)" stroke="#8a6400" stroke-width="1"/><circle r="5.6" fill="none" stroke="#b8860b" stroke-width=".8"/><path d="M-1.5-3.5H1.8M0-4V4M-2.4 0H2.4" stroke="#8a6400" stroke-width="1.1" stroke-linecap="round"/></g>`;
export const coinDefs = lg('cn', [[0, '#fff1b0'], [0.5, '#f2c94c'], [1, '#a77b0a']], [0, 0, 1, 1]);

export const heart = (c1, c2) => `<path d="M0 6C-9-1-8-8-3-8C-1-8 0-6 0-5C0-6 1-8 3-8C8-8 9-1 0 6z" fill="${c1}" stroke="${c2}" stroke-width=".8"/><path d="M-5-5Q-3-6.5 -1.5-5.6" stroke="#fff" stroke-opacity=".6" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;

/** Four-point glint. */
export const glint = (s, c = '#fff') => `<path d="${sparkle(0, 0, s)}" fill="${c}"/>`;

export function rngFor(key) { return rng(`fx-${key}`); }
export { n1, n2, star, sparkle, hex, lg, rg };
