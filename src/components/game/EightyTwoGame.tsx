'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EraReel, Reel, usePreloadLogos, type ReelTeam } from './Reel';
import { SoundToggle } from './SoundToggle';
import { PlayerFace } from './PlayerFace';
import { track } from '@/lib/analytics';
import { ERAS, NBA_SLOT_NAMES, type NbaSlot } from '@/lib/game/eightytwo';
import type { NbaBoardPlayer, NbaState } from '@/lib/server/nba-game';
import './game.css';

type Mode = 'today' | 'casual';
type Game = NbaState & { token: string; daily: boolean; challenge?: string };
/** A challenge link: the spins are someone else's game, so the setup sheet is skipped. */
export type ChallengeInfo = { id: string; by: string } | null;
const STATE_KEY = 'gl-82-0-game-v1';
const SETUP_KEY = 'gl-82-0-setup';

async function call(body: object) {
  const res = await fetch('/api/nba/82-0', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'Something went wrong. Try again.'), { status: res.status, data });
  return data;
}

const stat = (n: number) => (n >= 0 ? n.toFixed(1) : '');

export function EightyTwoGame({ franchises, signedIn, playedTodayId = null, initialMode, modeFromLink = false, standardReady = false, challenge = null }: { franchises: ReelTeam[]; signedIn: boolean; playedTodayId?: string | null; initialMode: Mode; modeFromLink?: boolean; standardReady?: boolean; challenge?: ChallengeInfo }) {
  const router = useRouter();
  usePreloadLogos(franchises);
  const [game, setGame] = useState<Game | null>(null);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [hard, setHard] = useState(false);
  const [edition, setEdition] = useState<'classic' | 'standard'>('classic');
  const [sheet, setSheet] = useState(false);
  const [playedId, setPlayedId] = useState<string | null>(playedTodayId);
  const [spinKey, setSpinKey] = useState(0);
  // A new spin swaps the board for a short placeholder; bring the stage back into view instead of leaving you at the bottom.
  const stageRef = useRef<HTMLElement>(null);
  useEffect(() => { if (spinKey > 1) stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [spinKey]);
  const [eraLanded, setEraLanded] = useState(false);
  // The era and the team animate only when they change: a team re-spin leaves the era still, and the other way round.
  const [eraKey, setEraKey] = useState(0);
  const [teamKey, setTeamKey] = useState(0);
  const [teamMoved, setTeamMoved] = useState(true);
  const [landed, setLanded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [announce, setAnnounce] = useState('');
  const [selected, setSelected] = useState<NbaSlot | null>(null);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (challenge) return; // a challenge link starts below, once its function exists
    let resumeMode = initialMode;
    try { const s = JSON.parse(localStorage.getItem(SETUP_KEY) ?? '{}'); if (!modeFromLink && (s.mode === 'casual' || (s.mode === 'today' && signedIn && !playedTodayId))) { resumeMode = s.mode; setMode(s.mode); } if (typeof s.hard === 'boolean') setHard(s.hard); if (s.edition === 'standard' && standardReady) setEdition('standard'); } catch { /* storage blocked */ }
    try {
      const g = JSON.parse(sessionStorage.getItem(STATE_KEY) ?? 'null') as Game | null;
      if (g?.sessionId && g.daily === (resumeMode === 'today')) { setGame(g); setEraLanded(true); setLanded(true); return; }
    } catch { /* ignore */ }
    setSheet(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { try { if (game) sessionStorage.setItem(STATE_KEY, JSON.stringify(game)); } catch {} }, [game]);

  function spun(next: Game, prev: Game | null = null) {
    const eraMoved = !prev?.team || !next.team || prev.team.era !== next.team.era;
    const moved = !prev?.team || !next.team || prev.team.id !== next.team.id;
    setGame(next); setLanded(false); setQuery(''); setShowAll(false); setSpinKey((k) => k + 1);
    setTeamMoved(moved);
    if (moved) setTeamKey((k) => k + 1);
    if (eraMoved) { setEraLanded(false); setEraKey((k) => k + 1); }
  }

  async function startChallenge(id: string) {
    setBusy('start'); setError(''); setGame(null);
    try { sessionStorage.removeItem(STATE_KEY); } catch {}
    try {
      const d = await call({ action: 'start', challenge: id });
      spun({ ...d, challenge: id });
      track('game_started', { game: '82-0', daily: false, challenge: true });
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
    try { sessionStorage.removeItem(STATE_KEY); localStorage.setItem(SETUP_KEY, JSON.stringify({ mode, hard, edition })); } catch {}
    try {
      const d = await call({ action: 'start', daily: mode === 'today', hard, edition: mode === 'today' ? 'classic' : edition });
      spun(d);
      track('game_started', { game: '82-0', daily: mode === 'today', hard });
    } catch (e) {
      const err = e as Error & { status?: number; data?: { resultId?: string } };
      if (err.status === 409 && err.data?.resultId) { setPlayedId(err.data.resultId); setMode('casual'); setSheet(true); } else setError(err.message);
    } finally { setBusy(null); }
  }

  async function act(body: object, label: string, respin = false) {
    if (!game) return;
    setBusy(label); setError('');
    try {
      const d = await call({ ...body, sessionId: game.sessionId, token: game.token });
      const next = { ...game, ...d } as Game;
      if (respin || (d.index !== game.index && !d.done)) spun(next, respin ? game : null); else setGame(next);
      return next;
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  async function pick(p: NbaBoardPlayer) {
    const d = await act({ action: 'pick', playerId: p.id }, 'pick');
    if (d) setAnnounce(`${p.name} drafted. ${d.done ? 'Roster complete.' : 'Next spin.'}`);
  }

  async function tapSlot(slot: NbaSlot) {
    if (!game) return;
    const has = game.roster.find((r) => r.slot === slot)?.pick;
    if (!selected) { if (has) { setSelected(slot); setAnnounce(`${has.name} selected. Choose a spot to move him to.`); } return; }
    if (selected === slot) { setSelected(null); return; }
    const from = selected; setSelected(null);
    const d = await act({ action: 'move', from, to: slot }, 'move');
    if (d) setAnnounce(`Moved to ${NBA_SLOT_NAMES[slot]}.`);
  }

  async function grade() {
    if (!game) return;
    setBusy('grade'); setError('');
    try {
      const d = await call({ action: 'grade', sessionId: game.sessionId, token: game.token });
      track('game_completed', { game: '82-0', wins: d.result.wins, daily: game.daily });
      try { sessionStorage.removeItem(STATE_KEY); } catch {}
      router.push(`/results/${d.id}`);
    } catch (e) { setError((e as Error).message); setBusy(null); }
  }

  const setupSheet = sheet && (
    <div className="sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget && game) setSheet(false); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="nba-setup-h">
        <div className="sheet-grip" aria-hidden="true" />
        <h2 id="nba-setup-h" className="sheet-h">Game setup</h2>
        <Choice label="Mode" name="mode" value={mode} onChange={(v) => setMode(v as Mode)} options={[{ v: 'today', t: 'Today', d: 'Ranked, one try' }, { v: 'casual', t: 'Casual', d: 'Unlimited' }]} />
        <Choice label="Edition" name="edition" value={mode === 'today' ? 'classic' : edition} disabled={mode === 'today'} onChange={(v) => setEdition(v as 'classic' | 'standard')}
          options={[{ v: 'classic', t: 'Classic', d: 'Real stats, every era' }, { v: 'standard', t: 'Standard', d: standardReady ? 'NBA 2K ratings, today' : '2K ratings loading', off: !standardReady }]} />
        <Choice label="Difficulty" name="hard" value={hard ? 'hard' : 'easy'} onChange={(v) => setHard(v === 'hard')}
          options={[{ v: 'easy', t: 'Easy', d: 'Stats shown, 2 era and 2 team re-spins' }, { v: 'hard', t: 'Hard', d: 'Type names, no stats, no re-spins' }]} />
        {mode === 'today' && !signedIn && <p className="hint">Today is ranked and needs an account. <a href="/login?next=/games/82-0">Sign in</a> or <a href="/register?next=/games/82-0">create one</a>.</p>}
        {playedId && <p className="hint">You already played Today. <a href={`/results/${playedId}`}>See your result</a>. {mode === 'today' ? 'A new board drops at midnight ET. Casual is unlimited.' : 'Casual is unlimited: press Start.'}</p>}
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
          <h1 className="g-kicker" style={{ margin: 0 }}>82-0 · {mode === 'today' ? 'Today, ranked' : 'Casual'}{mode !== 'today' && edition === 'standard' ? ' · 2K' : ''}{hard ? ' · Hard' : ''}</h1>
          <button type="button" className="btn btn-sm" onClick={() => setSheet(true)}>Game setup</button>
        </header>
        {error ? <section className="g-done"><p role="alert" className="field-error">{error}</p><button className="btn btn-primary" onClick={() => setSheet(true)}>Try again</button></section> : (
          <section className="g-intro" style={{ maxWidth: 'none', paddingTop: 16 }}>
            <h2 className="g-title">Spin an era.<br />Spin a team. Go <span style={{ whiteSpace: 'nowrap' }}>82-0.</span></h2>
            <p className="g-lede">Five spins, each an era and then a franchise, and every era only once. Take one player from each, graded on his real stats from his best season there, and move anyone between positions before the season tips off.</p>
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
  // Type a name in any mode; without a query, Hard shows nothing and the other modes show the top 12 (or everyone).
  const found = team && q.length >= 1 ? team.players.filter((p) => norm(p.name).split(' ').some((w) => w.startsWith(q.split(' ')[0])) && norm(p.name).includes(q)) : null;
  const list = team ? (found ? found.slice(0, game.hard ? 6 : 40) : game.hard ? [] : showAll ? team.players : team.players.slice(0, 12)) : [];

  return (
    <div className="g-wrap g-board">
      <div aria-live="polite" className="sr-only">{announce}</div>
      <div className="g-main">
        <header className="g-head">
          <div>
            <h1 className="g-kicker" style={{ margin: 0 }}>82-0 · {game.daily ? 'Today, ranked' : 'Casual'}{game.edition === 'standard' ? ' · 2K' : ''}{game.hard ? ' · Hard' : ''} · {game.done ? 'Draft complete' : `Spin ${game.index + 1} of ${game.total}`}</h1>
            {game.challenge && challenge && <p className="g-challenge">Challenge · same spins as {challenge.by}</p>}
            <div className="g-progress" role="progressbar" aria-valuemin={0} aria-valuemax={game.total} aria-valuenow={game.index} aria-label="Picks made">
              {Array.from({ length: game.total }, (_, i) => <span key={i} className={i < game.index ? 'on' : i === game.index ? 'now' : ''} />)}
            </div>
          </div>
          <div className="row"><button type="button" className="btn btn-sm" onClick={() => { if (game.index > 0 && !game.done && !window.confirm('Changing the setup starts a new game. Continue?')) return; setSheet(true); }}>Game setup</button><SoundToggle /></div>
        </header>

        {error && <div role="alert" className="card card-error">{error}</div>}

        {team && target ? (
          <section ref={stageRef} className="g-stage" aria-labelledby="nba-clock">
            <div className="g-team">
              {game.edition === 'standard' ? <p className="g-kicker" style={{ margin: 0 }}>NBA 2K · current rosters</p> : <EraReel eras={ERAS.filter((e) => e.key === team.era || !(game.usedEras ?? []).includes(e.key)).map((e) => ({ key: e.key, label: e.label }))} target={team.era} targetLabel={ERAS.find((e) => e.key === team.era)?.label ?? team.eraLabel} spinKey={`${game.sessionId}-${eraKey}`} onLand={() => { setEraLanded(true); if (!teamMoved) setLanded(true); }} />}
              {(eraLanded || game.edition === 'standard' || !teamMoved) && <Reel pool={franchises.length ? franchises : [target]} target={target} spinKey={`${game.sessionId}-${teamKey}`} onLand={() => { setLanded(true); setAnnounce(`${team.eraLabel} ${team.location} ${team.name} on the clock`); }} />}
              <div className="g-spin-status" aria-live="polite">
                <p className="g-kicker" style={{ margin: 0 }} id="nba-clock">{landed ? `Pick one ${team.eraLabel} ${team.name} player` : 'Spinning'}</p>
                {game.hard ? <span className="g-kicker" style={{ margin: 0 }}>No re-spins</span> : (
                  <div className="row" style={{ gap: 8 }}>
                    {game.edition !== 'standard' && <button type="button" className="btn btn-sm" disabled={!landed || !!busy || game.eraRespinsLeft <= 0} onClick={() => act({ action: 'respin', what: 'era' }, 'respin', true)}>New era <span className="num">{game.eraRespinsLeft}</span></button>}
                    <button type="button" className="btn btn-sm" disabled={!landed || !!busy || game.teamRespinsLeft <= 0} onClick={() => act({ action: 'respin', what: 'team' }, 'respin', true)}>New team <span className="num">{game.teamRespinsLeft}</span></button>
                  </div>
                )}
              </div>
            </div>
            {!landed ? <div className="g-roster-wait" aria-hidden="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 14 }} />)}</div> : (
              <div className="g-roster in">
                {game.hard ? (
                  <>
                    <label htmlFor="nba-q" className="g-group-h" style={{ display: 'block' }}>Name a {team.eraLabel} {team.name} player</label>
                    <input id="nba-q" type="search" autoComplete="off" autoFocus placeholder={`Type a ${team.name} player's name`} value={query} onChange={(e) => setQuery(e.target.value)} />
                    <p className="hint" aria-live="polite">{q.length < 1 ? 'Type a letter to start. Stats stay hidden until the season is played.' : list.length ? `${list.length} match${list.length === 1 ? '' : 'es'}` : `No ${team.name} player by that name in this era.`}</p>
                  </>
                ) : (
                  <div className="g-find">
                    <label htmlFor="nba-find" className="sr-only">Find a {team.eraLabel} {team.name} player</label>
                    <input id="nba-find" type="search" autoComplete="off" placeholder={`Find a ${team.name} player`} value={query} onChange={(e) => setQuery(e.target.value)} />
                    {q.length >= 1 && <p className="hint" aria-live="polite">{list.length ? `${list.length} match${list.length === 1 ? '' : 'es'}` : `No ${team.name} player by that name in this era.`}</p>}
                  </div>
                )}
                <ul className="g-list">
                  {list.map((p) => (
                    <li key={p.id}>
                      <button type="button" className="g-player" onClick={() => pick(p)} disabled={!!busy}
                        aria-label={`Draft ${p.name}, ${p.position}, ${p.seasonLabel}${p.value >= 0 ? `, ${stat(p.ppg)} points, ${stat(p.rpg)} rebounds, ${stat(p.apg)} assists, value ${p.value.toFixed(0)}` : ''}`}>
                        <PlayerFace name={p.name} src={p.headshot} color={team.color} size={44} />
                        <span className="g-player-name">{p.name}<span className="g-player-pos">{p.position} · {game.edition === 'standard' ? '2K overall' : p.seasonLabel}{p.value >= 0 && game.edition !== 'standard' && <> · {stat(p.ppg)} / {stat(p.rpg)} / {stat(p.apg)}</>}</span></span>
                        <span className="g-ovr num" aria-hidden="true">{p.value >= 0 ? p.value.toFixed(0) : '??'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {!game.hard && !found && team.players.length > 12 && <button type="button" className="btn-link g-more" onClick={() => setShowAll((s) => !s)}>{showAll ? 'Show fewer' : `Show all ${team.players.length}`}</button>}
              </div>
            )}
          </section>
        ) : (
          <section className="g-done">
            <p className="g-kicker">Roster complete</p>
            <h2 className="g-title g-title-sm">Set your lineup, then tip off.</h2>
            <p className="g-lede" style={{ marginTop: 0 }}>Tap a player, then tap another spot to move him. Out of position costs value.</p>
            <button className="btn btn-primary btn-lg" onClick={grade} disabled={!!busy}>{busy === 'grade' ? 'Playing 82 games' : 'Play the season'}</button>
          </section>
        )}
      </div>

      <aside className="g-side" aria-label="Your lineup">
        <div className="g-side-inner">
          <p className="g-kicker">Your lineup</p>
          <p className="hint" style={{ marginTop: 0 }}>Tap a player, then a spot, to move him.</p>
          <ol className="g-slots nba-slots">
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
