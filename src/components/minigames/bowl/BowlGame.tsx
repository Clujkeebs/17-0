'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { BOWL_DRIVES, fgChance, type BowlTeam, type OppDrive } from '@/lib/game/bowl';
import { createRng } from '@/lib/game/prng';
import { RES_H, RES_W, draw, juke, playStats, receivers, scramble, setupPlay, snap, step, throwTo, toField, type PlayCall, type PlayState, type StatLine } from './engine';
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
  const [call, setCall] = useState<PlayCall>('pass');
  const pf = mine.reduce((s, x) => s + x, 0);
  const pa = theirs.slice(0, oppIdx).reduce((s, d) => s + d.points, 0);

  const isYours = (i: number) => (i % 2 === 0) === youFirst;
  const goTo = (i: number) => {
    setPoss(i);
    if (i >= BOWL_DRIVES * 2) { setStage('final'); return; }
    if (isYours(i)) { setLos(25); setFirstAt(35); setDown(1); setLog(''); setMsg(''); setStage('pre'); } else setStage('opp');
  };
  const advance = (next: number) => { if (next === BOWL_DRIVES) { setPoss(next); setStage('half'); } else goTo(next); };

  const afterYourDrive = (points: number) => {
    onDrive?.(mine.length, points);
    setMine((m) => [...m, points]);
    advance(poss + 1);
  };

  const nextAfterOpp = () => { setOppIdx((n) => n + 1); advance(poss + 1); };

  const begin = () => { click(); goTo(0); };

  const startPlay = (c: PlayCall, two = false) => {
    click(); setCall(c);
    play.current = setupPlay(you, opp, two ? 98 : los, two ? 100 : firstAt, c, rng, two);
    setStage('play'); setMsg(c === 'pass' ? 'Tap a receiver (1, 2, 3) to throw. Tap your QB to run.' : 'Hold above or below your runner to steer. Tap him to juke.');
    window.setTimeout(() => { if (play.current) snap(play.current); }, 450);
  };

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
    let raf = 0, last = performance.now(), frame = 0, done = false;
    const tick = (now: number) => {
      const s = play.current;
      if (!s || !ctx) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; frame++;
      step(s, dt);
      draw(ctx, s, frame, s.phase === 'pre');
      if (s.phase === 'dead' && !done) { done = true; window.setTimeout(() => resolve(s), 900); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Input on the field: tap a receiver to throw, the QB to scramble, the runner to juke; hold to steer.
  const pointer = (e: React.PointerEvent<HTMLCanvasElement>, kind: 'down' | 'move' | 'up') => {
    const s = play.current, el = canvas.current;
    if (!s || !el) return;
    const r = el.getBoundingClientRect();
    const at = toField(s, ((e.clientX - r.left) / r.width) * RES_W, ((e.clientY - r.top) / r.height) * RES_H);
    if (kind === 'up') { s.steerY = null; return; }
    if (s.phase === 'run') {
      const c = s.bodies[s.carrier!];
      if (kind === 'down' && Math.hypot(at.x - c.x, at.y - c.y) < 2.5) { juke(s); click(); return; }
      if (kind === 'down' || e.buttons) s.steerY = at.y;
      return;
    }
    if (kind !== 'down' || s.phase !== 'live') return;
    const qb = s.bodies[s.qb];
    if (Math.hypot(at.x - qb.x, at.y - qb.y) < 2.2) { scramble(s); return; }
    if (s.call !== 'pass') return;
    const rs = receivers(s).map((b) => ({ b, d: Math.hypot(at.x - b.x, at.y - b.y) })).sort((x, y) => x.d - y.d);
    if (rs[0] && rs[0].d < 5) { throwTo(s, s.bodies.indexOf(rs[0].b)); click(); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = play.current;
      if (!s || stage !== 'play') return;
      if (['1', '2', '3'].includes(e.key) && s.phase === 'live' && s.call === 'pass') { const r = receivers(s)[Number(e.key) - 1]; if (r) { throwTo(s, s.bodies.indexOf(r)); click(); } }
      else if (e.key.toLowerCase() === 'q') scramble(s);
      else if (e.key === ' ') { e.preventDefault(); juke(s); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const c = s.carrier !== null ? s.bodies[s.carrier] : null; if (c) s.steerY = c.y + (e.key === 'ArrowUp' ? -6 : 6); }
    };
    const onUp = (e: KeyboardEvent) => { if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && play.current) play.current.steerY = null; };
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onUp); };
  }, [stage]);

  // Draw a still frame of the formation between plays, so the field never goes blank.
  useEffect(() => {
    if (stage === 'play' || !canvas.current) return;
    const ctx = canvas.current.getContext('2d');
    if (!ctx) return;
    const s = setupPlay(you, opp, los, firstAt, call, rng);
    draw(ctx, s, 0, false);
  }, [stage, los, firstAt, you, opp, call, rng]);

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
        {stage === 'pre' && <>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => startPlay('pass')}>Pass</button>
          <button type="button" className="btn btn-lg" onClick={() => startPlay('run')}>Run ({you.rb.name.split(' ').slice(-1)[0]})</button>
        </>}
        {stage === 'fourth' && <>
          <button type="button" className="btn btn-primary" onClick={() => setStage('pre')}>Go for it</button>
          <button type="button" className="btn" disabled={fg <= 0} onClick={kickFg}>Field goal ({Math.round(100 - los + 17)} yd, {Math.round(fg * 100)}%)</button>
          <button type="button" className="btn" onClick={() => { setLog('Punt.'); finish(0); }}>Punt</button>
        </>}
        {stage === 'pat' && <>
          <button type="button" className="btn btn-primary" onClick={kickPat}>Kick the extra point</button>
          <button type="button" className="btn" onClick={() => startPlay('pass', true)}>Go for two (pass)</button>
          <button type="button" className="btn" onClick={() => startPlay('run', true)}>Go for two (run)</button>
        </>}
        {stage === 'play' && <p className="hint" style={{ margin: 0 }}>{call === 'pass' ? 'Tap a numbered receiver or press 1, 2, 3. Tap the QB (or Q) to scramble.' : 'Steer with a finger above or below the runner, or the arrow keys. Tap him or press Space to juke.'}</p>}
      </div>
    </div>
  );
}
