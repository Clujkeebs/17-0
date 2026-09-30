'use client';
// Optional sound. Off by default, never autoplays, toggled by the user.
// Games keep the preference in localStorage; the profile "Game sounds" setting is the same
// preference mirrored to the account, so both stay in sync through these helpers.
const KEY = 'gl-sound';
const listeners = new Set<(on: boolean) => void>();
export const soundOn = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
export function setSound(on: boolean) {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* ignore */ }
  for (const l of listeners) l(on);
}
/** Subscribe to preference changes (settings page toggle in another tab or on this page). */
export function onSoundChange(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

let ctx: AudioContext | null = null;

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
