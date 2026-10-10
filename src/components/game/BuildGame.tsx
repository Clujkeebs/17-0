'use client';
import { rememberGuestRun } from '@/lib/guest-runs';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Reel, SpinningReel, usePreloadLogos, type ReelTeam } from './Reel';
import { SoundToggle } from './SoundToggle';
import { PlayerFace } from './PlayerFace';
import { track } from '@/lib/analytics';
import { POSITION_NAMES, type Attributes } from '@/lib/game/attributes';
import { BUILD_POSITIONS, TRAITS, traitValue, type BuildPosition, type Trait } from '@/lib/game/build';
import type { DraftState } from '@/lib/server/draft';
import './game.css';

type Draft = DraftState & { token: string };

async function post(body: object) {
  const res = await fetch('/api/games/build-a-player/spin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Try again.');
  return data;
}

type Mode = 'today' | 'casual';

export function BuildGame({ reelPool, initialPosition, positionOfDay, signedIn, playedTodayId, initialMode, modeFromLink = false }: {
  reelPool: ReelTeam[]; initialPosition: BuildPosition | null; positionOfDay: BuildPosition; signedIn: boolean; playedTodayId: string | null; initialMode: Mode; modeFromLink?: boolean;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [playedId, setPlayedId] = useState<string | null>(playedTodayId);
  const router = useRouter();
  usePreloadLogos(reelPool);
  const [position, setPosition] = useState<BuildPosition>(initialPosition ?? positionOfDay);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [spinKey, setSpinKey] = useState(0);
  const [landed, setLanded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [announce, setAnnounce] = useState('');
  const stageRef = useRef<HTMLElement>(null);
  useEffect(() => { if (spinKey > 1) stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [spinKey]);
  const [showAll, setShowAll] = useState(false);
  // Hard mode: find players by typing their name; overalls and trait ratings stay hidden until the result.
  const [hard, setHard] = useState(false);
  const hardRef = useRef(false);
  const [query, setQuery] = useState('');

  const traits = TRAITS[position];
  const filled = new Map((draft?.picks ?? []).map((p) => [p.trait!, p]));
  const openTraits = traits.filter((t) => !filled.has(t.key));
  const team = draft?.team ?? null;

  useEffect(() => {
    try { hardRef.current = localStorage.getItem('gl-bap-hard') === '1'; setHard(hardRef.current); } catch { /* storage blocked */ }
    // The last mode played comes back, unless the link asked for one or Today is not playable now.
    let m = initialMode;
    try { const saved = localStorage.getItem('gl-bap-mode'); if (!modeFromLink && (saved === 'casual' || (saved === 'today' && signedIn && !playedTodayId))) m = saved; } catch { /* storage blocked */ }
    if (m !== initialMode) setMode(m);
    if (m === 'today' && signedIn && !playedTodayId) void start('today');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchMode(m: Mode) {
    setMode(m); setDraft(null); setError('');
    if (m === 'today') { setPosition(positionOfDay); if (signedIn && !playedId) void start('today'); }
  }

  async function start(m: Mode = mode) {
    try { localStorage.setItem('gl-bap-mode', m); } catch { /* storage blocked */ }
    setBusy('start'); setError('');
    const pos = m === 'today' ? positionOfDay : position;
    try {
      const res = await fetch('/api/games/build-a-player/spin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'start', position: pos, daily: m === 'today', hard: hardRef.current }) });
      const d = await res.json().catch(() => ({}));
      if (res.status === 409 && d.resultId) { setPlayedId(d.resultId); return; }
      if (!res.ok) throw new Error(d.error ?? 'Something went wrong. Try again.');
      if (m === 'today') setPosition(positionOfDay);
      setDraft(d); setLanded(false); setSpinKey((k) => k + 1);
      track('game_started', { game: 'build-a-player', position: pos, mode: m, hard: hardRef.current });
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  async function place(playerId: string, trait: string, label: string) {
    if (!draft) return;
    setBusy('pick'); setError('');
    try {
      const d = await post({ action: 'pick', sessionId: draft.sessionId, token: draft.token, playerId, trait });
      setDraft({ ...draft, ...d });
      setAnnounce(label);
      if (d.done) await grade({ ...draft, ...d });
      else { setLanded(false); setShowAll(false); setQuery(''); setSpinKey((k) => k + 1); }
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  async function grade(d: Draft) {
    setBusy('grade');
    const res = await fetch('/api/games/build-a-player/grade', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: d.sessionId, token: d.token }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Grading failed.');
    track('game_completed', { game: 'build-a-player', rating: data.result.rating });
    if (!signedIn) rememberGuestRun({ id: data.id, sessionId: d.sessionId, token: d.token });
    router.push(`/results/${data.id}`);
  }

  function toggleHard() {
    if (draft && draft.picks.length > 0 && !draft.done && !window.confirm('Switching difficulty starts a new game. Continue?')) return;
    const next = !hardRef.current;
    hardRef.current = next; setHard(next);
    try { localStorage.setItem('gl-bap-hard', next ? '1' : '0'); } catch { /* storage blocked */ }
    if (!draft) return;
    if (mode === 'casual') { setDraft(null); setError(''); }
    else if (signedIn && !playedId) void start('today');
  }

  const tabs = (
    <div className="row" style={{ gap: 8 }}>
      <div className="g-modes" role="tablist" aria-label="Mode">
        <button role="tab" aria-selected={mode === 'today'} className={mode === 'today' ? 'on' : ''} onClick={() => switchMode('today')}>Today</button>
        <button role="tab" aria-selected={mode === 'casual'} className={mode === 'casual' ? 'on' : ''} onClick={() => switchMode('casual')}>Casual</button>
      </div>
      <button type="button" className={`g-hard ${hard ? 'on' : ''}`} role="switch" aria-checked={hard} onClick={toggleHard} title="Search players by name. Ratings hidden.">
        <span className="g-hard-dot" aria-hidden="true" /> Hard mode
      </button>
    </div>
  );

  if (!draft) {
    return (
      <div className="g-wrap">
        <header className="g-head"><h1 className="g-kicker" style={{ margin: 0 }}>Build a Player · {mode === 'today' ? 'Today, ranked' : 'Casual'}{hard ? ' · Hard' : ''}</h1>{tabs}</header>
        {mode === 'today' && !signedIn ? (
          <section className="g-done">
            <p className="g-kicker">Today is ranked</p>
            <h2 className="g-title g-title-sm">Today&apos;s {POSITION_NAMES[positionOfDay].toLowerCase()}. Same five spins for everyone. One shot.</h2>
            <p className="g-lede">Ranked play needs an account. Casual is open to everyone, any position, unlimited.</p>
            <div className="g-actions">
              <a className="btn btn-primary btn-lg" href="/login?next=/games/build-a-player">Sign in</a>
              <a className="btn btn-lg" href="/register?next=/games/build-a-player">Create an account</a>
              <button className="btn-link" onClick={() => switchMode('casual')}>Play Casual</button>
            </div>
          </section>
        ) : mode === 'today' && playedId ? (
          <section className="g-done">
            <p className="g-kicker">Done for today</p>
            <h2 className="g-title g-title-sm">You already built today&apos;s ranked player.</h2>
            <div className="g-actions">
              <a className="btn btn-lg" href={`/results/${playedId}`}>See your result</a>
              <a className="btn btn-lg" href="/leaderboard?tab=daily&game=build-a-player">Leaderboard</a>
              <button className="btn btn-primary btn-lg" onClick={() => switchMode('casual')}>Play Casual</button>
            </div>
          </section>
        ) : mode === 'today' ? (
          <section className="g-stage" aria-busy="true"><div className="g-team"><SpinningReel pool={reelPool} /><div className="g-spin-status"><p className="g-kicker" style={{ margin: 0 }}>Spinning</p></div></div>{error && <p role="alert" className="field-error" style={{ padding: 16 }}>{error}</p>}</section>
        ) : (
          <section className="g-intro" style={{ maxWidth: 'none', paddingTop: 16 }}>
            <h2 className="g-title">Five spins.<br />One player.</h2>
            <p className="g-lede">Spin five teams. Take one trait from a player on each. See how good the player you built really is.</p>
            <div className="b-pos" role="group" aria-label="Position">
              {BUILD_POSITIONS.map((p) => (
                <button key={p} type="button" aria-pressed={position === p} onClick={() => setPosition(p)}>
                  <strong>{p}{p === positionOfDay && <span className="b-today">Today</span>}</strong>
                  <span>{TRAITS[p].map((t) => t.label.toLowerCase()).join(', ')}</span>
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-lg" disabled={!!busy} onClick={() => start('casual')}>{busy ? 'Starting' : 'Spin your first team'}</button>
            {error && <p role="alert" className="field-error">{error}</p>}
          </section>
        )}
      </div>
    );
  }

  const players = team ? [...team.players].sort((a, b) => b.ovr - a.ovr) : [];
  const shown = showAll ? players : players.slice(0, 6);

  return (
    <div className="g-wrap g-board">
      <div aria-live="polite" className="sr-only">{announce}</div>
      <div className="g-main">
        <header className="g-head">
          <div>
            <h1 className="g-kicker" style={{ margin: 0 }}>Build a {POSITION_NAMES[position]} · {draft && mode === 'today' ? 'Today, ranked · ' : 'Casual · '}{draft.hard ? 'Hard · ' : ''}Spin {Math.min(draft.index + 1, draft.total)} of {draft.total}</h1>
            <div className="g-progress" role="progressbar" aria-valuemin={0} aria-valuemax={draft.total} aria-valuenow={draft.picks.length} aria-label="Traits filled">
              {Array.from({ length: draft.total }, (_, i) => <span key={i} className={i < draft.picks.length ? 'on' : i === draft.index ? 'now' : ''} />)}
            </div>
          </div>
          <div className="row">{tabs}<SoundToggle /></div>
        </header>

        {error && <div role="alert" className="card card-error">{error}</div>}

        {team ? (
          <section ref={stageRef} className="g-stage" aria-labelledby="clock-h">
            <div className="g-team">
              <Reel pool={reelPool} target={{ id: team.id, abbreviation: team.abbreviation, city: team.city, name: team.name, color: team.color, logoUrl: team.logoUrl }}
                spinKey={`${draft.sessionId}-${spinKey}`} onLand={() => { setLanded(true); setAnnounce(`${team.city} ${team.name}`); }} />
              <div className="g-spin-status">
                <p className="g-kicker" style={{ margin: 0 }} id="clock-h">{!landed ? 'Spinning' : draft.hard ? 'Name a player, then pick a trait' : 'Tap the trait you want him to give you'}</p>
                <div className="row" style={{ gap: 10 }}>
                  <span className="g-kicker num" style={{ margin: 0 }}>{openTraits.length} open</span>
                  <button type="button" className="btn btn-sm g-respin" disabled={!landed || !!busy || draft.respinsLeft <= 0}
                    onClick={async () => {
                      setBusy('respin'); setError('');
                      try {
                        const d = await post({ action: 'respin', sessionId: draft.sessionId, token: draft.token });
                        setDraft({ ...draft, ...d }); setLanded(false); setSpinKey((k) => k + 1);
                      } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
                    }}>
                    Re-roll <span className="num">{draft.respinsLeft}</span>
                  </button>
                </div>
              </div>
            </div>
            {!landed ? <div className="g-roster-wait" aria-hidden="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 14 }} />)}</div> : draft.hard ? (
              <HardTraitSearch team={team} openTraits={openTraits} query={query} setQuery={setQuery} busy={!!busy} onPlace={place} />
            ) : <div className="g-roster in">
              <ul className="b-rows">
                {shown.map((p) => {
                  const vals = openTraits.map((t) => ({ t, v: traitValue(p.attrs as Attributes, t) })).sort((a, b) => b.v - a.v);
                  const best = vals[0];
                  return (
                    <li key={p.id} className="b-row">
                      <div className="b-row-head">
                        <PlayerFace name={p.name} src={p.img} color={team.color} size={44} />
                        <span className="g-player-name">{p.name}<span className="g-player-pos">{best ? `Fills your ${best.t.phrase} at ${best.v}` : p.position}</span></span>
                        <span className="g-ovr num">{p.ovr}</span>
                      </div>
                      <div className="b-traits" role="group" aria-label={`Traits ${p.name} can give you`}>
                        {vals.map(({ t, v }) => (
                          <button key={t.key} type="button" className="b-trait" disabled={!landed || !!busy}
                            onClick={() => place(p.id, t.key, `${p.name} fills ${t.label} at ${v}`)} aria-label={`Take ${t.label} ${v} from ${p.name}`}>
                            <span>{t.label}</span><strong className="num">{v}</strong>
                          </button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {players.length > 6 && <button type="button" className="btn-link g-more" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show fewer' : `Show all ${players.length}`}</button>}
            </div>}
          </section>
        ) : (
          <section className="g-done"><p className="g-kicker">Building</p><h2 className="g-title g-title-sm">Grading your player.</h2></section>
        )}
      </div>

      <aside className="g-side" aria-label="Your player">
        <div className="g-side-inner">
          <p className="g-kicker">Your {position}</p>
          <ol className="g-slots">
            {traits.map((t) => {
              const p = filled.get(t.key);
              return (
                <li key={t.key} className={p ? 'filled' : ''}>
                  <span className="g-slot-k">{t.label}</span>
                  {p ? (
                    <span className="g-slot-v">
                      {p.logoUrl ? <img src={p.logoUrl} alt="" width={22} height={22} /> : <span className="g-dot" style={{ background: p.teamColor }} />}
                      <span className="g-slot-name">{p.name}</span>
                      <span className="num g-slot-ovr">{p.value ?? '??'}</span>
                    </span>
                  ) : <span className="g-slot-empty">{Math.round(t.weight * 100)}%</span>}
                </li>
              );
            })}
          </ol>
          <button className="btn-link g-reset" onClick={() => { setDraft(null); setError(''); }}>Start over</button>
        </div>
      </aside>
    </div>
  );
}

/** Hard mode picker: type a name from the team on the clock, then choose a trait. No ratings shown. */
function HardTraitSearch({ team, openTraits, query, setQuery, busy, onPlace }: {
  team: NonNullable<DraftState['team']>; openTraits: Trait[]; query: string; setQuery: (q: string) => void; busy: boolean;
  onPlace: (playerId: string, trait: string, label: string) => void;
}) {
  const norm = (x: string) => x.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z ]/g, '');
  const q = norm(query).trim();
  const hits = q.length >= 1 ? team.players.filter((p) => norm(p.name).split(' ').some((w) => w.startsWith(q.split(' ')[0])) && norm(p.name).includes(q)).slice(0, 5) : [];
  const miss = q.length >= 3 && hits.length === 0;
  return (
    <div className="g-roster in g-hardsearch">
      <label htmlFor="hard-q" className="g-group-h" style={{ display: 'block' }}>Name a {team.name} player</label>
      <input id="hard-q" type="search" autoComplete="off" autoFocus placeholder={`Type a ${team.name} player's name`} value={query} onChange={(e) => setQuery(e.target.value)} />
      <p className="hint" aria-live="polite">{miss ? `No eligible ${team.name} player by that name.` : q.length < 1 ? 'Type a letter to start. Ratings stay hidden until your player is built.' : `${hits.length} match${hits.length === 1 ? '' : 'es'}`}</p>
      <ul className="b-rows" style={{ marginTop: 8 }}>
        {hits.map((p) => (
          <li key={p.id} className="b-row">
            <div className="b-row-head">
              <PlayerFace name={p.name} src={p.img} color={team.color} size={44} />
              <span className="g-player-name">{p.name}<span className="g-player-pos">{p.position}</span></span>
              <span className="g-ovr num" aria-hidden="true">??</span>
            </div>
            <div className="b-traits" role="group" aria-label={`Traits ${p.name} can give you`}>
              {openTraits.map((t) => (
                <button key={t.key} type="button" className="b-trait" disabled={busy}
                  onClick={() => onPlace(p.id, t.key, `${p.name} fills ${t.label}`)} aria-label={`Take ${t.label} from ${p.name}`}>
                  <span>{t.label}</span><strong className="num" aria-hidden="true">??</strong>
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
