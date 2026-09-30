'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { click, thud } from './sound';

export interface ReelTeam { id: number; abbreviation: string; city: string; name: string; color: string; logoUrl: string | null }

const CELL = 148;

export function TeamMark({ team, size = 64 }: { team: Pick<ReelTeam, 'abbreviation' | 'logoUrl' | 'color' | 'city' | 'name'>; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (team.logoUrl && !failed) {
    return <img src={team.logoUrl} alt={`${team.city} ${team.name} logo`} width={size} height={size} onError={() => setFailed(true)} style={{ width: size, height: size, objectFit: 'contain' }} />;
  }
  return <span className="team-mono" style={{ width: size, height: size, background: team.color, fontSize: size * 0.3 }}>{team.abbreviation}</span>;
}

/**
 * A vertical slot reel of team logos. Builds a strip of random teams ending on the target, then
 * eases a single transform to it (one GPU-composited animation, cheap on old phones).
 */
export function Reel({ pool, target, spinKey, onLand }: { pool: ReelTeam[]; target: ReelTeam; spinKey: string | number; onLand?: () => void }) {
  const strip = useMemo(() => {
    const out: ReelTeam[] = [];
    for (let i = 0; i < 30; i++) out.push(pool[Math.floor(Math.random() * pool.length)]);
    out.push(target);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);
  const [y, setY] = useState(0);
  const [landed, setLanded] = useState(false);
  const landRef = useRef(onLand);
  landRef.current = onLand;
  useEffect(() => {
    setLanded(false); setY(0);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const end = -(strip.length - 1) * CELL;
    if (reduce) { setY(end); setLanded(true); landRef.current?.(); return; }
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setY(end)));
    const ticks = [0, 110, 220, 330, 450, 580, 730, 900, 1100, 1350, 1650, 2000].map((ms) => setTimeout(click, ms));
    const done = setTimeout(() => { setLanded(true); thud(); landRef.current?.(); }, 2450);
    return () => { cancelAnimationFrame(raf); ticks.forEach(clearTimeout); clearTimeout(done); };
  }, [strip]);
  return (
    <div className={`reel2 ${landed ? 'is-landed' : ''}`} aria-hidden="true">
      <div className="reel2-strip" style={{ transform: `translateY(${y}px)`, transition: y === 0 ? 'none' : 'transform 2.4s cubic-bezier(.1,.7,.1,1)' }}>
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
