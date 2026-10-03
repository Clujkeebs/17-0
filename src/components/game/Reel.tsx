'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { click, thud } from './sound';
import { readableOn } from '@/lib/color';

export interface ReelTeam { id: number; abbreviation: string; city: string; name: string; color: string; logoUrl: string | null }

const CELL = 148;

export function TeamMark({ team, size = 64, alt }: { team: Pick<ReelTeam, 'abbreviation' | 'logoUrl' | 'color' | 'city' | 'name'>; size?: number; /** Pass "" when the logo sits next to the team name. */ alt?: string }) {
  const [failed, setFailed] = useState(false);
  if (team.logoUrl && !failed) {
    return <img src={team.logoUrl} alt={alt ?? `${[team.city, team.name].filter(Boolean).join(' ')} logo`} width={size} height={size} onError={() => setFailed(true)} style={{ width: size, height: size, objectFit: 'contain' }} />;
  }
  return <span className="team-mono" aria-hidden={alt === '' ? true : undefined} style={{ width: size, height: size, background: team.color, color: readableOn(team.color), fontSize: size * 0.3 }}>{team.abbreviation}</span>;
}

/**
 * A vertical slot reel of team logos. Builds a strip of random teams ending on the target, then
 * eases a single transform to it (one GPU-composited animation, cheap on old phones).
 */
export function Reel({ pool, target, spinKey, onLand }: { pool: ReelTeam[]; target: ReelTeam; spinKey: string | number; onLand?: () => void }) {
  const strip = useMemo(() => {
    const out: ReelTeam[] = [];
    // Decorative randomness for the reel strip only; the landing team comes from the server.
    // eslint-disable-next-line react-hooks/purity
    for (let i = 0; i < 30; i++) out.push(pool[Math.floor(Math.random() * pool.length)]);
    out.push(target);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);
  const [y, setY] = useState(0);
  const [landed, setLanded] = useState(false);
  const [ms, setMs] = useState(2400);
  const landRef = useRef(onLand);
  landRef.current = onLand;
  useEffect(() => {
    setLanded(false); setY(0);
    // The spin is the game, so it always plays. With Reduce Motion on it is shorter and eases gently.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = reduce ? 1300 : 2400;
    setMs(dur);
    const end = -(strip.length - 1) * CELL;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setY(end)));
    const ticks = reduce ? [] : [0, 110, 220, 330, 450, 580, 730, 900, 1100, 1350, 1650, 2000].map((t) => setTimeout(click, t));
    const done = setTimeout(() => { setLanded(true); thud(); landRef.current?.(); }, dur + 50);
    return () => { cancelAnimationFrame(raf); ticks.forEach(clearTimeout); clearTimeout(done); };
  }, [strip]);
  return (
    <div className={`reel2 ${landed ? 'is-landed' : ''}`} aria-hidden="true">
      <div className="reel2-strip" style={{ transform: `translateY(${y}px)`, transition: y === 0 ? 'none' : `transform ${ms}ms cubic-bezier(.1,.7,.1,1)` }}>
        {strip.map((t, i) => (
          <div key={i} className="reel2-cell" style={{ ['--tc' as string]: t.color }}>
            <TeamMark team={t} size={96} />
            <span className="reel2-name"><span className="reel2-city">{t.city}</span><strong>{t.name}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Warms the browser cache with every team logo so the reel never spins through blank cells. */
export function usePreloadLogos(pool: ReelTeam[]) {
  useEffect(() => {
    for (const t of pool) if (t.logoUrl) { const img = new Image(); img.src = t.logoUrl; }
  }, [pool]);
}

/** Endless spin shown while the server picks the team; the real Reel takes over and lands. */
export function SpinningReel({ pool }: { pool: ReelTeam[] }) {
  const strip = useMemo(() => [...pool, ...pool].slice(0, 64), [pool]);
  return (
    <div className="reel2 reel2-loop" aria-hidden="true">
      <div className="reel2-strip">
        {strip.map((t, i) => (
          <div key={i} className="reel2-cell">
            <TeamMark team={t} size={96} />
            <span className="reel2-name"><span className="reel2-city">{t.city}</span><strong>{t.name}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ERA_CELL = 96;
/** Era colors on the reel: each decade gets its own swatch so the spin reads at a glance. */
const ERA_TINT: Record<string, string> = { '1970s': '#B45309', '1980s': '#BE185D', '1990s': '#6D28D9', '2000s': '#1D4ED8', '2010s': '#0F766E', '2020s': '#C8102E' };

/**
 * The era spins like the team does: a short slot reel of decades that lands on the one the server drew.
 * It only spins when the era actually changes (a team re-spin keeps the era still).
 */
export function EraReel({ eras, target, targetLabel, spinKey, onLand }: { eras: { key: string; label: string }[]; target: string; targetLabel: string; spinKey: string | number; onLand?: () => void }) {
  const strip = useMemo(() => {
    const out: { key: string; label: string }[] = [];
    // eslint-disable-next-line react-hooks/purity
    for (let i = 0; i < 18; i++) out.push(eras[Math.floor(Math.random() * eras.length)]);
    out.push({ key: target, label: targetLabel });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);
  const [y, setY] = useState(0);
  const [landed, setLanded] = useState(false);
  const [ms, setMs] = useState(1600);
  const landRef = useRef(onLand);
  landRef.current = onLand;
  useEffect(() => {
    setLanded(false); setY(0);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = reduce ? 900 : 1600;
    setMs(dur);
    const end = -(strip.length - 1) * ERA_CELL;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setY(end)));
    const ticks = reduce ? [] : [0, 120, 250, 400, 580, 800, 1080, 1400].map((t) => setTimeout(click, t));
    const done = setTimeout(() => { setLanded(true); thud(); landRef.current?.(); }, dur + 50);
    return () => { cancelAnimationFrame(raf); ticks.forEach(clearTimeout); clearTimeout(done); };
  }, [strip]);
  return (
    <div className={`reel2 era-reel ${landed ? 'is-landed' : ''}`} aria-hidden="true" style={{ ['--tc' as string]: ERA_TINT[target] ?? 'var(--bone)' }}>
      <div className="reel2-strip" style={{ transform: `translateY(${y}px)`, transition: y === 0 ? 'none' : `transform ${ms}ms cubic-bezier(.1,.7,.1,1)` }}>
        {strip.map((e, i) => (
          <div key={i} className="reel2-cell era-cell">
            <span className="era-chip" style={{ background: ERA_TINT[e.key] ?? '#0A0A0A' }}>{e.label}</span>
            <span className="reel2-name"><span className="reel2-city">Era</span><strong>{e.key}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A still era card, for when the team re-spins and the era stays. */
export function EraCard({ era, label }: { era: string; label: string }) {
  return (
    <div className="reel2 era-reel is-still" aria-hidden="true" style={{ ['--tc' as string]: ERA_TINT[era] ?? 'var(--bone)' }}>
      <div className="reel2-cell era-cell">
        <span className="era-chip" style={{ background: ERA_TINT[era] ?? '#0A0A0A' }}>{label}</span>
        <span className="reel2-name"><span className="reel2-city">Era</span><strong>{era}</strong></span>
      </div>
    </div>
  );
}
