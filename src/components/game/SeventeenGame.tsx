'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Reel, type ReelTeam } from './Reel';
import { SoundToggle } from './SoundToggle';
import { CloseIcon, ReelIcon } from '../Icons';
import { track } from '@/lib/analytics';
import { SLOTS, SLOT_LABELS, type Slot } from '@/lib/game/seventeen';
import type { PublicTeam, PublicPlayer } from '@/lib/server/games';

interface Spin { sessionId: string; token: string; teams: PublicTeam[]; respinsLeft: number; daily: boolean; date: string | null }
type Picks = Partial<Record<Slot, { player: PublicPlayer; teamId: number }>>;
const RULES_KEY = 'gl-17-0-rules';
const STATE_KEY = 'gl-17-0-state';

export function SeventeenGame({ reelPool, initialDaily = false }: { reelPool: ReelTeam[]; initialDaily?: boolean }) {
  const router = useRouter();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [spin, setSpin] = useState<Spin | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [picks, setPicks] = useState<Picks>({});
  const [focusSlot, setFocusSlot] = useState<Slot | null>(null);
  const [busy, setBusy] = useState<'spin' | 'grade' | 'respin' | null>(null);
  const [error, setError] = useState('');
  const [announce, setAnnounce] = useState('');
  const [reelKey, setReelKey] = useState(0);

  useEffect(() => {
    try { setRulesOpen(!localStorage.getItem(RULES_KEY)); } catch { /* ignore */ }
    try {
      const saved = JSON.parse(sessionStorage.getItem(STATE_KEY) ?? 'null');
      if (saved?.spin) { setSpin(saved.spin); setPicks(saved.picks ?? {}); setRevealed(saved.spin.teams.length); }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { if (spin) sessionStorage.setItem(STATE_KEY, JSON.stringify({ spin, picks })); } catch { /* ignore */ }
  }, [spin, picks]);

  const dismissRules = () => { setRulesOpen(false); try { localStorage.setItem(RULES_KEY, '1'); } catch {} };

  async function doSpin(daily: boolean) {
    setBusy('spin'); setError(''); setPicks({}); setRevealed(0);
    try {
      const res = await fetch('/api/games/17-0/spin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ daily }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Spin failed.');
      setSpin(data); setReelKey((k) => k + 1);
      track('game_started', { game: '17-0', daily });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  }

  const draftedTeams = useMemo(() => new Set(Object.values(picks).map((p) => p!.teamId)), [picks]);
  const filled = SLOTS.filter((s) => picks[s]).length;
  const allRevealed = spin ? revealed >= spin.teams.length : false;

  const onLand = useCallback((i: number, t: PublicTeam) => {
    setRevealed((r) => Math.max(r, i + 1));
    setAnnounce(`Team ${i + 1}: ${t.city} ${t.name}`);
  }, []);

  async function doRespin(index: number) {
    if (!spin) return;
    setBusy('respin'); setError('');
    try {
      const res = await fetch('/api/games/17-0/spin', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ respin: { sessionId: spin.sessionId, token: spin.token, index } }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Re-spin failed.');
      setSpin({ ...spin, teams: data.teams, respinsLeft: data.respinsLeft });
      setAnnounce(`Re-spun. New team: ${data.teams[index].city} ${data.teams[index].name}`);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  }

  function choose(team: PublicTeam, player: PublicPlayer) {
    const slot = (focusSlot && player.slots?.includes(focusSlot)) ? focusSlot : player.slots?.[0];
    if (!slot) return;
    setPicks((prev) => {
      const next: Picks = { ...prev };
      for (const s of SLOTS) if (next[s]?.teamId === team.id) delete next[s]; // one pick per team
      if (prev[slot]?.player.id === player.id) return next; // toggle off
      next[slot] = { player, teamId: team.id };
      return next;
    });
    setFocusSlot(null);
    setAnnounce(`${player.name} drafted at ${SLOT_LABELS[slot]}`);
  }

  async function grade() {
    if (!spin || filled < 6) return;
    setBusy('grade'); setError('');
    try {
      const res = await fetch('/api/games/17-0/grade', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: spin.sessionId, token: spin.token, picks: SLOTS.map((s) => ({ slot: s, id: picks[s]!.player.id })) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Grading failed.');
      track('game_completed', { game: '17-0', wins: data.result.wins, daily: spin.daily });
      try { sessionStorage.removeItem(STATE_KEY); } catch {}
      router.push(`/results/${data.id}`);
    } catch (e) { setError((e as Error).message); setBusy(null); }
  }

  const slotOpen = (s: Slot) => !picks[s];

  return (
    <div className="container section">
      <div aria-live="polite" className="sr-only">{announce}</div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <span className="eyebrow">{spin?.daily ? `Daily 17-0 · ${spin.date}` : '17-0'}</span>
          <h1 style={{ marginBottom: 0 }}>Six picks. Seventeen games.</h1>
        </div>
        <div className="row">
          <div className="dots" role="img" aria-label={`${filled} of 6 slots filled`}>
            {SLOTS.map((s) => <span key={s} className={`dot ${picks[s] ? 'on' : ''}`} />)}
          </div>
          <SoundToggle />
        </div>
      </div>

      {rulesOpen && (
        <section className="card card-green" aria-labelledby="rules-h" style={{ marginBottom: 24, position: 'relative' }}>
          <h2 id="rules-h" style={{ fontSize: '1.1rem' }}>How it works</h2>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li>Spin. Six teams land, one at a time.</li>
            <li>Draft exactly one player or coach from each team: QB, RB, WR/TE, DEF, K, HC.</li>
            <li>Two re-spins per game. They only replace teams you have not drafted from.</li>
            <li>Grade the roster. QB and DEF count 25 percent each, RB, WR/TE and HC 15, K 5.</li>
          </ol>
          <button className="btn btn-sm" style={{ position: 'absolute', top: 12, right: 12 }} onClick={dismissRules} aria-label="Dismiss rules"><CloseIcon size={16} /></button>
        </section>
      )}

      {!spin && (
        <div className="wide-card card">
          <div>
            <p className="big-num accent" aria-hidden="true">17-0</p>
            <p className="muted">Nobody goes 17-0 by accident. Mahomes helps. So does a kicker who can hit from 55.</p>
          </div>
          <div className="stack">
            <button className="btn btn-primary" onClick={() => doSpin(initialDaily)} disabled={!!busy}><ReelIcon size={18} /> {busy === 'spin' ? 'Spinning' : initialDaily ? 'Spin the daily' : 'Spin'}</button>
            <button className="btn" onClick={() => doSpin(!initialDaily)} disabled={!!busy}>{initialDaily ? 'Practice spin instead' : "Play today's daily"}</button>
            <p className="hint">Daily results count toward the leaderboard when you are signed in.</p>
          </div>
        </div>
      )}

      {error && <div role="alert" className="card card-error" style={{ margin: '16px 0' }}>{error}</div>}

      {spin && (
        <>
          <div className="slot-bar" role="group" aria-label="Roster slots" style={{ marginBottom: 20 }}>
            {SLOTS.map((s) => (
              <button key={s} type="button" className={`slot ${picks[s] ? 'filled' : ''}`} aria-pressed={focusSlot === s} onClick={() => setFocusSlot(focusSlot === s ? null : s)}>
                <span className="k">{SLOT_LABELS[s]}</span>
                <span className="n">{picks[s]?.player.name ?? 'Empty'}</span>
                {picks[s] && <span className="num muted" style={{ fontSize: '.8rem' }}>{picks[s]!.player.ovr}</span>}
              </button>
            ))}
          </div>
          {focusSlot && <p className="hint" style={{ marginBottom: 12 }}>Showing players who fit {SLOT_LABELS[focusSlot]}. Click the slot again to clear.</p>}

          <div className="stack" key={reelKey}>
            {spin.teams.map((t, i) => {
              const drafted = draftedTeams.has(t.id);
              const visible = i < revealed || i === revealed;
              return (
                <section key={`${t.id}-${i}`} className={`team-card ${drafted ? 'drafted' : ''}`} aria-label={`${t.city} ${t.name}`} style={{ opacity: visible ? 1 : 0.35 }}>
                  <div>
                    <span className="eyebrow">Team {i + 1}</span>
                    {i <= revealed && <Reel pool={reelPool} target={{ abbreviation: t.abbreviation, city: t.city, name: t.name, color: t.color }} delay={i === revealed ? 400 : 0} onLand={() => onLand(i, t)} />}
                    {i < revealed && <p style={{ margin: '4px 0 8px', fontWeight: 700 }}>{t.city} {t.name}</p>}
                    {i < revealed && !drafted && spin.respinsLeft > 0 && allRevealed && (
                      <button className="btn btn-sm" onClick={() => doRespin(i)} disabled={!!busy}>Re-spin ({spin.respinsLeft} left)</button>
                    )}
                  </div>
                  {i < revealed ? (
                    <div className="plist">
                      {t.players.map((p) => {
                        const pickedHere = Object.values(picks).some((x) => x!.player.id === p.id);
                        const fitsFocus = !focusSlot || p.slots?.includes(focusSlot);
                        const slot = p.slots?.[0];
                        const blocked = !pickedHere && !!slot && !slotOpen(slot) && picks[slot]?.teamId !== t.id;
                        return (
                          <button key={p.id} type="button" className={`pbtn ${fitsFocus ? '' : 'dim'}`} aria-pressed={pickedHere}
                            onClick={() => choose(t, p)} disabled={!allRevealed}
                            aria-label={`${p.name}, ${p.position}, rated ${p.ovr}${blocked ? `. Replaces your current ${SLOT_LABELS[slot!]}` : ''}`}>
                            <span><span style={{ display: 'block', fontWeight: 600, fontSize: '.9rem' }}>{p.name}</span><span className="pos">{p.position}{p.group === 'HC' ? ' · impact' : ''}</span></span>
                            <span className="ovr">{p.ovr}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : <div className="skeleton" style={{ minHeight: 96 }} />}
                </section>
              );
            })}
          </div>

          <div className="row" style={{ marginTop: 24, position: 'sticky', bottom: 0, background: 'var(--navy)', padding: '12px 0', borderTop: '1px solid var(--steel)' }}>
            <button className="btn btn-primary" onClick={grade} disabled={filled < 6 || !!busy}>{busy === 'grade' ? 'Grading' : 'Grade My Roster'}</button>
            <span className="muted num">{filled}/6</span>
            <button className="btn-link" onClick={() => { try { sessionStorage.removeItem(STATE_KEY); } catch {} setSpin(null); setPicks({}); }}>Start over</button>
          </div>
        </>
      )}
    </div>
  );
}
