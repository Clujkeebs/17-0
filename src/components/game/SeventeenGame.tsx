'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Reel, SpinningReel, usePreloadLogos, type ReelTeam } from './Reel';
import { SoundToggle } from './SoundToggle';
import { PlayerFace } from './PlayerFace';
import { track } from '@/lib/analytics';
import { FORMATS, type FormatKey, type PoolKey } from '@/lib/game/seventeen';
import type { DraftState } from '@/lib/server/draft';
import type { PublicPlayer } from '@/lib/server/games';
import './game.css';

type Draft = DraftState & { token: string; daily: boolean; date: string | null };
type SlotView = { key: string; label: string; hint: string };
const STATE_KEY = 'gl-17-0-draft-v4';
const SETUP_KEY = 'gl-17-0-setup';

type Mode = 'today' | 'casual';
type Scoring = 'ratings' | 'fantasy';
export interface Setup { mode: Mode; format: FormatKey; pool: PoolKey; hard: boolean; scoring: Scoring }
/** The format the server sees: Fantasy is its own lineup; otherwise the chosen roster size. */
const formatFor = (s: Setup): FormatKey => (s.mode === 'today' ? '6' : s.scoring === 'fantasy' ? 'fantasy' : s.format === 'fantasy' ? '6' : s.format);
/** What a player is worth on the board: fantasy points per game, or the overall. */
const worth = (p: { ovr: number; fpts?: number }) => p.fpts ?? p.ovr;
const showWorth = (p: { ovr: number; fpts?: number }) => (p.fpts !== undefined ? (p.fpts >= 0 ? p.fpts.toFixed(1) : '') : p.ovr >= 0 ? String(p.ovr) : '');
const CLASSIC: SlotView[] = FORMATS['6'].slots.map(({ key, label, hint }) => ({ key, label, hint }));

async function post(body: object) {
  const res = await fetch('/api/games/17-0/spin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Try again.');
  return data;
}

const describe = (s: { daily: boolean; format?: FormatKey; pool?: PoolKey; hard: boolean }) =>
  [s.daily ? 'Today, ranked' : 'Casual', s.format === 'fantasy' ? 'Fantasy' : s.format && s.format !== '6' ? `${s.format}-man` : null, s.pool === 'all-time' ? 'All-time' : null, s.hard ? 'Hard' : null].filter(Boolean).join(' · ');

