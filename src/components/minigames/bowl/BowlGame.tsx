'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { BOWL_DRIVES, fgChance, type BowlTeam, type OppDrive } from '@/lib/game/bowl';
import { createRng } from '@/lib/game/prng';
import { RES_H, RES_W, aimFrom, dive, draw, fieldY, juke, onSprite, playOptions, playStats, receivers, scramble, setupPlay, snap, steer, step, throwAt, throwTo, type Play, type PlayState, type StatLine } from './engine';
import { click, swell, thud } from '@/components/game/sound';
import '../bowl.css';

export interface GameOver { pf: number; pa: number; drives: number[]; stats: Record<string, StatLine> }

type Stage = 'intro' | 'pre' | 'play' | 'result' | 'fourth' | 'pat' | 'kick' | 'opp' | 'half' | 'final';
const yardLine = (los: number) => (los === 50 ? '50' : los < 50 ? `OWN ${Math.round(los)}` : `OPP ${Math.round(100 - los)}`);
const ord = (n: number) => ['1st', '2nd', '3rd', '4th'][n - 1] ?? `${n}th`;

/**
 * One game of Unbeaten Bowl: six drives each, yours played on the field, theirs given (simulated from the rosters).
 * Used by the daily match, quick play and GM mode; `final` draws what happens when the game ends.
 */
