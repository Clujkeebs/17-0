'use client';
import { useEffect, useRef, useState } from 'react';
import { click, thud } from './sound';

export interface ReelTeam { abbreviation: string; city: string; name: string; color: string }

/**
 * Slot reel: cycles team abbreviations with increasing delay, then lands with a small settle.
 * Pure text + CSS transform, so it is cheap on old phones. Reduced motion lands instantly.
 */
export function Reel({ pool, target, delay = 0, onLand }: { pool: ReelTeam[]; target: ReelTeam; delay?: number; onLand?: () => void }) {
  const [shown, setShown] = useState<ReelTeam | null>(null);
  const [landed, setLanded] = useState(false);
  const landRef = useRef(onLand);
  landRef.current = onLand;
  const targetRef = useRef(target);
  targetRef.current = target;
  const delayRef = useRef(delay);
  useEffect(() => {
    const target = targetRef.current, delay = delayRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let t: ReturnType<typeof setTimeout>;
    let cancelled = false;
    if (reduce) { t = setTimeout(() => { setShown(target); setLanded(true); landRef.current?.(); }, delay); return () => clearTimeout(t); }
    let i = Math.floor(Math.random() * pool.length), step = 0;
    const steps = 18;
    const tick = () => {
      if (cancelled) return;
      if (step >= steps) { setShown(target); setLanded(true); thud(); landRef.current?.(); return; }
      i = (i + 1) % pool.length;
      setShown(pool[i]); click();
      step++;
      t = setTimeout(tick, 35 + Math.pow(step / steps, 2.4) * 260);
    };
    t = setTimeout(tick, delay);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.abbreviation]);
  const team = shown;
  return (
    <div className={`reel ${landed ? 'reel-landed' : ''}`} aria-hidden={!landed}>
      <span className="reel-abbr num" style={{ borderColor: landed && team ? team.color : undefined }}>{team ? team.abbreviation : '···'}</span>
    </div>
  );
}