export function SeventeenGame({ reelPool, signedIn, playedTodayId, initialMode, fantasyReady = false }: { reelPool: ReelTeam[]; signedIn: boolean; playedTodayId: string | null; initialMode: Mode; fantasyReady?: boolean }) {
  const router = useRouter();
  usePreloadLogos(reelPool);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [setup, setSetup] = useState<Setup>({ mode: initialMode, format: '6', pool: 'current', hard: false, scoring: 'ratings' });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [playedId, setPlayedId] = useState<string | null>(playedTodayId);
  const [spinKey, setSpinKey] = useState(0);
  const [landed, setLanded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [announce, setAnnounce] = useState('');
  const stageRef = useRef<HTMLElement>(null);
  useEffect(() => { if (spinKey > 1) stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [spinKey]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  // Resume an in-progress draft after a refresh; otherwise open the setup sheet with the last choices.
  useEffect(() => {
    let saved: Partial<Setup> = {};
    try { saved = JSON.parse(localStorage.getItem(SETUP_KEY) ?? '{}') as Partial<Setup>; } catch { /* storage blocked */ }
    setSetup((s) => ({ ...s, format: saved.format && saved.format !== 'fantasy' ? saved.format : s.format, pool: saved.pool ?? s.pool, hard: saved.hard ?? s.hard, scoring: saved.scoring === 'fantasy' && fantasyReady ? 'fantasy' : 'ratings' }));
    try {
      const d = JSON.parse(sessionStorage.getItem(STATE_KEY) ?? 'null') as Draft | null;
      if (d?.sessionId && !d.done && d.daily === (initialMode === 'today')) { setDraft(d); setLanded(true); return; }
    } catch { /* ignore */ }
    setSheetOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { try { if (draft) sessionStorage.setItem(STATE_KEY, JSON.stringify(draft)); } catch {} }, [draft]);

  const slots: SlotView[] = draft?.slots ?? CLASSIC;
  const filled = useMemo(() => new Map((draft?.picks ?? []).map((p) => [p.slot ?? '', p])), [draft]);
  const openSlots = slots.filter((s) => !filled.has(s.key));
  const team = draft?.team ?? null;
  const reelTarget: ReelTeam | null = team ? { id: team.id, abbreviation: team.abbreviation, city: team.city, name: team.name, color: team.color, logoUrl: team.logoUrl } : null;

  async function start(s: Setup) {
    const daily = s.mode === 'today';
    setBusy('start'); setError(''); setDraft(null); setSheetOpen(false);
    try { sessionStorage.removeItem(STATE_KEY); localStorage.setItem(SETUP_KEY, JSON.stringify({ format: s.format, pool: s.pool, hard: s.hard, scoring: s.scoring })); } catch {}
    try {
      const res = await fetch('/api/games/17-0/spin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'start', daily, hard: s.hard, format: formatFor(s), pool: s.pool }) });
      const d = await res.json().catch(() => ({}));
      if (res.status === 409 && d.resultId) { setPlayedId(d.resultId); setSheetOpen(true); return; }
      if (!res.ok) throw new Error(d.error ?? 'Something went wrong. Try again.');
      setDraft(d); setLanded(false); setSpinKey((k) => k + 1);
      track('game_started', { game: '17-0', daily, hard: s.hard, format: formatFor(s), pool: s.pool });
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  async function act(body: object, label: string) {
    if (!draft) return;
    setBusy(label); setError('');
    try {
      const d = await post({ ...body, sessionId: draft.sessionId, token: draft.token });
      setDraft({ ...draft, ...d });
      if (!d.done) { setLanded(false); setQuery(''); setSpinKey((k) => k + 1); }
      return d as DraftState;
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  async function pick(p: PublicPlayer, slot?: string) {
    const d = await act({ action: 'pick', playerId: p.id, ...(slot ? { slot } : {}) }, 'pick');
    if (d) setAnnounce(`${p.name} drafted. ${d.done ? 'Roster complete.' : 'Next team spinning.'}`);
  }

  async function grade() {
    if (!draft) return;
    setBusy('grade'); setError('');
    try {
      const res = await fetch('/api/games/17-0/grade', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: draft.sessionId, token: draft.token }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Grading failed.');
      track('game_completed', { game: '17-0', wins: data.result.wins, daily: draft.daily, format: draft.format ?? '6' });
      try { sessionStorage.removeItem(STATE_KEY); } catch {}
      router.push(`/results/${data.id}`);
    } catch (e) { setError((e as Error).message); setBusy(null); }
  }

  function openSettings() {
    if (draft && draft.picks.length > 0 && !draft.done && !window.confirm('Changing the setup starts a new game. Continue?')) return;
    setSheetOpen(true);
  }

  const sheet = sheetOpen && (
    <SetupSheet value={setup} onChange={setSetup} signedIn={signedIn} playedId={playedId} busy={!!busy} fantasyReady={fantasyReady}
      onStart={() => start(setup)} onClose={() => setSheetOpen(false)} />
  );

  if (!draft) {
    return (
      <div className="g-wrap">
        <header className="g-head">
          <h1 className="g-kicker" style={{ margin: 0 }}>17-0 · {describe({ daily: setup.mode === 'today', format: formatFor(setup), pool: setup.mode === 'today' || setup.scoring === 'fantasy' ? 'current' : setup.pool, hard: setup.hard })}</h1>
          <button type="button" className="btn btn-sm" onClick={() => setSheetOpen(true)}>Game setup</button>
        </header>
        {error ? (
          <section className="g-done"><p role="alert" className="field-error">{error}</p><button className="btn btn-primary" onClick={() => setSheetOpen(true)}>Try again</button></section>
        ) : busy === 'start' ? (
          <section className="g-stage" aria-busy="true"><div className="g-team"><SpinningReel pool={reelPool} /><div className="g-spin-status"><p className="g-kicker" style={{ margin: 0 }}>Spinning</p></div></div><div className="g-roster-wait">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 14 }} />)}</div></section>
        ) : (
          <section className="g-intro" style={{ maxWidth: 'none', paddingTop: 16 }}>
            <h2 className="g-title">Draft a roster.<br />Go unbeaten.</h2>
            <p className="g-lede">One team spins at a time. Take one player from each into an open slot, then play the season.</p>
            <button className="btn btn-primary btn-lg" onClick={() => setSheetOpen(true)}>Set up a game</button>
          </section>
        )}
        {sheet}
      </div>
    );
  }

  // Group open slots by position so three open WR slots show one list of receivers, not three.
  const groups = openSlots.reduce<{ hint: string; slots: SlotView[] }[]>((acc, s) => {
    const g = acc.find((x) => x.hint === s.hint);
    if (g) g.slots.push(s); else acc.push({ hint: s.hint, slots: [s] });
    return acc;
  }, []);

  return (
    <div className="g-wrap g-board">
      <div aria-live="polite" className="sr-only">{announce}</div>
      <div className="g-main">
        <header className="g-head">
          <div>
            <h1 className="g-kicker" style={{ margin: 0 }}>17-0 · {describe(draft)} · {draft.done ? 'Draft complete' : `Spin ${draft.index + 1} of ${draft.total}`}</h1>
            <div className="g-progress" role="progressbar" aria-valuemin={0} aria-valuemax={draft.total} aria-valuenow={draft.picks.length} aria-label="Picks made">
              {Array.from({ length: draft.total }, (_, i) => <span key={i} className={i < draft.picks.length ? 'on' : i === draft.index ? 'now' : ''} />)}
            </div>
          </div>
          <div className="row"><button type="button" className="btn btn-sm" onClick={openSettings}>Game setup</button><SoundToggle /></div>
        </header>

        {error && <div role="alert" className="card card-error">{error}</div>}

        {team && reelTarget ? (
          <section ref={stageRef} className="g-stage" aria-labelledby="clock-h">
            <div className="g-team">
              <Reel pool={reelPool} target={reelTarget} spinKey={`${draft.sessionId}-${spinKey}`} onLand={() => { setLanded(true); setAnnounce(`${team.city} ${team.name} on the clock`); }} />
              <div className="g-spin-status" aria-live="polite">
                <p className="g-kicker" style={{ margin: 0 }} id="clock-h">{landed ? `Pick one ${team.name} player for an open slot` : 'Spinning'}</p>
                <div className="row" style={{ gap: 10 }}>
                  <span className="g-kicker num" style={{ margin: 0 }}>{openSlots.length} open</span>
                  {draft.hard ? <span className="g-kicker" style={{ margin: 0 }}>No re-rolls</span> : (
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
                  )}
                </div>
              </div>
            </div>

            {!landed ? <div className="g-roster-wait" aria-hidden="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 14 }} />)}</div> : draft.hard ? (
              <HardSearch team={team} openSlots={openSlots} query={query} setQuery={setQuery} busy={!!busy} onPick={(p) => pick(p)} />
            ) : <div className="g-roster in">
              {groups.map(({ hint, slots: gs }) => {
                const keys = gs.map((s) => s.key);
                const all = team.players.filter((p) => p.slots?.some((k) => keys.includes(k))).sort((a, b) => worth(b) - worth(a));
                if (!all.length) return null;
                const cap = hint === 'Any defender' ? 6 : hint === 'Wide receiver' || hint === 'RB, WR or TE' ? 4 : 2;
                const key = `${team.id}-${hint}`;
                const options = expanded.has(key) ? all : all.slice(0, cap);
                return (
                  <div key={hint} className="g-group">
                    <h3 className="g-group-h"><span>{gs.map((s) => s.label).join(' · ')}</span><span className="muted">{hint}</span></h3>
                    <ul className="g-list">
                      {options.map((p) => (
                        <li key={p.id}>
                          <button type="button" className="g-player" onClick={() => pick(p, gs[0].key)} disabled={!landed || !!busy}
                            aria-label={`Draft ${p.name}, ${p.position}, ${p.fpts !== undefined ? `${showWorth(p)} fantasy points per game` : `${p.group === 'HC' ? 'coach impact' : 'overall'} ${p.ovr}`}, as your ${gs[0].label}${p.legend ? ', all-time legend' : ''}`}>
                            <PlayerFace name={p.name} src={p.img} color={team.color} size={44} />
                            <span className="g-player-name">{p.name}<span className="g-player-pos">{p.position === 'HC' ? 'Head coach' : p.position}{p.legend && <span className="tag-legend">Legend</span>}</span></span>
                            <span className={`g-ovr num${p.fpts !== undefined ? ' g-fpts' : ''}`}>{showWorth(p)}</span>
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
            <h2 className="g-title g-title-sm">{draft.total} picks in. Time to play the season.</h2>
            <button className="btn btn-primary btn-lg" onClick={grade} disabled={!!busy}>{busy === 'grade' ? 'Simulating 17 games' : 'Simulate the season'}</button>
          </section>
        )}
      </div>

      <aside className="g-side" aria-label="Your roster">
        <div className="g-side-inner">
          <p className="g-kicker">Your roster</p>
          <ol className={`g-slots${slots.length > 6 ? ' g-slots-many' : ''}`}>
            {slots.map((s) => {
              const p = filled.get(s.key);
              return (
                <li key={s.key} className={p ? 'filled' : ''}>
                  <span className="g-slot-k">{s.label}</span>
                  {p ? (
                    <span className="g-slot-v">
                      {p.logoUrl ? <img src={p.logoUrl} alt="" width={22} height={22} /> : <span className="g-dot" style={{ background: p.teamColor }} />}
                      <span className="g-slot-name">{p.name}</span>
                      <span className="num g-slot-ovr">{showWorth(p)}</span>
                    </span>
                  ) : <span className="g-slot-empty">Open</span>}
                </li>
              );
            })}
          </ol>
          {draft.done && <button className="btn btn-primary g-side-cta" onClick={grade} disabled={!!busy}>{busy === 'grade' ? 'Simulating' : 'Simulate the season'}</button>}
          <button className="btn-link g-reset" onClick={openSettings}>Start over</button>
        </div>
      </aside>
      {sheet}
    </div>
  );
}

/** The game setup sheet: slides up from the bottom, one row per choice, then Start. */
function SetupSheet({ value, onChange, onStart, onClose, signedIn, playedId, busy, fantasyReady }: {
  value: Setup; onChange: (s: Setup) => void; onStart: () => void; onClose?: () => void; signedIn: boolean; playedId: string | null; busy: boolean; fantasyReady: boolean;
}) {
  const today = value.mode === 'today';
  const fantasy = !today && value.scoring === 'fantasy';
  const startRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    startRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const set = (patch: Partial<Setup>) => onChange({ ...value, ...patch });
  const blocked = today && (!signedIn || !!playedId);
  return (
    <div className="sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="setup-h">
        <div className="sheet-grip" aria-hidden="true" />
        <h2 id="setup-h" className="sheet-h">Game setup</h2>
        <Choice label="Mode" name="mode" value={value.mode} onChange={(v) => set({ mode: v as Mode })}
          options={[{ v: 'today', t: 'Today', d: 'Ranked, one try' }, { v: 'casual', t: 'Casual', d: 'Unlimited' }]} />
        <Choice label="Scoring" name="scoring" value={today ? 'ratings' : value.scoring} disabled={today} onChange={(v) => set({ scoring: v as Scoring })}
          options={[{ v: 'ratings', t: 'Ratings', d: 'Madden overalls' }, { v: 'fantasy', t: 'Fantasy', d: fantasyReady ? 'Real PPR points' : 'Points loading', off: !fantasyReady }]} />
        <Choice label="Roster" name="format" value={today ? '6' : value.format} disabled={today || fantasy} onChange={(v) => set({ format: v as FormatKey })}
          options={[{ v: '6', t: '6', d: 'Classic' }, { v: '12', t: '12', d: 'Adds OL and defense' }, { v: '16', t: '16', d: 'Full lineup' }]} />
        <Choice label="Players" name="pool" value={today || fantasy ? 'current' : value.pool} disabled={today || fantasy} onChange={(v) => set({ pool: v as PoolKey })}
          options={[{ v: 'current', t: 'Current', d: 'Today’s rosters' }, { v: 'all-time', t: 'All-time', d: 'Plus franchise legends' }]} />
        <Choice label="Difficulty" name="hard" value={value.hard ? 'hard' : 'easy'} onChange={(v) => set({ hard: v === 'hard' })}
          options={[{ v: 'easy', t: 'Easy', d: fantasy ? 'Points shown, 2 re-rolls' : 'Overalls shown, 2 re-rolls' }, { v: 'hard', t: 'Hard', d: fantasy ? 'Type names, no points, no re-rolls' : 'Type names, no overalls, no re-rolls' }]} />
        {fantasy && <p className="hint" style={{ margin: '4px 0 0' }}>Fantasy drafts a seven-man lineup (QB, two RBs, two WRs, TE, FLEX) from current rosters. Each player counts his PPR points per game this season, blended with his projection while the sample is small. Your weekly total sets the record.</p>}
        {today && <p className="hint" style={{ margin: '4px 0 0' }}>Today is the same board for everyone: six slots, current rosters. Roster size and legends are Casual options.</p>}
        {today && !signedIn && <p className="hint">Today is ranked and needs an account. <a href="/login?next=/games/17-0">Sign in</a> or <a href="/register?next=/games/17-0">create one</a>.</p>}
        {today && playedId && <p className="hint">You already played Today. <a href={`/results/${playedId}`}>See your result</a>. A new board drops at midnight ET.</p>}
        <div className="sheet-actions">
          {onClose && <button type="button" className="btn btn-lg" onClick={onClose}>Cancel</button>}
          <button ref={startRef} type="button" className="btn btn-primary btn-lg" disabled={busy || blocked} onClick={onStart}>Start</button>
        </div>
      </div>
    </div>
  );
}

function Choice({ label, name, value, options, onChange, disabled }: {
  label: string; name: string; value: string; options: { v: string; t: string; d: string; off?: boolean }[]; onChange: (v: string) => void; disabled?: boolean;
}) {
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

/** Hard mode picker: type a name from the team on the clock. No list to browse, no overalls. */
function HardSearch({ team, openSlots, query, setQuery, busy, onPick }: {
  team: NonNullable<DraftState['team']>; openSlots: SlotView[]; query: string; setQuery: (q: string) => void; busy: boolean; onPick: (p: PublicPlayer) => void;
}) {
  const norm = (x: string) => x.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '');
  const q = norm(query).trim();
  const openKeys = openSlots.map((s) => s.key);
  const label = (key: string) => openSlots.find((s) => s.key === key)?.label ?? key;
  const eligible = team.players.filter((p) => p.slots?.some((s) => openKeys.includes(s)));
  const hits = q.length >= 2 ? eligible.filter((p) => norm(p.name).split(' ').some((w) => w.startsWith(q.split(' ')[0])) && norm(p.name).includes(q)).slice(0, 6) : [];
  const miss = q.length >= 3 && hits.length === 0;
  const openLabels = [...new Set(openSlots.map((s) => s.label.replace(/\d+$/, '')))].join(', ');
  return (
    <div className="g-roster in g-hardsearch">
      <label htmlFor="hard-q" className="g-group-h" style={{ display: 'block' }}>Name a {team.name} player for an open slot ({openLabels})</label>
      <input id="hard-q" type="search" autoComplete="off" autoFocus placeholder={`Type a ${team.name} player's name`} value={query} onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && hits.length === 1) onPick(hits[0]); }} />
      <p className="hint" aria-live="polite">{miss ? `No ${team.name} player by that name fits an open slot.` : q.length < 2 ? 'Two letters to start. Overalls stay hidden until the season is played.' : `${hits.length} match${hits.length === 1 ? '' : 'es'}`}</p>
      <ul className="g-list" style={{ marginTop: 8 }}>
        {hits.map((p) => (
          <li key={p.id}>
            <button type="button" className="g-player" onClick={() => onPick(p)} disabled={busy} aria-label={`Draft ${p.name}, ${p.position === 'HC' ? 'head coach' : p.position}${p.legend ? ', all-time legend' : ''}`}>
              <PlayerFace name={p.name} src={p.img} color={team.color} size={44} />
              <span className="g-player-name">{p.name}<span className="g-player-pos">{p.position === 'HC' ? 'Head coach' : p.position} · {label(p.slots!.find((s) => openKeys.includes(s))!)}{p.legend && <span className="tag-legend">Legend</span>}</span></span>
              <span className="g-ovr num" aria-hidden="true">??</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
