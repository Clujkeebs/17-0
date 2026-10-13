'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { MOTION_KEY, motionMode, parsePref, stillOf, type MotionMode, type MotionPref } from '@/lib/motion';

const EVENT = 'gl-motion';
const systemReduces = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const readPref = (): MotionPref => { try { return parsePref(localStorage.getItem(MOTION_KEY)); } catch { return 'auto'; } };

/** Saves the choice and applies it to the whole page at once. */
export function applyMotion(pref: MotionPref) {
  try { if (pref === 'auto') localStorage.removeItem(MOTION_KEY); else localStorage.setItem(MOTION_KEY, pref); } catch { /* private mode: the choice lasts until reload */ }
  document.documentElement.dataset.motion = motionMode(pref, systemReduces());
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (cb: () => void) => { window.addEventListener(EVENT, cb); return () => window.removeEventListener(EVENT, cb); };
const snapshot = (): MotionMode => (document.documentElement.dataset.motion === 'reduce' ? 'reduce' : 'full');
/** The motion mode in force right now. The server and the first paint say "full", then the page's own setting takes over. */
export const useMotion = () => useSyncExternalStore(subscribe, snapshot, () => 'full' as const);

/** Decorative art in an <img>: animated, or its still twin when motion is reduced. Hidden from assistive tech. */
export function Art({ src, className, lazy = true, still = true }: { src: string; className?: string; lazy?: boolean; still?: boolean }) {
  const motion = useMotion();
  return <img className={className} src={motion === 'reduce' && still ? stillOf(src) : src} alt="" aria-hidden="true" width={200} height={200} decoding="async" loading={lazy ? 'lazy' : undefined} draggable={false} />;
}

/** Animations: follow the device, always on, or off. Says so plainly when the device is the reason things are still. */
export function MotionToggle({ className }: { className?: string }) {
  const [pref, setPref] = useState<MotionPref | null>(null);
  const [sys, setSys] = useState(false);
  useEffect(() => { setPref(readPref()); setSys(systemReduces()); }, []);
  if (pref === null) return <div className={`motion-toggle${className ? ` ${className}` : ''}`} style={{ minHeight: 40 }} />;
  const choose = (p: MotionPref) => { setPref(p); applyMotion(p); };
  const paused = motionMode(pref, sys) === 'reduce';
  return (
    <div className={`motion-toggle${className ? ` ${className}` : ''}`}>
      <div className="mt-row">
        <span className="mt-label" id="mt-label">Animations</span>
        <div className="seg" role="group" aria-labelledby="mt-label">
          {([['auto', 'Match my device'], ['on', 'On'], ['off', 'Off']] as const).map(([k, l]) => (
            <button key={k} type="button" className={k === pref ? 'on' : ''} aria-pressed={k === pref} onClick={() => choose(k)}>{l}</button>
          ))}
        </div>
      </div>
      {paused && pref === 'auto' && sys && <p className="muted mt-note">Your device asks for reduced motion, so animated items stand still here. Choose On to see them move.</p>}
      {paused && pref === 'off' && <p className="muted mt-note">Animations are off. Everything stands still.</p>}
    </div>
  );
}