export function BowlGame({ you, opp, theirs, youFirst, luckSeed, label, onDrive, final }: {
  you: BowlTeam; opp: BowlTeam; theirs: OppDrive[]; youFirst: boolean; luckSeed: string;
  /** Shown on the intro card, e.g. "Week 5" or "Divisional round". */
  label?: string;
  onDrive?: (idx: number, points: number) => void;
  final: (r: GameOver) => ReactNode;
}) {
  // Play-by-play luck is fresh each game (the matchup and the other team's drives are fixed by the caller).
  const luck = useRef<(() => number) | null>(null);
  const rng = useCallback(() => {
    if (!luck.current) { const r = createRng(`bowl:${luckSeed}:play:${Math.random()}`); luck.current = () => r.next(); }
    return luck.current();
  }, [luckSeed]);

  const canvas = useRef<HTMLCanvasElement>(null);
  const play = useRef<PlayState | null>(null);
  const box = useRef<Record<string, StatLine>>({});
  const [stage, setStage] = useState<Stage>('intro');
  // Twelve possessions alternate (six each), halftime after six. poss is the one being played.
  const [poss, setPoss] = useState(0);
  const [mine, setMine] = useState<number[]>([]);
  const [oppIdx, setOppIdx] = useState(0);
  const drive = mine.length;
  const [down, setDown] = useState(1);
  const [los, setLos] = useState(25);
  const [firstAt, setFirstAt] = useState(35);
  const [msg, setMsg] = useState('');
  const [log, setLog] = useState('');
  // Three plays to pick from before every snap; the one on the field shows its routes until the snap.
  const [options, setOptions] = useState<Play[] | null>(null);
  const [chosen, setChosen] = useState<Play | null>(null);
  const [two, setTwo] = useState(false);
  const drag = useRef<{ px: number; py: number; t: number; moved: boolean } | null>(null);
  const [phase, setPhase] = useState<PlayState['phase']>('pre');
  const pf = mine.reduce((s, x) => s + x, 0);
  const pa = theirs.slice(0, oppIdx).reduce((s, d) => s + d.points, 0);

  const isYours = (i: number) => (i % 2 === 0) === youFirst;
  const goTo = (i: number) => {
    setPoss(i);
    if (i >= BOWL_DRIVES * 2) { setStage('final'); return; }
    if (isYours(i)) { setLos(25); setFirstAt(35); setDown(1); setLog(''); setMsg(''); setOptions(null); setStage('pre'); } else setStage('opp');
  };
  const advance = (next: number) => { if (next === BOWL_DRIVES) { setPoss(next); setStage('half'); } else goTo(next); };

  const afterYourDrive = (points: number) => {
    onDrive?.(mine.length, points);
    setMine((m) => [...m, points]);
    advance(poss + 1);
  };

  const nextAfterOpp = () => { setOppIdx((n) => n + 1); advance(poss + 1); };

  const begin = () => { click(); goTo(0); };

  /** Pick a play: it lines up with its routes drawn; a tap on the field (or Space) snaps it. */
  const startPlay = (p: Play, isTwo = false) => {
    click(); setChosen(p); setTwo(isTwo);
    play.current = setupPlay(you, opp, isTwo ? 98 : los, isTwo ? 100 : firstAt, p, rng, isTwo);
    setStage('play');
    setMsg(p.call === 'pass' ? 'Tap the field to snap. Then drag back and let go to throw.' : 'Tap the field to snap. Hold above or below the runner to steer.');
  };
  const doSnap = () => { const s = play.current; if (s && s.phase === 'pre') { snap(s); click(); setMsg(s.call === 'pass' ? 'Drag back from anywhere and release to throw. Tap your QB to run.' : 'Steer: hold above or below the runner. Swipe to juke. Dive at the line.'); } };

  /** A play is over: keep the box score, move the chains, score, or end the drive. */
  const resolve = (s: PlayState) => {
    for (const [n, l] of Object.entries(playStats(s))) {
      const c = (box.current[n] ??= {});
      for (const [k, v] of Object.entries(l)) c[k as keyof StatLine] = (c[k as keyof StatLine] ?? 0) + (v ?? 0);
    }
    const o = s.outcome!;
    setLog(o.text);
    if (s.twoPoint) { const ok = o.kind === 'td'; setMsg(ok ? 'Two-point try is good.' : 'Two-point try fails.'); if (ok) swell(); finish(ok ? 8 : 6); return; }
    if (o.kind === 'td') { swell(); setMsg('Touchdown.'); setStage('pat'); return; }
    if (o.kind === 'int') { thud(); setMsg('Turnover.'); finish(0); return; }
    const gain = o.kind === 'incomplete' ? 0 : o.yards;
    const spot = Math.max(1, Math.min(99, los + gain));
    if (o.kind !== 'incomplete') thud();
    if (spot >= firstAt) { setLos(spot); setFirstAt(Math.min(100, spot + 10)); setDown(1); setMsg('First down.'); setStage('pre'); return; }
    if (down >= 4) { setMsg('Turnover on downs.'); finish(0); return; }
    setLos(spot); setDown(down + 1);
    setStage(down + 1 === 4 ? 'fourth' : 'pre');
  };

  const finish = (points: number) => { window.setTimeout(() => afterYourDrive(points), points ? 600 : 300); setStage('result'); };

  const kickFg = () => {
    const p = fgChance(100 - los, you.k);
    const ok = rng() < p;
    setStage('kick'); setLog(`${you.k.name} lines up from ${Math.round(100 - los + 17)}.`);
    window.setTimeout(() => { setLog(ok ? `It is good from ${Math.round(100 - los + 17)}.` : `No good from ${Math.round(100 - los + 17)}.`); if (ok) swell(); else thud(); finish(ok ? 3 : 0); }, 1300);
  };
  const kickPat = () => { const ok = rng() < 0.9 + you.k.acc / 1000; setLog(ok ? 'Extra point is good.' : 'Extra point is no good.'); finish(ok ? 7 : 6); };

  // The play loop.
  useEffect(() => {
    if (stage !== 'play') return;
    const ctx = canvas.current?.getContext('2d');
    let raf = 0, last = -1, frame = 0, done = false, seen: PlayState['phase'] | null = null;
    const tick = (now: number) => {
      const s = play.current;
      if (!s || !ctx) return;
      if (last < 0) last = now;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; frame++;
      step(s, dt);
      draw(ctx, s, frame, s.phase === 'pre');
      if (s.phase !== seen) { seen = s.phase; setPhase(s.phase); }
      if (s.phase === 'dead' && !done) { done = true; window.setTimeout(() => resolve(s), 900); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Input on the field. Before the snap: tap to snap. Passing: drag back like a slingshot and release to throw;
  // tap your QB to run. Running: hold to steer toward your finger, flick up or down to juke.
  const pointer = (e: React.PointerEvent<HTMLCanvasElement>, kind: 'down' | 'move' | 'up') => {
    const s = play.current, el = canvas.current;
    if (!s || !el) return;
    const r = el.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * RES_W, py = ((e.clientY - r.top) / r.height) * RES_H;
    if (kind === 'down') { try { el.setPointerCapture(e.pointerId); } catch { /* */ } }
    if (s.phase === 'pre') { if (kind === 'down') doSnap(); return; }
    if (s.phase === 'live' && s.call === 'pass') {
      if (kind === 'down') {
        if (onSprite(s, s.bodies[s.qb], px, py)) { scramble(s); click(); return; }
        drag.current = { px, py, t: performance.now(), moved: false };
        return;
      }
      if (!drag.current) return;
      const moved = Math.hypot(px - drag.current.px, py - drag.current.py) > 10;
      if (kind === 'move') { if (moved) { drag.current.moved = true; s.aim = aimFrom(s, drag.current, { px, py }); } return; }
      if (drag.current.moved && s.aim) { throwAt(s, s.aim); click(); }
      s.aim = null; drag.current = null;
      return;
    }
    if (s.phase === 'run') {
      if (kind === 'down') { drag.current = { px, py, t: performance.now(), moved: false }; steer(s, fieldY(py)); return; }
      if (kind === 'move' && drag.current) { steer(s, fieldY(py)); return; }
      if (kind === 'up' && drag.current) {
        const dy = py - drag.current.py, fast = performance.now() - drag.current.t < 260;
        if (fast && Math.abs(dy) > 18) { juke(s, dy < 0 ? -1 : 1); click(); }
        else if (fast && Math.abs(dy) < 6) { juke(s); click(); }
        drag.current = null; steer(s, null);
      }
      return;
    }
    if (kind === 'up') { drag.current = null; s.aim = null; }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = play.current;
      if (!s || stage !== 'play') return;
      if (e.key === ' ' && s.phase === 'pre') { e.preventDefault(); doSnap(); return; }
      if (['1', '2', '3', '4'].includes(e.key) && s.phase === 'live' && s.call === 'pass') { const r = receivers(s)[Number(e.key) - 1]; if (r) { throwTo(s, s.bodies.indexOf(r)); click(); } }
      else if (e.key.toLowerCase() === 'q') scramble(s);
      else if (e.key.toLowerCase() === 'd') dive(s);
      else if (e.key === ' ') { e.preventDefault(); juke(s); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const c = s.carrier !== null ? s.bodies[s.carrier] : null; if (c) steer(s, c.y + (e.key === 'ArrowUp' ? -8 : 8)); }
    };
    const onUp = (e: KeyboardEvent) => { if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && play.current) steer(play.current, null); };
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onUp); };
  }, [stage]);

  // Draw a still frame of the formation between plays, so the field never goes blank.
  useEffect(() => {
    if (stage === 'play' || !canvas.current) return;
    const ctx = canvas.current.getContext('2d');
    if (!ctx) return;
    const p = options?.[0] ?? chosen ?? { name: '', call: 'pass' as const, routes: ['go', 'go', 'seam', 'check'] };
    const s = setupPlay(you, opp, stage === 'pat' ? 98 : los, firstAt, p, rng, stage === 'pat');
    draw(ctx, s, 0, false);
  }, [stage, los, firstAt, you, opp, options, chosen, rng]);

  // A fresh set of plays for every down.
  useEffect(() => {
    if ((stage === 'pre' || stage === 'pat') && !options) setOptions(playOptions(rng));
    if (stage === 'play') setOptions(null);
  }, [stage, options, rng]);

  const oppNow = theirs[oppIdx];
  const fg = fgChance(100 - los, you.k);
  const quarter = Math.min(4, Math.floor((poss / (BOWL_DRIVES * 2)) * 4) + 1);

  return (
    <div className="bw" style={{ ['--you' as string]: you.color, ['--opp' as string]: opp.color }}>
      <div className="bw-score" aria-live="polite">
        <span className="bw-side"><span className="bw-chip" style={{ background: you.color }}>{you.abbr}</span><span className="bw-pts num">{pf}</span></span>
        <span className="bw-mid"><span>Q{quarter}</span><span className="muted">Drive {Math.min(drive + 1, BOWL_DRIVES)} of {BOWL_DRIVES}</span></span>
        <span className="bw-side bw-r"><span className="bw-pts num">{pa}</span><span className="bw-chip" style={{ background: opp.color }}>{opp.abbr}</span></span>
      </div>
      <div className="bw-stage">
        <canvas ref={canvas} width={RES_W} height={RES_H} className="bw-canvas" role="img" aria-label={`Field: ${you.abbr} ball, ${ord(down)} and ${Math.max(1, Math.round(firstAt - los))} at ${yardLine(los)}`}
          onPointerDown={(e) => pointer(e, 'down')} onPointerMove={(e) => pointer(e, 'move')} onPointerUp={(e) => pointer(e, 'up')} onPointerLeave={(e) => pointer(e, 'up')} />
        {stage === 'intro' && (
          <div className="bw-over">
            {label && <p className="m-kicker" style={{ color: '#FDE047' }}>{label}</p>}
            <p className="bw-big">{you.city} {you.name}</p>
            <p className="bw-vs">vs {opp.city} {opp.name}</p>
            <p className="muted">{you.qb.name} to {you.targets.map((t) => t.name.split(' ').slice(-1)[0]).join(', ')}. {youFirst ? 'You receive.' : `${opp.abbr} receives.`}</p>
            <button type="button" className="btn btn-primary btn-lg" onClick={begin}>Kick off</button>
          </div>
        )}
        {stage === 'opp' && oppNow && (
          <div className="bw-over bw-oppcard" style={{ ['--tc' as string]: opp.color }}>
            <p className="m-kicker">{opp.abbr} drive {oppIdx + 1}</p>
            <p className="bw-big">{oppNow.points ? `${opp.abbr} ${oppNow.points === 3 ? 'field goal' : 'touchdown'}` : 'Stop.'}</p>
            <p>{oppNow.text}</p>
            <button type="button" className="btn btn-primary" onClick={nextAfterOpp} autoFocus>{poss + 1 >= BOWL_DRIVES * 2 ? 'Final' : poss + 1 === BOWL_DRIVES ? 'Halftime' : 'Your ball'}</button>
          </div>
        )}
        {stage === 'half' && (
          <div className="bw-over"><p className="bw-big">Halftime</p><p className="num">{you.abbr} {pf}, {opp.abbr} {pa}</p><button type="button" className="btn btn-primary" onClick={() => goTo(BOWL_DRIVES)} autoFocus>Second half</button></div>
        )}
        {stage === 'final' && (
          <div className="bw-over"><p className="bw-big">{pf > pa ? 'You win.' : pf < pa ? 'You lose.' : 'A tie.'}</p><p className="num bw-vs">{you.abbr} {pf}, {opp.abbr} {pa}</p>
            {final({ pf, pa, drives: mine, stats: box.current })}</div>
        )}
      </div>
      <div className="bw-bar">
        <p className="bw-dd num">{stage === 'pat' ? 'Try' : `${ord(down)} & ${firstAt >= 100 ? 'Goal' : Math.max(1, Math.round(firstAt - los))}`} · {yardLine(los)}</p>
        <p className="bw-log" aria-live="polite">{log || msg}</p>
      </div>
      <div className="bw-actions">
        {stage === 'pre' && options && <div className="bw-plays" role="group" aria-label="Pick a play">
          {options.map((p) => (
            <button key={p.name} type="button" className={`bw-play bw-${p.call}`} onClick={() => startPlay(p)}>
              <PlayArt p={p} /><span>{p.name}</span><span className="bw-kind">{p.call === 'pass' ? 'Pass' : 'Run'}</span>
            </button>
          ))}
        </div>}
        {stage === 'fourth' && <>
          <button type="button" className="btn btn-primary" onClick={() => setStage('pre')}>Go for it</button>
          <button type="button" className="btn" disabled={fg <= 0} onClick={kickFg}>Field goal ({Math.round(100 - los + 17)} yd, {Math.round(fg * 100)}%)</button>
          <button type="button" className="btn" onClick={() => { setLog('Punt.'); finish(0); }}>Punt</button>
        </>}
        {stage === 'pat' && <>
          <button type="button" className="btn btn-primary" onClick={kickPat}>Kick the extra point</button>
          {options?.slice(0, 1).map((p) => <button key={p.name} type="button" className="btn" onClick={() => startPlay(p, true)}>Go for two: {p.name}</button>)}
          {options?.slice(2, 3).map((p) => <button key={p.name} type="button" className="btn" onClick={() => startPlay(p, true)}>Go for two: {p.name}</button>)}
        </>}
        {stage === 'play' && <>
          {phase === 'pre' && <button type="button" className="btn btn-primary btn-lg" onClick={doSnap}>Snap</button>}
          {phase === 'run' && <button type="button" className="btn" onClick={() => play.current && dive(play.current)}>Dive</button>}
          <p className="hint" style={{ margin: 0 }}>{chosen?.call === 'pass' ? 'Drag back and release to throw (or 1-4). Tap the QB (Q) to run.' : 'Hold above or below the runner to steer (arrows). Flick to juke (Space). Dive (D).'}{two ? ' Two-point try.' : ''}</p>
        </>}
      </div>
    </div>
  );
}

