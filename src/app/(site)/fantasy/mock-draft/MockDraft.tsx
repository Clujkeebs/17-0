'use client';
import { useEffect, useMemo, useState } from 'react';
import { PlayerFace } from '@/components/game/PlayerFace';
import { ShareButton } from '@/components/game/ShareButton';
import { F_POS, type FPos } from '@/lib/fantasy/rank';
import type { Slim } from '@/lib/fantasy/slim';
import {
  MOCK_ROUNDS, autoPick, botStep, done, draftPlayer, finishDraft, lineupValue, newDraft, nextPick, onTheClock, pickValues, picksUntilYou,
  recommend, resultOf, runBots, totalPicks, yourPicks, type MockState,
} from '@/lib/fantasy/mock';
import '@/components/fantasy/fantasy.css';

const SAVE_KEY = 'gl-mock-draft-v1';
const TEAM_CHOICES = [8, 10, 12, 14];
/** Fewest rounds that make a draft worth playing. */
const MIN_ROUNDS = 6;

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '');
const lastName = (n: string) => n.split(' ').slice(1).join(' ') || n;
const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 >= 11 && n % 100 <= 13) ? 0 : Math.min(n % 10, 4) % 4]}`;

/** A saved draft is only trusted when it still fits the current rankings. */
function load(players: Slim[]): MockState | null {
  try {
    const text = window.localStorage.getItem(SAVE_KEY);
    if (!text) return null;
    const s = JSON.parse(text) as MockState;
    const ids = new Set(players.map((p) => p.id));
    const ok = s?.setup && Array.isArray(s.picks) && Array.isArray(s.rosters) && s.rosters.length === s.setup.teams && s.setup.slot >= 1 && s.setup.slot <= s.setup.teams
      && s.picks.length <= s.setup.teams * s.rounds && s.picks.every((x) => ids.has(x.playerId));
    return ok ? s : null;
  } catch { return null; }
}

/** Where each of a roster's players plays: the starting lineup in order, then the bench. Mirrors how lineups are scored. */
function layout(roster: Slim[]) {
  const rest = [...roster].sort((a, b) => b.value - a.value);
  const take = (pos: FPos) => { const k = rest.findIndex((p) => p.pos === pos); return k >= 0 ? rest.splice(k, 1)[0] : null; };
  const qb = take('QB'), rb1 = take('RB'), rb2 = take('RB'), wr1 = take('WR'), wr2 = take('WR'), te = take('TE');
  const fi = rest.findIndex((p) => p.pos !== 'QB');
  const flex = fi >= 0 ? rest.splice(fi, 1)[0] : null;
  const starters: [string, Slim | null][] = [['QB', qb], ['RB', rb1], ['RB', rb2], ['WR', wr1], ['WR', wr2], ['TE', te], ['FLEX', flex]];
  return { starters, bench: rest };
}

export function MockDraft({ players }: { players: Slim[] }) {
  const maxTeams = TEAM_CHOICES.filter((t) => Math.floor(players.length / t) >= MIN_ROUNDS);
  const [teams, setTeams] = useState(12);
  const [slotChoice, setSlotChoice] = useState(0);            // 0 = random
  const [draft, setDraft] = useState<MockState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState('');
  const [pos, setPos] = useState<'ALL' | FPos>('ALL');
  const [pane, setPane] = useState<'players' | 'team'>('players');
  const [view, setView] = useState<'room' | 'board'>('room');
  const [limit, setLimit] = useState(50);
  const [sure, setSure] = useState(false);

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const you = draft?.setup.slot ?? 0;
  const clock = draft ? onTheClock(draft) : null;
  const finished = !!draft && done(draft);

  // Pick the draft back up after a refresh.
  useEffect(() => {
    const s = load(players);
    if (s) { setDraft(s); setTeams(s.setup.teams); }
    setLoaded(true);
  }, [players]);
  useEffect(() => {
    if (!loaded) return;
    try { if (draft) window.localStorage.setItem(SAVE_KEY, JSON.stringify(draft)); else window.localStorage.removeItem(SAVE_KEY); } catch { /* storage blocked */ }
  }, [draft, loaded]);

  // The computer teams pick one at a time, so the board fills in front of you.
  useEffect(() => {
    if (!draft || finished || clock === you) return;
    const quick = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setDraft((d) => (d && !done(d) && onTheClock(d) !== d.setup.slot ? botStep(d, players) : d)), quick ? 40 : 380);
    return () => clearTimeout(t);
  }, [draft, finished, clock, you, players]);

  useEffect(() => { if (!sure) return; const t = setTimeout(() => setSure(false), 4000); return () => clearTimeout(t); }, [sure]);

  const taken = useMemo(() => new Set(draft?.picks.map((x) => x.playerId)), [draft]);
  const available = useMemo(() => players.filter((p) => !taken.has(p.id)), [players, taken]);
  const matches = useMemo(() => {
    const t = norm(q).trim();
    return available.filter((p) => (pos === 'ALL' || p.pos === pos) && (!t || norm(p.name).includes(t) || p.team.toLowerCase() === t));
  }, [available, q, pos]);
  const mine = useMemo(() => (draft ? draft.rosters[you - 1].map((id) => byId.get(id)).filter((p): p is Slim => !!p) : []), [draft, you, byId]);
  const lay = useMemo(() => layout(mine), [mine]);

  const pickNo = draft ? Math.min(nextPick(draft), totalPicks(draft)) : 0;
  const round = draft ? Math.ceil(pickNo / draft.setup.teams) : 0;
  const rec = draft && clock === you ? recommend(available, mine, round, draft.rounds) : null;
  const result = draft && finished ? resultOf(draft, players) : null;
  const values = draft && finished ? pickValues(draft, players) : [];
  const steal = [...values].sort((a, b) => b.gap - a.gap)[0];
  const reach = [...values].sort((a, b) => a.gap - b.gap)[0];
  const wait = draft ? picksUntilYou(draft) : null;
  const upcoming = draft && !finished ? yourPicks(draft).filter((n) => n >= pickNo).slice(0, 5) : [];

  function start() {
    const t = Math.min(teams, maxTeams[maxTeams.length - 1] ?? teams);
    const slot = slotChoice && slotChoice <= t ? slotChoice : 1 + Math.floor(Math.random() * t);
    const rounds = Math.min(MOCK_ROUNDS, Math.floor(players.length / t));
    setDraft(newDraft({ teams: t, slot, seed: Math.random().toString(36).slice(2, 10) }, rounds));
    setQ(''); setPos('ALL'); setPane('players'); setView('room'); setLimit(50);
  }
  const take = (p: Slim) => { if (draft && clock === you) setDraft(draftPlayer(draft, p.id)); };

  if (!loaded) return <div className="md-setup card" aria-busy="true"><p className="muted" style={{ margin: 0 }}>Loading the rankings.</p></div>;
  if (!maxTeams.length) return <div className="card"><p style={{ margin: 0 }}>Rankings are still loading. Check back after the next update.</p></div>;

  // ---------- Setup ----------
  if (!draft) {
    const t = Math.min(teams, maxTeams[maxTeams.length - 1]);
    return (
      <section className="md-setup card" aria-label="Set up your draft">
        <h2>Set up your draft</h2>
        <div className="md-fields">
          <div className="md-field">
            <span className="trade-set-label" id="md-teams-l">Teams</span>
            <span className="seg" role="radiogroup" aria-labelledby="md-teams-l">
              {maxTeams.map((n) => <button key={n} type="button" role="radio" aria-checked={t === n} className={t === n ? 'on' : ''} aria-label={`${n} teams`} onClick={() => { setTeams(n); if (slotChoice > n) setSlotChoice(0); }}>{n}</button>)}
            </span>
          </div>
          <label className="md-field">
            <span className="trade-set-label">Your pick</span>
            <select value={slotChoice} onChange={(e) => setSlotChoice(Number(e.target.value))}>
              <option value={0}>Random</option>
              {Array.from({ length: t }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </label>
        </div>
        <p className="muted md-rules">Snake draft, {Math.min(MOCK_ROUNDS, Math.floor(players.length / t))} rounds, PPR. Starting lineup: 1 QB, 2 RB, 2 WR, 1 TE and a flex (RB, WR or TE). The rest of the roster is bench, so you draft backups too. The number beside each player is PPR fantasy points a game: his last four weeks blended with his season average and projection.</p>
        <button type="button" className="btn btn-primary" onClick={start}>Start the draft</button>
      </section>
    );
  }

  // ---------- Draft room ----------
  const board = Array.from({ length: draft.rounds }, (_, r) => Array.from({ length: draft.setup.teams }, (_, tIdx) => draft.picks.find((x) => x.round === r + 1 && x.team === tIdx + 1)));
  const lastPicks = [...draft.picks].reverse().slice(0, 6);

  return (
    <div className="md-room">
      {result && (
        <section className="md-result card" aria-label="Draft results">
          <div className="md-grade-row">
            <p className="md-grade" data-g={result.grade[0]} aria-label={`Grade ${result.grade}`}>{result.grade}</p>
            <div>
              <h2>{result.yourRank === 1 ? 'Best lineup in the league.' : `${ordinal(result.yourRank)} of ${draft.setup.teams}.`}</h2>
              <p className="muted" style={{ margin: 0 }}>
                Your best lineup is worth <strong className="num">{result.yourTotal.toFixed(1)}</strong> points a game. The top team has <strong className="num">{result.best.toFixed(1)}</strong>, the league average is <strong className="num">{result.average.toFixed(1)}</strong>.
              </p>
            </div>
          </div>
          <div className="md-result-cols">
            <div>
              <h3>Your lineup</h3>
              <ol className="md-lineup">
                {lineupValue(mine).starters.map((p) => (
                  <li key={p.id}><span className={`md-pos pos-${p.pos}`}>{p.pos}</span> <span className="md-lineup-name">{p.name}</span> <span className="num muted">{p.value.toFixed(1)}</span></li>
                ))}
              </ol>
              {(steal && steal.gap >= 5) || (reach && reach.gap <= -5) ? (
                <ul className="md-notes">
                  {steal && steal.gap >= 5 && <li><strong>Steal:</strong> {steal.player.name} at pick {steal.pick}, ranked {ordinal(steal.player.overall)}.</li>}
                  {reach && reach.gap <= -5 && <li><strong>Reach:</strong> {reach.player.name} at pick {reach.pick}, ranked {ordinal(reach.player.overall)}.</li>}
                </ul>
              ) : null}
            </div>
            <div>
              <h3>Standings</h3>
              <ol className="md-standings">
                {result.standings.map((s) => (
                  <li key={s.team} className={s.team === you ? 'you' : undefined}><span className="num">{s.rank}</span> <span>{s.team === you ? `Team ${s.team} (you)` : `Team ${s.team}`}</span> <span className="num">{s.total.toFixed(1)}</span></li>
                ))}
              </ol>
            </div>
          </div>
          <div className="md-actions">
            <button type="button" className="btn btn-primary" onClick={start}>Draft again</button>
            <button type="button" className="btn" onClick={() => setDraft(null)}>Change settings</button>
            <ShareButton label="Share result" text={`I got a ${result.grade} in a fantasy mock draft on Unbeaten: ${ordinal(result.yourRank)} of ${draft.setup.teams}.`} url="/fantasy/mock-draft" />
          </div>
        </section>
      )}

      {!finished && (
        <div className={`md-clock${clock === you ? ' mine' : ''}`}>
          <div role="status" aria-live="polite">
            <p className="md-clock-main">{clock === you ? "You're on the clock" : `Team ${clock} is picking`}</p>
            <p className="muted md-clock-sub">
              Round {round} of {draft.rounds} · Pick {pickNo} of {totalPicks(draft)}{clock !== you && wait != null ? ` · You pick in ${wait}` : ''}
            </p>
          </div>
          <div className="md-clock-actions">
            {clock !== you && <button type="button" className="btn btn-sm" onClick={() => setDraft(runBots(draft, players))}>Skip to my pick</button>}
            {clock === you && <button type="button" className="btn btn-sm" onClick={() => setDraft(autoPick(draft, players))}>Auto-pick</button>}
            <button type="button" className="btn btn-sm" onClick={() => setDraft(finishDraft(draft, players))}>Auto-draft the rest</button>
            <button type="button" className={`btn btn-sm${sure ? ' btn-primary' : ''}`} onClick={() => (sure ? (setDraft(null), setSure(false)) : setSure(true))}>{sure ? 'Tap again to end this draft' : 'Start over'}</button>
          </div>
        </div>
      )}
      {rec && (
        <p className="md-rec">
          Suggested: <button type="button" className="md-rec-btn" onClick={() => take(rec.player)}><strong>{rec.player.name}</strong> <span className={`md-pos pos-${rec.player.pos}`}>{rec.player.pos}</span></button> <span className="muted">{rec.reason}</span>
        </p>
      )}

      {!finished && (
        <p className="md-needs" aria-label="Your roster so far">
          <span className="muted">Your roster:</span>
          {lay.starters.map(([slot, p], i) => <span key={i} className={`md-need${p ? ' filled' : ''}`} title={p ? p.name : `${slot} still open`}>{slot}</span>)}
          <span className={`md-need bench${lay.bench.length >= Math.max(0, draft.rounds - 7) ? ' filled' : ''}`}>Bench {lay.bench.length}/{Math.max(0, draft.rounds - 7)}</span>
        </p>
      )}

      <div className="md-views" role="group" aria-label="View">
        <button type="button" className={`lb-chip${view === 'room' ? ' on' : ''}`} aria-pressed={view === 'room'} onClick={() => setView('room')}>Draft room</button>
        <button type="button" className={`lb-chip${view === 'board' ? ' on' : ''}`} aria-pressed={view === 'board'} onClick={() => setView('board')}>Full board</button>
      </div>

      {view === 'board' ? (
        <div className="md-board-wrap">
          <table className="md-board">
            <caption className="md-sr">Draft board, one column per team, one row per round</caption>
            <thead>
              <tr><th scope="col" className="md-rd">Rd</th>{Array.from({ length: draft.setup.teams }, (_, i) => <th scope="col" key={i} className={i + 1 === you ? 'you' : undefined}>{i + 1 === you ? 'You' : `T${i + 1}`}</th>)}</tr>
            </thead>
            <tbody>
              {board.map((row, r) => (
                <tr key={r}>
                  <th scope="row" className="md-rd">{r + 1}</th>
                  {row.map((cell, tIdx) => {
                    const p = cell ? byId.get(cell.playerId) : null;
                    const n = r * draft.setup.teams + (r % 2 === 0 ? tIdx + 1 : draft.setup.teams - tIdx);
                    return p ? (
                      <td key={tIdx} className={`md-cell pos-${p.pos}${tIdx + 1 === you ? ' you' : ''}`} title={`Pick ${cell!.pick}: ${p.name}`}><strong>{lastName(p.name)}</strong><small>{p.pos} · {p.team}</small></td>
                    ) : (
                      <td key={tIdx} className={`md-cell empty${n === pickNo ? ' now' : ''}${tIdx + 1 === you ? ' you' : ''}`}><small>{n}</small></td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="md-panes" role="group" aria-label="Show">
            <button type="button" className={`lb-chip${pane === 'players' ? ' on' : ''}`} aria-pressed={pane === 'players'} onClick={() => setPane('players')}>Players</button>
            <button type="button" className={`lb-chip${pane === 'team' ? ' on' : ''}`} aria-pressed={pane === 'team'} onClick={() => setPane('team')}>Your team ({mine.length})</button>
          </div>
          <div className="md-grid">
            <section className={`md-pool${pane === 'players' ? '' : ' away'}`} aria-label="Available players">
              <div className="md-filters">
                <input type="search" aria-label="Search available players" placeholder="Search players" autoComplete="off" value={q} onChange={(e) => { setQ(e.target.value); setLimit(50); }} />
                <span className="md-pos-tabs" role="group" aria-label="Position">
                  {(['ALL', ...F_POS] as const).map((p) => <button key={p} type="button" className={`lb-chip${pos === p ? ' on' : ''}`} aria-pressed={pos === p} onClick={() => { setPos(p); setLimit(50); }}>{p === 'ALL' ? 'All' : p}</button>)}
                </span>
              </div>
              <ol className="md-list">
                {matches.slice(0, limit).map((p) => (
                  <li key={p.id} className="md-row">
                    <span className="f-rank num">{p.overall}</span>
                    <PlayerFace name={p.name} src={p.img} color={p.teamColor} size={34} />
                    <span className="f-who"><strong>{p.name}</strong><span className="muted"><span className={`md-pos pos-${p.pos}`}>{p.pos}{p.posRank}</span> · {p.team}</span></span>
                    <span className="num md-val">{p.value.toFixed(1)}</span>
                    <button type="button" className="btn btn-sm btn-primary" disabled={clock !== you || finished} aria-label={`Draft ${p.name}`} onClick={() => take(p)}>Draft</button>
                  </li>
                ))}
              </ol>
              {matches.length === 0 && <p className="muted md-none">Nobody left matches that.</p>}
              {matches.length > limit && <button type="button" className="btn btn-sm md-more" onClick={() => setLimit(limit + 50)}>Show more</button>}
            </section>

            <aside className={`md-side${pane === 'team' ? '' : ' away'}`} aria-label="Your team">
              <h2 className="md-h">Your team</h2>
              <ul className="md-team">
                {lay.starters.map(([slot, p], i) => (
                  <li key={i} className={p ? 'filled' : 'open'}>
                    <span className="md-slot">{slot}</span>
                    {p ? <><span className="md-team-name">{p.name}</span><span className="muted md-team-sub">{p.pos} · {p.team}</span></> : <span className="muted">Open</span>}
                  </li>
                ))}
                {lay.bench.map((p) => (
                  <li key={p.id} className="filled bench"><span className="md-slot">BN</span><span className="md-team-name">{p.name}</span><span className="muted md-team-sub">{p.pos} · {p.team}</span></li>
                ))}
              </ul>
              <h2 className="md-h">Latest picks</h2>
              <ol className="md-feed">
                {lastPicks.map((x) => {
                  const p = byId.get(x.playerId);
                  return <li key={x.pick} className={x.team === you ? 'you' : undefined}><span className="num muted">{x.round}.{String(((x.pick - 1) % draft.setup.teams) + 1).padStart(2, '0')}</span> <span>{x.team === you ? 'You' : `Team ${x.team}`}</span> <strong>{p?.name}</strong> <span className="muted">{p?.pos}</span></li>;
                })}
                {lastPicks.length === 0 && <li className="muted">No picks yet.</li>}
              </ol>
            </aside>
          </div>
        </>
      )}
      {upcoming.length > 0 && <p className="muted md-foot">Your next picks: {upcoming.join(', ')}.</p>}
    </div>
  );
}
