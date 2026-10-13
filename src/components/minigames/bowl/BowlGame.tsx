'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { BOWL_DRIVES, fgChance, simMyDrives, type BowlTeam, type OppDrive } from '@/lib/game/bowl';
import { createRng } from '@/lib/game/prng';
import { CATS, CAT_LABELS, PLAYBOOK, RES_H, RES_W, ROUTES, aimFrom, dive, draw, fieldY, juke, magnetAim, onSprite, playOptions, playStats, receiverAtPoint, receivers, scramble, setupPlay, snap, steer, step, throwAt, throwTo, type Play, type PlayState, type StatLine } from './engine';
import { click, swell, thud } from '@/components/game/sound';
import '../bowl.css';

export interface GameOver { pf: number; pa: number; drives: number[]; stats: Record<string, StatLine> }

type Stage = 'intro' | 'pre' | 'play' | 'result' | 'fourth' | 'pat' | 'kick' | 'opp' | 'half' | 'final';
const yardLine = (los: number) => (los === 50 ? '50' : los < 50 ? `OWN ${Math.round(los)}` : `OPP ${Math.round(100 - los)}`);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
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
  const [book, setBook] = useState(false);
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

  /**
   * Quick sim: your remaining drives are simulated from the two rosters (a notch below what a good player gets), the
   * other team's are the ones already fixed, and the game goes straight to the final. Each simulated drive is
   * reported like a played one, so Today records it the same way.
   */
  const simRest = (ask = true) => {
    if (ask && !window.confirm(drive === 0 ? 'Sim the whole game? Your six drives are played out for you from the ratings.' : 'Sim the rest of the game? Your remaining drives are played out for you from the ratings.')) return;
    click();
    const rest = simMyDrives(rng, you, opp).slice(drive);
    rest.forEach((d, k) => {
      onDrive?.(drive + k, d.points);
      for (const [n, l] of Object.entries(d.stats)) { const c = (box.current[n] ??= {}); for (const [key, v] of Object.entries(l)) c[key as keyof StatLine] = (c[key as keyof StatLine] ?? 0) + (v ?? 0); }
    });
    setMine((m) => [...m, ...rest.map((d) => d.points)]);
    setOppIdx(BOWL_DRIVES); setPoss(BOWL_DRIVES * 2); setBook(false);
    setLog(`Simmed: ${rest.map((d) => d.text).slice(-1)[0] ?? ''}`); setMsg('Quick sim.');
    setStage('final');
  };

  /** Pick a play: it lines up with its routes drawn; a tap on the field (or Space) snaps it. */
  const startPlay = (p: Play, isTwo = false) => {
    click(); setChosen(p); setTwo(isTwo);
    play.current = setupPlay(you, opp, isTwo ? 98 : los, isTwo ? 100 : firstAt, p, rng, isTwo);
    setStage('play');
    setMsg(p.call === 'pass' ? 'Tap the field to snap. Then tap a receiver to throw to him. Green rings are open.' : 'Tap the field to snap. Hold above or below the runner to steer.');
  };
  const doSnap = () => { const s = play.current; if (s && s.phase === 'pre') { snap(s); click(); setMsg(s.call === 'pass' ? 'Tap a receiver to throw. Green is open, red is covered. Tap your QB to run.' : 'Steer: hold above or below the runner. Swipe to juke. Dive at the line.'); } };

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

  const clamp01 = (v: number) => Math.max(0, Math.min(0.99, v));
  const finish = (points: number) => { window.setTimeout(() => afterYourDrive(points), points ? 600 : 300); setStage('result'); };

  const kickFg = () => { setStage('kick'); setLog(`${you.k.name} lines up from ${Math.round(100 - los + 17)} yards. Tap when the marker is in the green.`); };
  /** The kick is struck: a clean strike keeps the kicker's odds (and a bit more), a mistimed one costs them. */
  const onStrike = (q: 'clean' | 'ok' | 'poor') => {
    const p = clamp01(fgChance(100 - los, you.k) * (q === 'clean' ? 1.12 : q === 'ok' ? 0.92 : 0.55));
    const ok = rng() < p, yd = Math.round(100 - los + 17);
    setLog(`${q === 'clean' ? 'Clean strike. ' : q === 'poor' ? 'Mishit. ' : ''}${ok ? `It is good from ${yd}.` : `No good from ${yd}.`}`);
    if (ok) swell(); else thud();
    window.setTimeout(() => finish(ok ? 3 : 0), 900);
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
        // Tap a receiver and the ball goes to him, led the way a QB would. Pulling back from anywhere else is still the slingshot.
        const hit = receiverAtPoint(s, px, py);
        if (hit !== null) { throwTo(s, hit); click(); return; }
        drag.current = { px, py, t: performance.now(), moved: false };
        return;
      }
      if (!drag.current) return;
      const moved = Math.hypot(px - drag.current.px, py - drag.current.py) > 10;
      // A drag that points near a receiver locks onto him (a ring shows who), so it only has to be close.
      if (kind === 'move') { if (moved) { drag.current.moved = true; const m = magnetAim(s, aimFrom(s, drag.current, { px, py })); s.aim = m.at; s.aimTarget = m.target; } return; }
      if (drag.current.moved && s.aim) { if (s.aimTarget !== null) throwTo(s, s.aimTarget); else throwAt(s, s.aim); click(); }
      s.aim = null; s.aimTarget = null; drag.current = null;
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
            <div className="bw-intro-actions">
              <button type="button" className="btn btn-primary btn-lg" onClick={begin}>Kick off</button>
              <button type="button" className="btn btn-lg" onClick={() => simRest(false)}>Quick sim</button>
            </div>
            <p className="bw-fine">Quick sim plays your six drives for you from the ratings.</p>
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
        {stage === 'kick' && <KickMeter acc={you.k.acc} onStrike={onStrike} />}
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
        {stage === 'pre' && options && <div className="bw-more">
          <button type="button" className="btn btn-sm" aria-expanded={book} onClick={() => setBook((b) => !b)}>{book ? 'Hide playbook' : 'Playbook'}</button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => simRest()}>Sim the rest</button>
        </div>}
        {stage === 'pre' && book && <div className="bw-book" role="group" aria-label="Playbook">
          {CATS.map((cat) => (
            <section key={cat}>
              <h3 className="bw-book-h">{CAT_LABELS[cat]}</h3>
              <div className="bw-book-grid">
                {PLAYBOOK.filter((p) => p.cat === cat).map((p) => (
                  <button key={p.name} type="button" className={`bw-play bw-${p.call}`} onClick={() => { setBook(false); startPlay(p.call === 'run' ? { ...p, side: rng() < 0.5 ? 1 : -1 } : p); }}>
                    <PlayArt p={p} /><span>{p.name}</span>
                  </button>
                ))}
              </div>
            </section>
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
          {phase === 'pre' &&  <button type="button" className="btn btn-primary btn-lg" onClick={doSnap}>Snap</button>}
          {phase === 'run' && <button type="button" className="btn" onClick={() => play.current && dive(play.current)}>Dive</button>}
          <p className="hint" style={{ margin: 0 }}>{chosen?.call === 'pass' ? 'Tap a receiver to throw (or press 1 to 4). Or pull back and let go: it locks onto whoever you point at. Tap the QB (Q) to run.' : 'Hold above or below the runner to steer (arrows). Flick to juke (Space). Dive (D).'}{two ? ' Two-point try.' : ''}</p>
        </>}
      </div>
    </div>
  );
}

/** A little chalkboard of the play, drawn from the same route shapes the engine runs: routes for a pass, the path for a run. */
function PlayArt({ p }: { p: Play }) {
  // Where WR1, WR2, the tight end and the back line up across the card, and which way "toward the middle" points for each.
  const spots: { x: number; toward: 1 | -1 }[] = [{ x: 8, toward: 1 }, { x: 52, toward: -1 }, { x: 40, toward: -1 }, { x: 30, toward: 1 }];
  const K = 0.62;
  const route = (r: string, i: number) => {
    const o = spots[i], pts = ROUTES[r] ?? [];
    return [`M${o.x} 27`, ...pts.map((q) => `L${Math.max(2, Math.min(58, o.x + q.y * o.toward * K)).toFixed(1)} ${Math.max(2, 27 - q.x * K).toFixed(1)}`)].join(' ');
  };
  const runPath = p.run === 'outside' ? 'M30 29 C30 22 44 22 50 8' : p.run === 'toss' ? 'M30 29 C34 27 48 27 54 9' : p.run === 'counter' ? 'M30 29 L34 24 L22 18 L20 6' : p.run === 'draw' ? 'M30 29 L30 25 L32 6' : p.run === 'power' ? 'M30 29 L33 18 L33 4' : 'M30 29 L32 18 L32 5';
  return (
    <svg viewBox="0 0 60 30" width="72" height="36" aria-hidden="true" className="bw-art">
      <line x1="2" y1="27" x2="58" y2="27" stroke="currentColor" strokeOpacity=".35" />
      {p.call === 'pass'
        ? p.routes!.map((r, i) => <path key={i} d={route(r, i)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />)
        : <path d={runPath} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray={p.run === 'draw' ? '3 2' : undefined} />}
    </svg>
  );
}

/**
 * The field goal as a timing meter: a marker sweeps back and forth, tap (or press Space) to kick. Dead center is a
 * clean strike; the green and yellow bands are wider for an accurate kicker.
 */
function KickMeter({ acc, onStrike }: { acc: number; onStrike: (q: 'clean' | 'ok' | 'poor') => void }) {
  const marker = useRef<HTMLSpanElement>(null);
  const pos = useRef(0);
  const done = useRef(false);
  const green = 0.06 + (clamp(acc, 40, 99) - 60) / 700, yellow = green * 2.4;
  const [result, setResult] = useState<'clean' | 'ok' | 'poor' | null>(null);
  const strike = useCallback(() => {
    if (done.current) return;
    done.current = true;
    const off = Math.abs(pos.current - 0.5);
    const q = off <= green ? 'clean' : off <= yellow ? 'ok' : 'poor';
    setResult(q); onStrike(q);
  }, [green, yellow, onStrike]);
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const tick = (now: number) => {
      if (!done.current) { pos.current = (Math.sin(((now - t0) / 1000) * 3.4 - Math.PI / 2) + 1) / 2; if (marker.current) marker.current.style.left = `${pos.current * 100}%`; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onKey = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); strike(); } };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); };
  }, [strike]);
  return (
    <div className="bw-over bw-kick">
      <p className="m-kicker">Field goal</p>
      <div className="bw-meter" role="img" aria-label="Kick meter: tap when the marker is in the green band at the center">
        <span className="bw-band bw-yellow" style={{ left: `${(0.5 - yellow) * 100}%`, width: `${yellow * 200}%` }} />
        <span className="bw-band bw-green" style={{ left: `${(0.5 - green) * 100}%`, width: `${green * 200}%` }} />
        <span ref={marker} className="bw-marker" />
      </div>
      <button type="button" className="btn btn-primary btn-lg" onClick={strike} disabled={result !== null} autoFocus>{result ? (result === 'clean' ? 'Clean strike' : result === 'ok' ? 'Decent strike' : 'Mishit') : 'Kick'}</button>
    </div>
  );
}
