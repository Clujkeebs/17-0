'use client';
// Optional sound. Off by default, never autoplays, toggled by the user.
const KEY = 'gl-sound';
let ctx: AudioContext | null = null;
export const soundOn = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
export const setSound = (on: boolean) => { try { localStorage.setItem(KEY, on ? '1' : '0'); } catch {} };

function tone(freq: number, dur: number, gain: number, type: OscillatorType = 'square') {
  if (!soundOn()) return;
  try {
    ctx ??= new AudioContext();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
  } catch { /* audio unavailable */ }
}
export const click = () => tone(1400, 0.025, 0.03);
export const thud = () => tone(90, 0.18, 0.12, 'sine');
export const swell = () => { tone(220, 1.2, 0.05, 'sawtooth'); tone(330, 1.2, 0.03, 'sine'); };
