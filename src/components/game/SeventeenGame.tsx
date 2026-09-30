'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Reel, type ReelTeam } from './Reel';
import { SoundToggle } from './SoundToggle';
import { PlayerFace } from './PlayerFace';
import { track } from '@/lib/analytics';
import { SLOTS, SLOT_LABELS, type Slot } from '@/lib/game/seventeen';
import type { DraftState } from '@/lib/server/draft';
import type { PublicPlayer } from '@/lib/server/games';
import './game.css';

type Draft = DraftState & { token: string; daily: boolean; date: string | null };
const STATE_KEY = 'gl-17-0-draft-v3';
const SLOT_HINT: Record<Slot, string> = { QB: 'Quarterback', RB: 'Running back', WR: 'Wide receiver', TE: 'Tight end', DEF: 'Any defender', HC: 'Head coach' };

async function post(body: object) {
  const res = await fetch('/api/games/17-0/spin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Try again.');
  return data;
}

type Mode = 'today' | 'casual';

export function SeventeenGame({ reelPool, signedIn, playedTodayId, initialMode }: { reelPool: ReelTeam[]; signedIn: boolean; playedTodayId: string | null; initialMode: Mode }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [playedId, setPlayedId] = useState<string | null>(playedTodayId);
  const [spinKey, setSpinKey] = useState(0);
  const [landed, setLanded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [announce, setAnnounce] = useState('');
  const stageRef = useRef<HTMLElement>(null);
  useEffect(() => { if (spinKey > 1) stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [spinKey]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Resume an in-progress draft after a refresh.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STATE_KEY) ?? 'null') as Draft | null;
      if (saved?.sessionId && !saved.done && saved.daily === (initialMode === 'today') && (saved.picks ?? []).every((p) => (SLOTS as readonly string[]).includes(p.slot ?? ''))) { setDraft(saved); setLanded(true); return; }
    } catch { /* ignore */ }
    // Opening the game spins right away.
    if (initialMode === 'casual' || (signedIn && !playedTodayId)) void start(initialMode === 'today');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchMode(m: Mode) {
    if (m === mode && draft) return;
    setMode(m);
    try { sessionStorage.removeItem(STATE_KEY); } catch {}
    setDraft(null);
    if (m === 'casual' || (signedIn && !playedId)) void start(m === 'today');
  }
  useEffect(() => { try { if (draft) sessionStorage.setItem(STATE_KEY, JSON.stringify(draft)); } catch {} }, [draft]);

  const filled = useMemo(() => new Map((draft?.picks ?? []).map((p) => [p.slot as Slot, p])), [draft]);
  const openSlots = SLOTS.filter((s) => !filled.has(s));
  const team = draft?.team ?? null;
  const reelTarget: ReelTeam | null = team ? { id: team.id, abbreviation: team.abbreviation, city: team.city, name: team.name, color: team.color, logoUrl: team.logoUrl } : null;

  async function start(daily: boolean) {
    setBusy('start'); setError(''); setDraft(null);
    try {
      const res = await fetch('/api/games/17-0/spin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'start', daily }) });
      const d = await res.json().catch(() => ({}));
      if (res.status === 409 && d.resultId) { setPlayedId(d.resultId); return; }
      if (!res.ok) throw new Error(d.error ?? 'Something went wrong. Try again.');
      setDraft(d); setLanded(false); setSpinKey((k) => k + 1);
      track('game_started', { game: '17-0', daily });
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  async function act(body: object, label: string) {
    if (!draft) return;
    setBusy(label); setError('');
    try {
      const d = await post({ ...body, sessionId: draft.sessionId, token: draft.token });
      setDraft({ ...draft, ...d });
      if (!d.done) { setLanded(false); setSpinKey((k) => k + 1); }
      return d as DraftState;
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  async function pick(p: PublicPlayer) {
    const d = await act({ action: 'pick', playerId: p.id }, 'pick');
    if (d) setAnnounce(`${p.name} drafted. ${d.done ? 'Roster complete.' : 'Next team spinning.'}`);
  }

  async function grade() {
    if (!draft) return;
    setBusy('grade'); setError('');
    try {
      const res = await fetch('/api/games/17-0/grade', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: draft.sessionId, token: draft.token }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Grading failed.');
      track('game_completed', { game: '17-0', wins: data.result.wins, daily: draft.daily });
      try { sessionStorage.removeItem(STATE_KEY); } catch {}
      router.push(`/results/${data.id}`);
    } catch (e) { setError((e as Error).message); setBusy(null); }
  }

  function reset() { try { sessionStorage.removeItem(STATE_KEY); } catch {} setError(''); void start(mode === 'today' && !playedId); }

  const tabs = (
    <div className="g-modes" role="tablist" aria-label="Mode">
      <button role="tab" aria-selected={mode === 'today'} className={mode === 'today' ? 'on' : ''} onClick={() => switchMode('today')}>Today</button>
      <button role="tab" aria-selected={mode === 'casual'} className={mode === 'casual' ? 'on' : ''} onClick={() => switchMode('casual')}>Casual</button>
    </div>
  );

  if (!draft) {
    const gate = mode === 'today' && !signedIn;
    const played = mode === 'today' && !!playedId;
    return (
      <div className="g-wrap">
        <header className="g-head"><h1 className="g-kicker" style={{ margin: 0 }}>17-0 · {mode === 'today' ? 'Today, ranked' : 'Casual'}</h1>{tabs}</header>
        {gate ? (
          <section className="g-done">
            <p className="g-kicker">Today is ranked</p>
            <h2 className="g-title g-title-sm">Same six spins for everyone. One shot. Your record goes on the board.</h2>
            <p className="g-lede">Ranked play needs an account so the leaderboard stays honest. Casual is open to everyone and unlimited.</p>
            <div className="g-actions">
              <a className="btn btn-primary btn-lg" href="/login?next=/games/17-0">Sign in</a>
              <a className="btn btn-lg" href="/register?next=/games/17-0">Create an account</a>
              <button className="btn-link" onClick={() => switchMode('casual')}>Play Casual</button>
            </div>
          </section>
        ) : played ? (
          <section className="g-done">
            <p className="g-kicker">Done for today</p>
            <h2 className="g-title g-title-sm">You already played today&apos;s ranked 17-0.</h2>
            <p className="g-lede">A new board drops at midnight ET. Casual spins are unlimited.</p>
            <div className="g-actions">
              <a className="btn btn-lg" href={`/results/${playedId}`}>See your result</a>
              <a className="btn btn-lg" href="/leaderboard?tab=daily&game=17-0">Leaderboard</a>
              <button className="btn btn-primary btn-lg" onClick={() => switchMode('casual')}>Play Casual</button>
            </div>
          </section>
        ) : error ? (
          <section className="g-done"><p role="alert" className="field-error">{error}</p><button className="btn btn-primary" onClick={() => start(mode === 'today')}>Try again</button></section>
        ) : (
          <section className="g-stage" aria-busy="true"><div className="g-team"><div className="reel2" /></div><div className="g-roster-wait">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 14 }} />)}</div></section>
        )}
      </div>
    );
  }

  return (
    <div className="g-wrap g-board">
      <div aria-live="polite" className="sr-only">{announce}</div>
      <div className="g-main">
        <header className="g-head">
          <div>
            <h1 className="g-kicker" style={{ margin: 0 }}>17-0 · {draft.daily ? `Today, ranked` : 'Casual'} · {draft.done ? 'Draft complete' : `Spin ${draft.index + 1} of ${draft.total}`}</h1>
            <div className="g-progress" role="progressbar" aria-valuemin={0} aria-valuemax={draft.total} aria-valuenow={draft.picks.length} aria-label="Picks made">
              {Array.from({ length: draft.total }, (_, i) => <span key={i} className={i < draft.picks.length ? 'on' : i === draft.index ? 'now' : ''} />)}
            </div>
          </div>
          <div className="row">{tabs}<SoundToggle /></div>
        </header>

        {error && <div role="alert" className="card card-error">{error}</div>}

        {team && reelTarget ? (
          <section ref={stageRef} className="g-stage" aria-labelledby="clock-h">
            <div className="g-team">
              <Reel pool={reelPool} target={reelTarget} spinKey={`${draft.sessionId}-${spinKey}`} onLand={() => { setLanded(true); setAnnounce(`${team.city} ${team.name} on the clock`); }} />
              <div className="g-spin-status" aria-live="polite">
                <p className="g-kicker" style={{ margin: 0 }} id="clock-h">{landed ? `Pick one ${team.name} player for an open slot` : 'Spinning'}</p>
                <span className="g-kicker num" style={{ margin: 0 }}>{openSlots.length} open</span>
              </div>
            </div>

            {!landed ? <div className="g-roster-wait" aria-hidden="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 14 }} />)}</div> : <div className="g-roster in">
              {openSlots.map((slot) => {
                const all = team.players.filter((p) => p.slots?.includes(slot)).sort((a, b) => b.ovr - a.ovr);
                if (!all.length) return null;
                const cap = slot === 'DEF' ? 6 : slot === 'WR' ? 4 : 2;
                const key = `${team.id}-${slot}`;
                const options = expanded.has(key) ? all : all.slice(0, cap);
                return (
                  <div key={slot} className="g-group">
                    <h3 className="g-group-h"><span>{SLOT_LABELS[slot]}</span><span className="muted">{SLOT_HINT[slot]}</span></h3>
                    <ul className="g-list">
                      {options.map((p) => (
                        <li key={p.id}>
                          <button type="button" className="g-player" onClick={() => pick(p)} disabled={!landed || !!busy}
                            aria-label={`Draft ${p.name}, ${p.position}, ${p.group === 'HC' ? 'coach impact' : 'overall'} ${p.ovr}, as your ${SLOT_LABELS[slot]}`}>
                            <PlayerFace name={p.name} src={p.img} color={team.color} size={44} />
                            <span className="g-player-name">{p.name}<span className="g-player-pos">{p.position === 'HC' ? 'Head coach' : p.position}</span></span>
                            <span className="g-ovr num">{p.ovr}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    {all.length > cap && (
                      <button type="button" className="btn-link g-more" onClick={() => setExpanded((e) => { const n = new Set(e); if (n.has(key)) n.delete(key); else n.add(key); return n; })}>
                        {expanded.has(key) ? 'Show fewer' : `Show all ${all.length}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>}
          </section>
        ) : (
          <section className="g-done">
            <p className="g-kicker">Roster complete</p>
            <h2 className="g-title g-title-sm">Six picks in. Time to play the season.</h2>
            <button className="btn btn-primary btn-lg" onClick={grade} disabled={!!busy}>{busy === 'grade' ? 'Simulating 17 games' : 'Simulate the season'}</button>
          </section>
        )}
      </div>

      <aside className="g-side" aria-label="Your roster">
        <div className="g-side-inner">
          <p className="g-kicker">Your roster</p>
          <ol className="g-slots">
            {SLOTS.map((s) => {
              const p = filled.get(s);
              return (
                <li key={s} className={p ? 'filled' : ''}>
                  <span className="g-slot-k">{SLOT_LABELS[s]}</span>
                  {p ? (
                    <span className="g-slot-v">
                      {p.logoUrl ? <img src={p.logoUrl} alt="" width={22} height={22} /> : <span className="g-dot" style={{ background: p.teamColor }} />}
                      <span className="g-slot-name">{p.name}</span>
                      <span className="num g-slot-ovr">{p.ovr}</span>
                    </span>
                  ) : <span className="g-slot-empty">Open</span>}
                </li>
              );
            })}
          </ol>
          {draft.done && <button className="btn btn-primary g-side-cta" onClick={grade} disabled={!!busy}>{busy === 'grade' ? 'Simulating' : 'Simulate the season'}</button>}
          <button className="btn-link g-reset" onClick={reset}>Start over</button>
        </div>
      </aside>
    </div>
  );
}