/** A little chalkboard of the play: routes for a pass, the path for a run. */
function PlayArt({ p }: { p: Play }) {
  const paths: Record<string, string> = {
    slant: 'M4 26 L4 22 L14 12', go: 'M4 26 L4 4', out: 'M4 26 L4 16 L0 16', in: 'M4 26 L4 15 L16 15', post: 'M4 26 L4 16 L14 4', corner: 'M4 26 L4 16 L-4 6',
    curl: 'M4 26 L4 14 L6 16', comeback: 'M4 26 L4 12 L0 15', hitch: 'M4 26 L4 19 L5 21', drag: 'M4 26 L6 24 L20 22', dig: 'M4 26 L4 13 L18 13',
    seam: 'M4 26 L5 4', flat: 'M4 26 L2 24 L-6 22', wheel: 'M4 26 L-4 24 L-6 4', swing: 'M4 26 L-2 27 L-8 22', check: 'M4 26 L1 23', stick: 'M4 26 L4 20 L2 20',
  };
  const xs = [8, 52, 38, 26];
  return (
    <svg viewBox="0 0 60 30" width="60" height="30" aria-hidden="true" className="bw-art">
      <line x1="2" y1="27" x2="58" y2="27" stroke="currentColor" strokeOpacity=".35" />
      {p.call === 'pass'
        ? p.routes!.map((r, i) => <path key={i} d={paths[r]} transform={`translate(${xs[i] - 4} 0) scale(${xs[i] > 30 ? -1 : 1} 1) translate(${xs[i] > 30 ? -8 : 0} 0)`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />)
        : <path d={p.run === 'outside' ? 'M30 29 C30 22 44 22 50 8' : p.run === 'counter' ? 'M30 29 L34 24 L22 18 L20 6' : p.run === 'draw' ? 'M30 29 L30 25 L32 6' : 'M30 29 L32 18 L32 5'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray={p.run === 'draw' ? '3 2' : undefined} />}
    </svg>
  );
}
