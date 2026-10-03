'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Reel, usePreloadLogos, type ReelTeam } from './Reel';
import { SoundToggle } from './SoundToggle';
import { PlayerFace } from './PlayerFace';
import { track } from '@/lib/analytics';
import { MLB_ERAS, MLB_GROUPS, MLB_SLOT_NAMES, isPitchSlot, mlbGroupOf, type MlbMode, type MlbSlot } from '@/lib/game/onesixtytwo';
import type { MlbBoardPlayer, MlbState } from '@/lib/server/mlb-game';
import './game.css';

type Mode = 'today' | 'casual';
type Game = MlbState & { token: string; daily: boolean; challenge?: string };
/** A challenge link: the spins are someone else's game, so the setup sheet is skipped. */
export type ChallengeInfo = { id: string; by: string } | null;
const STATE_KEY = 'gl-162-0-game-v1';
const SETUP_KEY = 'gl-162-0-setup';

async function call(body: object) {
  const res = await fetch('/api/mlb/162-0', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'Something went wrong. Try again.'), { status: res.status, data });
  return data;
}

export function OneSixtyTwoGame({ franchises, signedIn, initialMode, modeFromLink = false, nowReady = false, challenge = null }: { franchises: ReelTeam[]; signedIn: boolean; initialMode: Mode; modeFromLink?: boolean; nowReady?: boolean; challenge?: ChallengeInfo }) {
  const router = useRouter();
  usePreloadLogos(franchises);
  const [game, setGame] = useState<Game | null>(null);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [hard, setHard] = useState(false);
  const [spinMode, setSpinMode] = useState<MlbMode>('eras');
  const [sheet, setSheet] = useState(false);
  const [playedId, setPlayedId] = useState<string | null>(null);
  const [spinKey, setSpinKey] = useState(0);
  // A new spin swaps the board for a short placeholder; bring the stage back into view instead of leaving you at the bottom.
  const stageRef = useRef<HTMLElement>(null);
  useEffect(() => { if (spinKey > 1) stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [spinKey]);
  const [eraLanded, setEraLanded] = useState(false);
  const [landed, setLanded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [announce, setAnnounce] = useState('');
  const [selected, setSelected] = useState<MlbSlot | null>(null);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (challenge) return; // a challenge link starts below, once its function exists
    let resumeMode = initialMode;
    try { const s = JSON.parse(localStorage.getItem(SETUP_KEY) ?? '{}'); if (!modeFromLink && (s.mode === 'casual' || (s.mode === 'today' && signedIn))) { resumeMode = s.mode; setMode(s.mode); } if (typeof s.hard === 'boolean') setHard(s.hard); if (s.spin === 'now' && nowReady) setSpinMode('now'); } catch { /* storage blocked */ }
    try {
      const g = JSON.parse(sessionStorage.getItem(STATE_KEY) ?? 'null') as Game | null;
      if (g?.sessionId && g.daily === (resumeMode === 'today')) { setGame(g); setEraLanded(true); setLanded(true); return; }
    } catch { /* ignore */ }
    setSheet(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { try { if (game) sessionStorage.setItem(STATE_KEY, JSON.stringify(game)); } catch {} }, [game]);

  function spun(next: Game) { setGame(next); setEraLanded(false); setLanded(false); setQuery(''); setExpanded(new Set()); setSpinKey((k) => k + 1); }

  async function startChallenge(id: string) {
    setBusy('start'); setError(''); setGame(null);
    try { sessionStorage.removeItem(STATE_KEY); } catch {}
    try {
      const d = await call({ action: 'start', challenge: id });
      spun({ ...d, challenge: id });
      track('game_started', { game: '162-0', daily: false, challenge: true });
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  useEffect(() => {
    if (!challenge) return;
    try {
      const g = JSON.parse(sessionStorage.getItem(STATE_KEY) ?? 'null') as Game | null;
      if (g?.sessionId && g.challenge === challenge.id) { setGame(g); setEraLanded(true); setLanded(true); return; }
    } catch { /* ignore */ }
    void startChallenge(challenge.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setBusy('start'); setError(''); setSheet(false); setGame(null);
    try { sessionStorage.removeItem(STATE_KEY); localStorage.setItem(SETUP_KEY, JSON.stringify({ mode, hard, spin: spinMode })); } catch {}
    try {
      const d = await call({ action: 'start', daily: mode === 'today', hard, mode: mode === 'today' ? 'eras' : spinMode });
      spun(d);
      track('game_started', { game: '162-0', daily: mode === 'today', hard });
    } catch (e) {
      const err = e as Error & { status?: number; data?: { resultId?: string } };
      if (err.status === 409 && err.data?.resultId) { setPlayedId(err.data.resultId); setSheet(true); } else setError(err.message);
    } finally { setBusy(null); }
  }

  async function act(body: object, label: string, respin = false) {
    if (!game) return;
    setBusy(label); setError('');
    try {
      const d = await call({ ...body, sessionId: game.sessionId, token: game.token });
      const next = { ...game, ...d } as Game;
      if (respin || (d.index !== game.index && !d.done)) spun(next); else setGame(next);
      return next;
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  async function pick(p: MlbBoardPlayer) {
    const d = await act({ action: 'pick', playerId: p.id }, 'pick');
    if (d) setAnnounce(`${p.name} drafted. ${d.done ? 'Roster complete.' : 'Next spin.'}`);
  }

  async function tapSlot(slot: MlbSlot) {
    if (!game) return;
    const has = game.roster.find((r) => r.slot === slot)?.pick;
    if (!selected) { if (has) { setSelected(slot); setAnnounce(`${has.name} selected. Choose a spot to move him to.`); } return; }
    if (selected === slot) { setSelected(null); return; }
    if (isPitchSlot(selected) !== isPitchSlot(slot)) { setSelected(null); setError('Hitters and pitchers cannot swap.'); return; }
    const from = selected; setSelected(null);
    const d = await act({ action: 'move', from, to: slot }, 'move');
    if (d) setAnnounce(`Moved to ${MLB_SLOT_NAMES[slot]}.`);
  }

  async function grade() {
    if (!game) return;
    setBusy('grade'); setError('');
    try {
      const d = await call({ action: 'grade', sessionId: game.sessionId, token: game.token });
      track('game_completed', { game: '162-0', wins: d.result.wins, daily: game.daily });
      try { sessionStorage.removeItem(STATE_KEY); } catch {}
      router.push(`/results/${d.id}`);
    } catch (e) { setError((e as Error).message); setBusy(null); }
  }

  const setupSheet = sheet && (
    <div className="sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget && game) setSheet(false); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="mlb-setup-h">
        <div className="sheet-grip" aria-hidden="true" />
        <h2 id="mlb-setup-h" className="sheet-h">Game setup</h2>
        <Choice label="Mode" name="mode" value={mode} onChange={(v) => setMode(v as Mode)} options={[{ v: 'today', t: 'Today', d: 'Ranked, one try' }, { v: 'casual', t: 'Casual', d: 'Unlimited' }]} />
        <Choice label="Spin" name="spin" value={mode === 'today' ? 'eras' : spinMode} disabled={mode === 'today'} onChange={(v) => setSpinMode(v as MlbMode)}
          options={[{ v: 'eras', t: 'Eras', d: 'An era since 1970, then a team' }, { v: 'now', t: 'Right now', d: nowReady ? 'This season, just the team' : 'Opens a few weeks into the season', off: !nowReady }]} />
        <Choice label="Difficulty" name="hard" value={hard ? 'hard' : 'easy'} onChange={(v) => setHard(v === 'hard')}
          options={[{ v: 'easy', t: 'Easy', d: 'Stats shown, 2 era and 2 team re-spins' }, { v: 'hard', t: 'Hard', d: 'Type names, no stats, no re-spins' }]} />
        {mode === 'today' && !signedIn && <p className="hint">Today is ranked and needs an account. <a href="/login?next=/games/162-0">Sign in</a> or <a href="/register?next=/games/162-0">create one</a>.</p>}
        {mode === 'today' && playedId && <p className="hint">You already played Today. <a href={`/results/${playedId}`}>See your result</a>. A new board drops at midnight ET.</p>}
        <div className="sheet-actions">
          {game && <button type="button" className="btn btn-lg" onClick={() => setSheet(false)}>Cancel</button>}
          <button type="button" className="btn btn-primary btn-lg" disabled={!!busy || (mode === 'today' && (!signedIn || !!playedId))} onClick={start}>Start</button>
        </div>
      </div>
    </div>
  );

  if (!game) {
    return (
      <div className="g-wrap">
        <header className="g-head">
          <h1 className="g-kicker" style={{ margin: 0 }}>162-0 · {mode === 'today' ? 'Today, ranked' : 'Casual'}{mode !== 'today' && spinMode === 'now' ? ' · Right now' : ''}{hard ? ' · Hard' : ''}</h1>
          <button type="button" className="btn btn-sm" onClick={() => setSheet(true)}>Game setup</button>
        </header>
        {error ? <section className="g-done"><p role="alert" className="field-error">{error}</p><button className="btn btn-primary" onClick={() => setSheet(true)}>Try again</button></section> : (
          <section className="g-intro" style={{ maxWidth: 'none', paddingTop: 16 }}>
            <h2 className="g-title">Spin an era.<br />Spin a team. Go <span style={{ whiteSpace: 'nowrap' }}>162-0.</span></h2>
            <p className="g-lede">Eleven spins, each an era since 1970 and then a franchise. Fill a lineup, a starter and a closer, each graded on his real season against that year&apos;s league, and move hitters around the field before Opening Day.</p>
            <button className="btn btn-primary btn-lg" onClick={() => setSheet(true)} disabled={busy === 'start'}>{busy === 'start' ? 'Spinning' : 'Set up a game'}</button>
          </section>
        )}
        {setupSheet}
      </div>
    );
  }

  const team = game.team;
  const target: ReelTeam | null = team ? { id: team.id, abbreviation: team.abbreviation, city: team.location, name: team.name, color: team.color, logoUrl: team.logoUrl } : null;
  const norm = (x: string) => x.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '');
  const q = norm(query).trim();
  const openBat = game.roster.some((r) => !r.pick && !isPitchSlot(r.slot));
  const openPitch = game.roster.some((r) => !r.pick && isPitchSlot(r.slot));
  const taken = new Set(game.roster.filter((r) => r.pick).map((r) => r.slot));
  // Same rule as the server: his own spot or DH. If nobody here fits an open spot, anyone may play out of position.
  const stuck = !!team && !team.players.some((x) => x.fits.some((f) => !taken.has(f)));
  const canTake = (p: MlbBoardPlayer) => (stuck ? (p.kind === 'bat' ? openBat : openPitch) : p.fits.some((f) => !taken.has(f)));
  const hardList = team && game.hard && q.length >= 1 ? team.players.filter((p) => norm(p.name).split(' ').some((w) => w.startsWith(q.split(' ')[0])) && norm(p.name).includes(q)).slice(0, 6) : [];
  const groups = team && !game.hard ? MLB_GROUPS.map((g) => {
    const all = team.players.filter((p) => mlbGroupOf(p.position, p.kind) === g.key).sort((a, b) => Number(canTake(b)) - Number(canTake(a)) || b.value - a.value);
    return { ...g, all, open: all.some(canTake) };
  }).filter((g) => g.all.length).sort((a, b) => Number(b.open) - Number(a.open)) : [];
  const row = (p: MlbBoardPlayer) => {
    const ok = canTake(p);
    const why = ok ? '' : `${p.fits.join(' and ')} filled`;
    return (
      <li key={p.id}>
        <button type="button" className="g-player" onClick={() => pick(p)} disabled={!!busy || !ok} title={why || undefined}
          aria-label={`Draft ${p.name}, ${p.position}, ${p.season}${p.value >= 0 ? `, ${p.line}, value ${p.value.toFixed(0)}` : ''}${why ? `, ${why}` : ''}`}>
          <PlayerFace name={p.name} src={p.headshot} color={team!.color} size={44} />
          <span className="g-player-name">{p.name}<span className="g-player-pos">{p.position} · {p.season}{p.value >= 0 && <> · {p.line}</>}{why && <span className="g-filled"> · {why}</span>}</span></span>
          <span className="g-ovr num" aria-hidden="true">{p.value >= 0 ? p.value.toFixed(0) : '??'}</span>
        </button>
      </li>
    );
  };

  return (
    <div className="g-wrap g-board">
      <div aria-live="polite" className="sr-only">{announce}</div>
      <div className="g-main">
        <header className="g-head">
          <div>
            <h1 className="g-kicker" style={{ margin: 0 }}>162-0 · {game.daily ? 'Today, ranked' : 'Casual'}{game.mode === 'now' ? ' · Right now' : ''}{game.hard ? ' · Hard' : ''} · {game.done ? 'Draft complete' : `Spin ${game.index + 1} of ${game.total}`}</h1>
            {game.challenge && challenge && <p className="g-challenge">Challenge · same spins as {challenge.by}</p>}
            <div className="g-progress" role="progressbar" aria-valuemin={0} aria-valuemax={game.total} aria-valuenow={game.index} aria-label="Picks made">
              {Array.from({ length: game.total }, (_, i) => <span key={i} className={i < game.index ? 'on' : i === game.index ? 'now' : ''} />)}
            </div>
          </div>
          <div className="row"><button type="button" className="btn btn-sm" onClick={() => { if (game.index > 0 && !game.done && !window.confirm('Changing the setup starts a new game. Continue?')) return; setSheet(true); }}>Game setup</button><SoundToggle /></div>
        </header>

        {error && <div role="alert" className="card card-error">{error}</div>}

        {team && target ? (
          <section ref={stageRef} className="g-stage" aria-labelledby="mlb-clock">
            <div className="g-team">
              {game.mode === 'now' ? <p className="g-kicker" style={{ margin: 0 }}>Right now · {team.eraLabel} season</p> : <EraSpin spinKey={`${game.sessionId}-${spinKey}`} target={team.eraLabel} onLand={() => setEraLanded(true)} />}
              {(eraLanded || game.mode === 'now') && <Reel pool={franchises.length ? franchises : [target]} target={target} spinKey={`${game.sessionId}-${spinKey}`} onLand={() => { setLanded(true); setAnnounce(`${team.eraLabel} ${team.location} ${team.name} on the clock`); }} />}
              <div className="g-spin-status" aria-live="polite">
                <p className="g-kicker" style={{ margin: 0 }} id="mlb-clock">{landed ? `Pick one ${team.eraLabel} ${team.name} player` : 'Spinning'}</p>
                {game.hard ? <span className="g-kicker" style={{ margin: 0 }}>No re-spins</span> : (
                  <div className="row" style={{ gap: 8 }}>
                    {game.mode !== 'now' && <button type="button" className="btn btn-sm" disabled={!landed || !!busy || game.eraRespinsLeft <= 0} onClick={() => act({ action: 'respin', what: 'era' }, 'respin', true)}>New era <span className="num">{game.eraRespinsLeft}</span></button>}
                    <button type="button" className="btn btn-sm" disabled={!landed || !!busy || game.teamRespinsLeft <= 0} onClick={() => act({ action: 'respin', what: 'team' }, 'respin', true)}>New team <span className="num">{game.teamRespinsLeft}</span></button>
                  </div>
                )}
              </div>
            </div>
            {!landed ? <div className="g-roster-wait" aria-hidden="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 14 }} />)}</div> : (
              <div className="g-roster in">
                {game.hard && (
                  <>
                    <label htmlFor="mlb-q" className="g-group-h" style={{ display: 'block' }}>Name a {team.eraLabel} {team.name} player</label>
                    <input id="mlb-q" type="search" autoComplete="off" autoFocus placeholder={`Type a ${team.name} player's name`} value={query} onChange={(e) => setQuery(e.target.value)} />
                    <p className="hint" aria-live="polite">{q.length < 1 ? 'Type a letter to start. Stats stay hidden until the season is played.' : hardList.length ? `${hardList.length} match${hardList.length === 1 ? '' : 'es'}` : `No ${team.name} player by that name in this era.`}</p>
                  </>
                )}
                {stuck && <p className="hint">Nobody here fits an open spot, so anyone can play out of position this round.</p>}
                {game.hard ? <ul className="g-list">{hardList.map(row)}</ul> : groups.map((g) => {
                  const more = expanded.has(g.key);
                  return (
                    <div key={g.key} className={`g-group${g.open ? '' : ' g-group-done'}`}>
                      <h3 className="g-group-h">{g.label}{!g.open && <span className="g-filled"> · filled</span>}</h3>
                      <ul className="g-list">{(more ? g.all : g.all.slice(0, g.open ? 3 : 1)).map(row)}</ul>
                      {g.all.length > (g.open ? 3 : 1) && <button type="button" className="btn-link g-more" onClick={() => setExpanded((e) => { const n = new Set(e); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })}>{more ? 'Show fewer' : `Show all ${g.all.length}`}</button>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="g-done">
            <p className="g-kicker">Roster complete</p>
            <h2 className="g-title g-title-sm">Set your lineup, then play ball.</h2>
            <p className="g-lede" style={{ marginTop: 0 }}>Tap a hitter, then another spot to move him. Out of position costs value. Pitchers stay on the mound.</p>
            <button className="btn btn-primary btn-lg" onClick={grade} disabled={!!busy}>{busy === 'grade' ? 'Playing 162 games' : 'Play the season'}</button>
          </section>
        )}
      </div>

      <aside className="g-side" aria-label="Your lineup">
        <div className="g-side-inner">
          <p className="g-kicker">Your lineup</p>
          <p className="hint" style={{ marginTop: 0 }}>Tap a hitter, then a spot, to move him.</p>
          <ol className="g-slots nba-slots mlb-slots">
            {game.roster.map(({ slot, pick: p }) => (
              <li key={slot} className={`${p ? 'filled' : ''}${selected === slot ? ' sel' : ''}`}>
                <button type="button" className="nba-slot" onClick={() => tapSlot(slot)} disabled={!!busy || (!p && !selected)} aria-pressed={selected === slot}
                  aria-label={p ? `${slot}: ${p.name}${p.fit < 1 ? ', out of position' : ''}. ${selected ? 'Move here' : 'Select to move'}` : `${slot}: open${selected ? '. Move here' : ''}`}>
                  <span className="g-slot-k">{slot}</span>
                  {p ? (
                    <span className="g-slot-v">
                      {p.logoUrl ? <img src={p.logoUrl} alt="" width={22} height={22} /> : <span className="g-dot" style={{ background: p.teamColor }} />}
                      <span className="g-slot-name">{p.name}</span>
                      {p.fit < 1 && <span className="nba-oop">−{Math.round((1 - p.fit) * 100)}%</span>}
                      <span className="num g-slot-ovr">{p.value >= 0 ? p.value.toFixed(0) : ''}</span>
                    </span>
                  ) : <span className="g-slot-empty">Open</span>}
                </button>
              </li>
            ))}
          </ol>
          {game.done && <button className="btn btn-primary g-side-cta" onClick={grade} disabled={!!busy}>{busy === 'grade' ? 'Playing' : 'Play the season'}</button>}
          <button className="btn-link g-reset" onClick={() => setSheet(true)}>Start over</button>
        </div>
      </aside>
      {setupSheet}
    </div>
  );
}

/** Flicks through the eras and lands on the one the server drew, then hands over to the team reel. */
function EraSpin({ spinKey, target, onLand }: { spinKey: string; target: string; onLand: () => void }) {
  const [shown, setShown] = useState(target);
  const [done, setDone] = useState(false);
  const landRef = useRef(onLand);
  landRef.current = onLand;
  useEffect(() => {
    setDone(false);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const steps = reduce ? 3 : 12;
    let i = 0;
    const id = setInterval(() => {
      i++;
      if (i >= steps) { clearInterval(id); setShown(target); setDone(true); landRef.current(); return; }
      setShown(MLB_ERAS[i % MLB_ERAS.length].label);
    }, reduce ? 120 : 70);
    return () => clearInterval(id);
  }, [spinKey, target]);
  return (
    <div className={`nba-era${done ? ' in' : ''}`} aria-hidden="true">
      <span className="nba-era-k">Era</span>
      <span className="nba-era-v num">{shown}</span>
    </div>
  );
}

function Choice({ label, name, value, options, onChange, disabled }: { label: string; name: string; value: string; options: { v: string; t: string; d: string; off?: boolean }[]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <fieldset className="sheet-row" disabled={disabled}>
      <legend className="sheet-label">{label}</legend>
      <div className="sheet-seg">
        {options.map((o) => (
          <label key={o.v} className={`sheet-opt${value === o.v ? ' on' : ''}${o.off ? ' off' : ''}`}>
            <input type="radio" name={name} value={o.v} checked={value === o.v} disabled={o.off} onChange={() => onChange(o.v)} />
            <strong>{o.t}</strong><span>{o.d}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
