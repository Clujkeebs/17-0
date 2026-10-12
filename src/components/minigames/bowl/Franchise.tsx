'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { oppDrives } from '@/lib/game/bowl';
import { createRng } from '@/lib/game/prng';
import {
  DINNER_COST, DRAFT_ROUNDS, PLAYOFF_ROUNDS, POSITIONS, ROSTER_MAX, answerPress, askFor, autoPick, byRecord, capSpace, depth, draftPick, expiring,
  faAsk, facilityCost, finishWeek, interest, myGame, myTeam, newLeague, onTheClock, overLimit, payroll, ratingsOf, release, resign, scoutGrade,
  sign, simPlayoffs, staffCost, startOffseason, startSeason, starters, teamDinner, teamOf, toDraft, train, trainCost, upgradeFacility,
  upgradeStaff, type FPlayer, type FTeam, type League, type Pos, type SeedPlayer, type SeedTeam, type SStats,
} from '@/lib/game/bowl-franchise';
import { BowlGame, type GameOver } from './BowlGame';
import { click } from '@/components/game/sound';

const KEY = 'bowl:gm:v1';
type Tab = 'home' | 'roster' | 'standings' | 'rankings' | 'schedule' | 'office' | 'history' | 'gms';
const TABS: [Tab, string][] = [['home', 'Home'], ['roster', 'Roster'], ['standings', 'Standings'], ['rankings', 'Power rankings'], ['schedule', 'Schedule'], ['office', 'Front office'], ['history', 'History'], ['gms', 'GM rankings']];
const rec = (t: { w: number; l: number; t: number }) => `${t.w}-${t.l}${t.t ? `-${t.t}` : ''}`;
const money = (m: number) => `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(1)}M`;
const errText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

/** GM mode: a franchise kept in this browser and, signed in, on your account. */
export function Franchise({ signedIn }: { signedIn: boolean }) {
  const [L, setL] = useState<League | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');
  const [sync, setSync] = useState<'' | 'saved' | 'error'>('');
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState<Tab>('home');

  // Load: this browser's save, or the account's if it is newer.
  useEffect(() => {
    let local: League | null = null;
    try { const raw = localStorage.getItem(KEY); if (raw) local = JSON.parse(raw) as League; } catch { /* no storage */ }
    const server = signedIn ? fetch('/api/bowl/save', { cache: 'no-store' }).then((r) => r.json()).then((b) => (b.league as League | null) ?? null).catch(() => null) : Promise.resolve(null);
    void server.then((s) => { setL(s && (!local || s.saved >= local.saved) ? s : local); setReady(true); });
  }, [signedIn]);

  // Save: always to this browser; to the account a moment after the last change.
  useEffect(() => {
    if (!ready || !L) return;
    try { localStorage.setItem(KEY, JSON.stringify(L)); } catch { /* full or blocked */ }
    if (!signedIn) return;
    const t = window.setTimeout(() => {
      void fetch('/api/bowl/save', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(L) })
        .then((r) => setSync(r.ok ? 'saved' : 'error')).catch(() => setSync('error'));
    }, 1200);
    return () => window.clearTimeout(t);
  }, [L, ready, signedIn]);

  const act = (fn: (l: League) => League) => {
    if (!L) return;
    try { const n = fn(L); setL({ ...n, saved: Date.now() }); setErr(''); } catch (e) { setErr(errText(e)); }
  };

  if (!ready) return <div className="skeleton" style={{ height: 240 }} />;
  if (!L) return <Setup onStart={(l) => { setL({ ...l, saved: Date.now() }); setTab('home'); }} signedIn={signedIn} />;
  if (playing) return <FranchiseGame L={L} onDone={(r) => { act((l) => finishWeek(l, r)); setPlaying(false); setTab('home'); }} />;

  return (
    <div className="gm">
      <Header L={L} sync={signedIn ? sync : ''} signedIn={signedIn} />
      <nav className="gm-tabs" aria-label="GM mode">
        {TABS.map(([k, label]) => <button key={k} type="button" className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}>{label}</button>)}
      </nav>
      {err && <div role="alert" className="card card-error">{err}</div>}
      {tab === 'home' && <Home L={L} act={act} play={() => { click(); setPlaying(true); }} />}
      {tab === 'roster' && <Roster L={L} act={act} />}
      {tab === 'standings' && <Standings L={L} />}
      {tab === 'rankings' && <Rankings L={L} />}
      {tab === 'schedule' && <Schedule L={L} />}
      {tab === 'office' && <Office L={L} act={act} reset={() => { if (window.confirm('Start over? This league is deleted.')) { try { localStorage.removeItem(KEY); } catch { /* */ } if (signedIn) void fetch('/api/bowl/save', { method: 'DELETE' }); setL(null); } }} />}
      {tab === 'history' && <History L={L} />}
      {tab === 'gms' && <Gms />}
    </div>
  );
}

// ---------------------------------------------------------------- setup

function Setup({ onStart, signedIn }: { onStart: (l: League) => void; signedIn: boolean }) {
  const [data, setData] = useState<{ teams: SeedTeam[]; players: SeedPlayer[] } | null>(null);
  const [error, setError] = useState('');
  const [coach, setCoach] = useState('');
  useEffect(() => {
    void fetch('/api/bowl/league').then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b.error ?? 'Could not load rosters.'); setData(b); }).catch((e) => setError(errText(e)));
  }, []);
  const teams = useMemo(() => {
    if (!data) return [];
    return data.teams.map((t) => {
      const mine = data.players.filter((p) => p.t === t.abbr);
      const qb = mine.filter((p) => p.p === 'QB').sort((a, b) => b.o - a.o)[0];
      const top = mine.map((p) => p.o).sort((a, b) => b - a).slice(0, 22);
      return { ...t, qb: qb?.n ?? '', ovr: top.length ? Math.round(top.reduce((s, x) => s + x, 0) / top.length) : 0 };
    }).sort((a, b) => b.ovr - a.ovr);
  }, [data]);
  const start = (abbr: string) => {
    if (!data) return;
    try { onStart(newLeague(crypto.randomUUID().slice(0, 12), data.teams, data.players, abbr, coach.trim() || 'Coach')); } catch (e) { setError(errText(e)); }
  };
  return (
    <div className="gm">
      <div className="gm-intro">
        <h2>Run a franchise.</h2>
        <p className="muted">Take over any NFL team with its real roster. Play every game (or sim it), win coaching credits, train your players, upgrade your facilities, hire coordinators, re-sign or let go, draft rookies and chase free agents under the cap. Season after season.</p>
        <p className="hint">{signedIn ? 'Your league saves to this browser and your account.' : 'Your league saves to this browser. Sign in to keep it on your account too.'}</p>
      </div>
      <label className="gm-field">Coach name <input className="input" value={coach} maxLength={24} onChange={(e) => setCoach(e.target.value)} placeholder="Coach" /></label>
      {error && <div role="alert" className="card card-error">{error}</div>}
      {!data && !error && <div className="skeleton" style={{ height: 200 }} />}
      {data && <>
        <p className="m-kicker" style={{ marginTop: 16 }}>Pick your team</p>
        <ul className="bw-teams">
          {teams.map((t) => (
            <li key={t.abbr}>
              <button type="button" className="bw-team" style={{ ['--tc' as string]: t.color }} onClick={() => start(t.abbr)}>
                {t.logo ? <img src={t.logo} alt="" width={36} height={36} /> : <span className="bw-abbr">{t.abbr}</span>}
                <span><strong>{t.city} {t.name}</strong><span className="muted">{t.qb} · Team {t.ovr}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </>}
    </div>
  );
}

// ---------------------------------------------------------------- header

function Meter({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="gm-meter" title={hint}>
      <span className="gm-meter-l">{label}<span className="num">{value}</span></span>
      <span className="gm-bar" aria-hidden="true"><span style={{ width: `${value}%` }} /></span>
    </div>
  );
}

function phaseLabel(L: League) {
  switch (L.phase) {
    case 'season': return `${L.year} season · Week ${Math.min(L.week + 1, L.sched.length)} of ${L.sched.length}`;
    case 'playoffs': return `${L.year} playoffs · ${PLAYOFF_ROUNDS[L.po?.round ?? 0]}`;
    case 'recap': return `${L.year} season over`;
    case 'resign': return `${L.year + 1} offseason · Re-signing`;
    case 'draft': return `${L.year + 1} offseason · Draft`;
    case 'fa': return `${L.year + 1} offseason · Free agency`;
  }
}

function Header({ L, sync, signedIn }: { L: League; sync: string; signedIn: boolean }) {
  const t = myTeam(L);
  return (
    <header className="gm-head" style={{ ['--tc' as string]: t.color }}>
      <div className="gm-team">
        {t.logo ? <img src={t.logo} alt="" width={44} height={44} /> : <span className="bw-abbr">{t.abbr}</span>}
        <div>
          <p className="gm-name">{t.city} {t.name} <span className="num">{rec(t)}</span></p>
          <p className="muted gm-sub">{L.coach} · {phaseLabel(L)}{t.pr ? ` · #${t.pr} in the rankings` : ''}</p>
        </div>
      </div>
      <div className="gm-stats">
        <div className="gm-cc"><span className="num">{L.cc}</span><span>credits</span></div>
        <div className="gm-cc"><span className="num">{money(capSpace(L, t))}</span><span>cap space</span></div>
        <Meter label="Fans" value={L.fans} hint="Fan support: more credits each week, and free agents like a full stadium." />
        <Meter label="Chemistry" value={L.chem} hint="Team chemistry: lifts or drags your ratings, and changes what players ask to re-sign." />
      </div>
      <p className="hint gm-save">{sync === 'saved' ? 'Saved to your account.' : sync === 'error' ? 'Saved in this browser. The account save failed; it will retry.' : signedIn ? 'Saving to your account.' : 'Saved in this browser.'}</p>
    </header>
  );
}

// ---------------------------------------------------------------- home

type Act = (fn: (l: League) => League) => void;

function Home({ L, act, play }: { L: League; act: Act; play: () => void }) {
  if (L.phase === 'recap') return <Recap L={L} act={act} />;
  if (L.phase === 'resign') return <Resign L={L} act={act} />;
  if (L.phase === 'draft') return <DraftRoom L={L} act={act} />;
  if (L.phase === 'fa') return <FreeAgency L={L} act={act} offseason />;
  const g = myGame(L);
  const lastRound = L.phase === 'playoffs' ? L.po?.past[L.po.past.length - 1] : L.sched[L.week - 1];
  return (
    <div className="gm-grid">
      <div className="gm-col">
        {L.press && (
          <section className="gm-card gm-press">
            <p className="m-kicker">Press conference</p>
            <p className="gm-q">{L.press.q}</p>
            <div className="gm-answers">
              {L.press.answers.map((a, i) => <button key={a.text} type="button" className="btn" onClick={() => act((l) => answerPress(l, i))}>{a.text}</button>)}
            </div>
          </section>
        )}
        {g ? <NextGame L={L} g={g} blocked={!!L.press} play={play} sim={() => act((l) => finishWeek(l, null))} />
          : L.phase === 'season' ? (
            <section className="gm-card"><p className="m-kicker">Week {L.week + 1}</p><p className="gm-big">Bye week.</p><p className="muted">Rest up. The rest of the league plays.</p>
              <button type="button" className="btn btn-primary" onClick={() => act((l) => finishWeek(l, null))}>Next week</button></section>
          ) : (
            <section className="gm-card"><p className="m-kicker">{PLAYOFF_ROUNDS[L.po?.round ?? 0]}</p><p className="gm-big">{L.po?.alive.includes(L.you) ? 'Waiting.' : 'Your season is over.'}</p>
              <p className="muted">{L.po?.alive.length} teams left.</p>
              <button type="button" className="btn btn-primary" onClick={() => act(simPlayoffs)}>Play out the playoffs</button></section>
          )}
        {lastRound && lastRound.length > 0 && (
          <section className="gm-card">
            <p className="m-kicker">{L.phase === 'playoffs' ? PLAYOFF_ROUNDS[(L.po?.past.length ?? 1) - 1] : `Week ${L.week} scores`}</p>
            <ul className="gm-scores">
              {lastRound.map((m) => {
                const hw = (m.hs ?? 0) > (m.as ?? 0), aw = (m.as ?? 0) > (m.hs ?? 0), mine = m.h === L.you || m.a === L.you;
                return <li key={`${m.h}${m.a}`} className={mine ? 'me' : ''}><span className={aw ? 'w' : ''}>{m.a} {m.as}</span><span className="muted">at</span><span className={hw ? 'w' : ''}>{m.h} {m.hs}</span>{m.ot && <span className="muted">OT</span>}</li>;
              })}
            </ul>
          </section>
        )}
      </div>
      <News L={L} />
    </div>
  );
}

function NextGame({ L, g, blocked, play, sim }: { L: League; g: { h: string; a: string }; blocked: boolean; play: () => void; sim: () => void }) {
  const home = g.h === L.you, opp = teamOf(L, home ? g.a : g.h), me = myTeam(L);
  const [a, b] = [ratingsOf(L, me), ratingsOf(L, opp)];
  const label = L.phase === 'playoffs' ? PLAYOFF_ROUNDS[L.po!.round] : `Week ${L.week + 1}`;
  const neutral = L.phase === 'playoffs' && L.po!.round === 3;
  return (
    <section className="gm-card gm-next" style={{ ['--tc' as string]: opp.color }}>
      <p className="m-kicker">{label} · {neutral ? 'Neutral field' : home ? 'Home' : 'Away'}</p>
      <div className="gm-vs">
        <TeamBadge t={me} sub={`OFF ${a.offense} · DEF ${a.defense}`} />
        <span className="gm-at">{home ? 'vs' : 'at'}</span>
        <TeamBadge t={opp} sub={`OFF ${b.offense} · DEF ${b.defense}`} />
      </div>
      {blocked && <p className="hint">Answer the press first.</p>}
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-primary btn-lg" disabled={blocked} onClick={play}>Play the game</button>
        <button type="button" className="btn btn-lg" disabled={blocked} onClick={sim}>Sim it</button>
      </div>
    </section>
  );
}

function TeamBadge({ t, sub }: { t: FTeam; sub: string }) {
  return (
    <div className="gm-badge" style={{ ['--tc' as string]: t.color }}>
      {t.logo ? <img src={t.logo} alt="" width={40} height={40} /> : <span className="bw-abbr">{t.abbr}</span>}
      <strong>{t.name}</strong>
      <span className="muted num">{rec(t)}{t.pr ? ` · #${t.pr}` : ''}</span>
      <span className="muted gm-tiny">{sub}</span>
    </div>
  );
}

function News({ L }: { L: League }) {
  return (
    <section className="gm-card gm-news">
      <p className="m-kicker">News</p>
      <ul>{L.news.slice(0, 14).map((n, i) => <li key={`${i}${n}`}>{n}</li>)}</ul>
    </section>
  );
}

function Recap({ L, act }: { L: League; act: Act }) {
  const h = L.hist[0], champ = teamOf(L, h.champ);
  const won = h.champ === L.you;
  return (
    <div className="gm-grid">
      <div className="gm-col">
        <section className={`gm-card gm-recap${won ? ' gm-won' : ''}`} style={{ ['--tc' as string]: champ.color }}>
          <p className="m-kicker">{L.year} season</p>
          <p className="gm-big">{won ? 'Champions.' : h.finish + '.'}</p>
          <p className="muted">{won ? `The ${champ.name} win the Unbeaten Bowl. +15 credits.` : `The ${champ.city} ${champ.name} win the Unbeaten Bowl.`} You went {h.w}-{h.l}{h.t ? `-${h.t}` : ''}.</p>
          {h.leaders.length > 0 && <ul className="gm-leaders">{h.leaders.map((x) => <li key={x}>{x}</li>)}</ul>}
          <button type="button" className="btn btn-primary btn-lg" onClick={() => act(startOffseason)}>Start the offseason</button>
        </section>
      </div>
      <News L={L} />
    </div>
  );
}

function Resign({ L, act }: { L: League; act: Act }) {
  const ex = expiring(L), t = myTeam(L);
  return (
    <section className="gm-card">
      <p className="m-kicker">Contracts up</p>
      <p className="gm-big">Who stays?</p>
      <p className="muted">Everyone is a year older. Players you do not re-sign leave in free agency. Cap space after this year&apos;s deals: {money(L.cap - payroll(t) + ex.reduce((s, p) => s + p.sal, 0))}.{L.chem < 40 ? ' Chemistry is low, so asks are higher.' : L.chem > 75 ? ' Chemistry is high, so players give you a discount.' : ''}</p>
      {ex.length === 0 ? <p>No contracts are up.</p> : (
        <div className="gm-scroll"><table className="gm-table">
          <thead><tr><th scope="col">Pos</th><th scope="col">Player</th><th scope="col">Age</th><th scope="col">OVR</th><th scope="col">Asks</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
          <tbody>{ex.map((p) => (
            <tr key={p.id}><td>{p.p}</td><td>{p.n}</td><td className="num">{p.age}</td><td className="num"><Ovr p={p} /></td><td className="num">{money(askFor(L, p))}</td>
              <td><button type="button" className="btn btn-sm" onClick={() => act((l) => resign(l, p.id))}>Re-sign</button></td></tr>
          ))}</tbody>
        </table></div>
      )}
      <button type="button" className="btn btn-primary btn-lg" style={{ marginTop: 12 }} onClick={() => act(toDraft)}>On to the draft</button>
    </section>
  );
}

function DraftRoom({ L, act }: { L: League; act: Act }) {
  const [pos, setPos] = useState<Pos | 'ALL'>('ALL');
  const d = L.draft!, n = d.order.length, clock = onTheClock(L);
  const round = Math.floor(d.pick / n) + 1, inRound = (d.pick % n) + 1;
  const pool = d.pool.filter((p) => pos === 'ALL' || p.p === pos).sort((a, b) => b.o - a.o).slice(0, 60);
  const need = POSITIONS.filter((p) => depth(myTeam(L))[p].length < 2 && p !== 'K');
  return (
    <div className="gm-grid">
      <section className="gm-card gm-col">
        <p className="m-kicker">Draft · Round {round} of {DRAFT_ROUNDS}, pick {inRound}</p>
        <p className="gm-big">{clock === L.you ? 'You are on the clock.' : 'Waiting.'}</p>
        <p className="muted">Prospects are made up for your league. Potential is a scouting grade and can be off. {need.length ? `Thin spots: ${need.join(', ')}.` : ''}</p>
        <PosFilter pos={pos} setPos={setPos} />
        <div className="gm-scroll"><table className="gm-table">
          <thead><tr><th scope="col">Pos</th><th scope="col">Prospect</th><th scope="col">Age</th><th scope="col">OVR</th><th scope="col">Pot.</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
          <tbody>{pool.map((p) => (
            <tr key={p.id}><td>{p.p}</td><td>{p.n}</td><td className="num">{p.age}</td><td className="num">{p.o}</td><td><span className={`gm-grade g-${scoutGrade(L, p)}`}>{scoutGrade(L, p)}</span></td>
              <td><button type="button" className="btn btn-sm btn-primary" disabled={clock !== L.you} onClick={() => act((l) => draftPick(l, p.id))}>Draft</button></td></tr>
          ))}</tbody>
        </table></div>
        <button type="button" className="btn" style={{ marginTop: 10 }} disabled={clock !== L.you} onClick={() => act(autoPick)}>Best available</button>
      </section>
      <section className="gm-card gm-news">
        <p className="m-kicker">Picks</p>
        <ul>{[...d.log].reverse().slice(0, 16).map((x) => <li key={x.id} className={x.abbr === L.you ? 'me' : ''}><span className="num">{x.pick}.</span> {x.abbr}: {x.p} {x.n} ({x.o})</li>)}</ul>
      </section>
    </div>
  );
}

function PosFilter({ pos, setPos }: { pos: Pos | 'ALL'; setPos: (p: Pos | 'ALL') => void }) {
  return (
    <div className="gm-pos" role="group" aria-label="Position">
      {(['ALL', ...POSITIONS] as const).map((p) => <button key={p} type="button" className={pos === p ? 'on' : ''} aria-pressed={pos === p} onClick={() => setPos(p)}>{p === 'ALL' ? 'All' : p}</button>)}
    </div>
  );
}

function FreeAgency({ L, act, offseason }: { L: League; act: Act; offseason?: boolean }) {
  const [pos, setPos] = useState<Pos | 'ALL'>('ALL');
  const t = myTeam(L), over = overLimit(L);
  const keen = interest(L);
  const list = L.fa.filter((p) => pos === 'ALL' || p.p === pos).sort((a, b) => b.o - a.o).slice(0, 50);
  return (
    <section className="gm-card">
      <p className="m-kicker">Free agency</p>
      {offseason && <p className="gm-big">Fill the holes.</p>}
      <p className="muted">Roster {t.roster.length} of {ROSTER_MAX} · cap space {money(capSpace(L, t))} · interest in your team: {keen > 0.75 ? 'high, so they take a little less' : keen < 0.5 ? 'low, so they want more' : 'fair'}.</p>
      <PosFilter pos={pos} setPos={setPos} />
      <div className="gm-scroll"><table className="gm-table">
        <thead><tr><th scope="col">Pos</th><th scope="col">Player</th><th scope="col">Age</th><th scope="col">OVR</th><th scope="col">Asks</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
        <tbody>{list.map((p) => (
          <tr key={p.id}><td>{p.p}</td><td>{p.n}</td><td className="num">{p.age}</td><td className="num">{p.o}</td><td className="num">{money(faAsk(L, p))}</td>
            <td><button type="button" className="btn btn-sm" disabled={t.roster.length >= ROSTER_MAX || faAsk(L, p) > capSpace(L, t)} onClick={() => act((l) => sign(l, p.id))}>Sign</button></td></tr>
        ))}</tbody>
      </table></div>
      {offseason && <>
        {over > 0 && <p className="hint" role="status">Release {over} {over === 1 ? 'player' : 'players'} on the Roster tab to get down to {ROSTER_MAX}.</p>}
        <button type="button" className="btn btn-primary btn-lg" style={{ marginTop: 12 }} disabled={over > 0} onClick={() => act(startSeason)}>Start the {L.year + 1} season</button>
      </>}
    </section>
  );
}

// ---------------------------------------------------------------- roster

function Ovr({ p }: { p: FPlayer }) {
  return <>{p.o}{p.pot > p.o + 2 && p.age <= 26 ? <span className="gm-up" title={`Room to grow, up to about ${p.pot}`}> ↑</span> : null}</>;
}

function Roster({ L, act }: { L: League; act: Act }) {
  const [view, setView] = useState<'team' | 'fa'>('team');
  const t = myTeam(L), d = depth(t), st = starters(t);
  return (
    <section className="gm-card">
      <div className="gm-pos" role="group" aria-label="View">
        <button type="button" className={view === 'team' ? 'on' : ''} aria-pressed={view === 'team'} onClick={() => setView('team')}>Your roster ({t.roster.length})</button>
        <button type="button" className={view === 'fa' ? 'on' : ''} aria-pressed={view === 'fa'} onClick={() => setView('fa')}>Free agents ({L.fa.length})</button>
      </div>
      {view === 'fa' ? <FreeAgency L={L} act={act} /> : <>
        <p className="muted">Payroll {money(payroll(t))} of {money(L.cap)}{t.dead ? ` (incl. ${money(t.dead)} dead money)` : ''}. Training costs credits, once a player a season. Cutting a player leaves half his salary on this year&apos;s cap.</p>
        <div className="gm-scroll"><table className="gm-table gm-roster">
          <thead><tr><th scope="col">Pos</th><th scope="col">Player</th><th scope="col">Age</th><th scope="col">OVR</th><th scope="col">Contract</th><th scope="col">Season</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {POSITIONS.flatMap((pos) => d[pos].map((p) => {
              const s = L.stats[p.id];
              return (
                <tr key={p.id} className={st.has(p.id) ? 'st' : ''}>
                  <td>{p.p}</td>
                  <td>{p.n}{st.has(p.id) && <span className="gm-tag">Starter</span>}{p.inj > 0 && <span className="gm-tag gm-inj">Out {p.inj} wk</span>}{p.dr && <span className="gm-tag">Rookie</span>}</td>
                  <td className="num">{p.age}</td>
                  <td className="num"><Ovr p={p} /></td>
                  <td className="num">{money(p.sal)} × {p.yrs}</td>
                  <td className="gm-tiny">{s ? statLine(p.p, s) : ''}</td>
                  <td className="gm-acts">
                    <button type="button" className="btn btn-sm" disabled={L.trained.includes(p.id) || L.cc < trainCost(p) || p.o >= 99} onClick={() => act((l) => train(l, p.id))}>{L.trained.includes(p.id) ? 'Trained' : `Train (${trainCost(p)})`}</button>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => { if (window.confirm(`Release ${p.n}? Half his salary stays on this year's cap.`)) act((l) => release(l, p.id)); }}>Cut</button>
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table></div>
      </>}
    </section>
  );
}

function statLine(pos: Pos, s: SStats) {
  if (pos === 'QB' && s.pa) return `${s.pc}/${s.pa}, ${s.py} yds, ${s.ptd} TD, ${s.int} INT`;
  if (s.ra && s.ra >= s.rec) return `${s.ra} car, ${s.ry} yds, ${s.rtd} TD`;
  if (s.rec) return `${s.rec} rec, ${s.ryd} yds, ${s.rectd} TD`;
  return '';
}

// ---------------------------------------------------------------- league tables

function Standings({ L }: { L: League }) {
  const confs = [...new Set(L.teams.map((t) => t.conf))].sort();
  return (
    <div className="gm-stand">
      {confs.map((c) => (
        <section key={c} className="gm-card">
          <p className="m-kicker">{c}</p>
          {[...new Set(L.teams.filter((t) => t.conf === c).map((t) => t.div))].sort().map((dv) => (
            <div key={dv} className="gm-scroll"><table className="gm-table gm-div">
              <caption>{dv}</caption>
              <thead><tr><th scope="col">Team</th><th scope="col">W-L-T</th><th scope="col">PF</th><th scope="col">PA</th></tr></thead>
              <tbody>{L.teams.filter((t) => t.div === dv).sort(byRecord).map((t) => (
                <tr key={t.abbr} className={t.abbr === L.you ? 'me' : ''}><td><span className="gm-dot" style={{ background: t.color }} />{t.city} {t.name}</td><td className="num">{t.w}-{t.l}-{t.t}</td><td className="num">{t.pf}</td><td className="num">{t.pa}</td></tr>
              ))}</tbody>
            </table></div>
          ))}
        </section>
      ))}
    </div>
  );
}

function Rankings({ L }: { L: League }) {
  const ts = [...L.teams].sort((a, b) => (a.pr ?? 99) - (b.pr ?? 99));
  return (
    <section className="gm-card">
      <p className="m-kicker">Power rankings · updated every week</p>
      <div className="gm-scroll"><table className="gm-table">
        <thead><tr><th scope="col">#</th><th scope="col">Move</th><th scope="col">Team</th><th scope="col">Record</th><th scope="col">OFF</th><th scope="col">DEF</th></tr></thead>
        <tbody>{ts.map((t) => {
          const mv = (t.pr0 ?? t.pr ?? 0) - (t.pr ?? 0), r = ratingsOf(L, t);
          return (
            <tr key={t.abbr} className={t.abbr === L.you ? 'me' : ''}>
              <td className="num">{t.pr}</td>
              <td className={`num gm-move ${mv > 0 ? 'up' : mv < 0 ? 'down' : ''}`}>{mv > 0 ? `▲ ${mv}` : mv < 0 ? `▼ ${-mv}` : '·'}</td>
              <td><span className="gm-dot" style={{ background: t.color }} />{t.city} {t.name}</td>
              <td className="num">{rec(t)}</td><td className="num">{r.offense}</td><td className="num">{r.defense}</td>
            </tr>
          );
        })}</tbody>
      </table></div>
    </section>
  );
}

function Schedule({ L }: { L: League }) {
  return (
    <section className="gm-card">
      <p className="m-kicker">{L.year} schedule</p>
      <ol className="gm-sched">
        {L.sched.map((w, i) => {
          const m = w.find((x) => x.h === L.you || x.a === L.you);
          if (!m) return <li key={i}><span className="num">W{i + 1}</span><span className="muted">Bye</span></li>;
          const home = m.h === L.you, opp = teamOf(L, home ? m.a : m.h);
          const done = m.hs !== undefined, us = home ? m.hs : m.as, them = home ? m.as : m.hs;
          const res = done ? (us! > them! ? 'W' : us! < them! ? 'L' : 'T') : '';
          return (
            <li key={i} className={i === L.week && L.phase === 'season' ? 'now' : ''}>
              <span className="num">W{i + 1}</span>
              <span><span className="gm-dot" style={{ background: opp.color }} />{home ? 'vs' : 'at'} {opp.city} {opp.name}</span>
              {done && <span className={`num gm-res r-${res}`}>{res} {us}-{them}{m.ot ? ' OT' : ''}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------- front office

const FAC: [keyof League['fac'], string, string][] = [
  ['train', 'Training facility', 'Young players grow faster during the season and the offseason, and training gains more.'],
  ['rehab', 'Rehab center', 'Injured players come back sooner.'],
  ['stadium', 'Stadium', 'More credits from every home game.'],
];
const STAFF: [keyof League['staff'], string, string][] = [
  ['oc', 'Offensive coordinator', 'Better accuracy, hands, routes and blocking on your side of the ball.'],
  ['dc', 'Defensive coordinator', 'A better pass rush, coverage and tackling.'],
];

function Office({ L, act, reset }: { L: League; act: Act; reset: () => void }) {
  return (
    <div className="gm-office">
      <section className="gm-card">
        <p className="m-kicker">Coaching credits: {L.cc}</p>
        <p className="muted">Earned every game: more for wins, playoff wins, a big crowd and a title. Spend them here and on training.</p>
      </section>
      {FAC.map(([k, name, what]) => (
        <section key={k} className="gm-card gm-up-card">
          <p className="gm-up-t">{name}</p>
          <Pips n={L.fac[k]} />
          <p className="muted">{what}</p>
          <button type="button" className="btn btn-sm" disabled={L.fac[k] >= 5 || L.cc < facilityCost(L.fac[k])} onClick={() => act((l) => upgradeFacility(l, k))}>{L.fac[k] >= 5 ? 'Maxed' : `Upgrade (${facilityCost(L.fac[k])})`}</button>
        </section>
      ))}
      {STAFF.map(([k, name, what]) => (
        <section key={k} className="gm-card gm-up-card">
          <p className="gm-up-t">{name}</p>
          <Pips n={L.staff[k]} />
          <p className="muted">{what}</p>
          <button type="button" className="btn btn-sm" disabled={L.staff[k] >= 5 || L.cc < staffCost(L.staff[k])} onClick={() => act((l) => upgradeStaff(l, k))}>{L.staff[k] >= 5 ? 'The best there is' : `Hire a better one (${staffCost(L.staff[k])})`}</button>
        </section>
      ))}
      <section className="gm-card gm-up-card">
        <p className="gm-up-t">Team dinner</p>
        <p className="muted">Chemistry +8. Happy players play better and ask for less.</p>
        <button type="button" className="btn btn-sm" disabled={L.cc < DINNER_COST || L.chem >= 100} onClick={() => act(teamDinner)}>Book it ({DINNER_COST})</button>
      </section>
      <section className="gm-card gm-up-card">
        <p className="gm-up-t">Start over</p>
        <p className="muted">Delete this league and pick a new team.</p>
        <button type="button" className="btn btn-sm btn-ghost" onClick={reset}>Delete league</button>
      </section>
    </div>
  );
}

function Pips({ n }: { n: number }) {
  return <span className="gm-pips" aria-label={`Level ${n} of 5`}>{[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= n ? 'on' : ''} />)}</span>;
}

function History({ L }: { L: League }) {
  const titles = L.hist.filter((h) => h.champ === L.you).length;
  return (
    <section className="gm-card">
      <p className="m-kicker">{L.hist.length} {L.hist.length === 1 ? 'season' : 'seasons'} · {titles} {titles === 1 ? 'title' : 'titles'}</p>
      {L.hist.length === 0 ? <p className="muted">Finish a season to start your record book.</p> : (
        <ul className="gm-hist">
          {L.hist.map((h) => (
            <li key={h.year} className={h.champ === L.you ? 'gm-won' : ''}>
              <p><strong>{h.year}</strong> · <span className="num">{h.w}-{h.l}{h.t ? `-${h.t}` : ''}</span> · {h.finish}{h.champ !== L.you ? ` · Champion: ${h.champ}` : ''}</p>
              {h.leaders.length > 0 && <p className="muted gm-tiny">{h.leaders.join(' · ')}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface GmRow { username: string | null; team: string; titles: number; seasons: number; wins: number; losses: number }
function Gms() {
  const [rows, setRows] = useState<GmRow[] | null>(null);
  useEffect(() => { void fetch('/api/bowl/gms').then((r) => r.json()).then((b) => setRows(b.rows ?? [])).catch(() => setRows([])); }, []);
  return (
    <section className="gm-card">
      <p className="m-kicker">GM rankings · most titles, then most wins</p>
      <p className="muted">Signed-in GMs whose leagues save to their account. <Link href="/leaderboard?game=unbeaten-bowl&period=today">Daily match leaderboard</Link></p>
      {!rows ? <div className="skeleton" style={{ height: 120 }} /> : rows.length === 0 ? <p>Nobody has finished a season yet. Be the first.</p> : (
        <div className="gm-scroll"><table className="gm-table">
          <thead><tr><th scope="col">#</th><th scope="col">GM</th><th scope="col">Team</th><th scope="col">Titles</th><th scope="col">Seasons</th><th scope="col">Record</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={`${r.username}${i}`}><td className="num">{i + 1}</td><td>{r.username ?? 'Player'}</td><td>{r.team}</td><td className="num">{r.titles}</td><td className="num">{r.seasons}</td><td className="num">{r.wins}-{r.losses}</td></tr>)}</tbody>
        </table></div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- playing a game

function FranchiseGame({ L, onDone }: { L: League; onDone: (r: { pf: number; pa: number; stats: Record<string, Partial<SStats>> }) => void }) {
  const g = myGame(L)!;
  const home = g.h === L.you, oppTeam = teamOf(L, home ? g.a : g.h), me = myTeam(L);
  const key = `${L.id}:${L.year}:${L.phase}:${L.week}:${L.po?.round ?? 0}`;
  const you = useMemo(() => ratingsOf(L, me), [L, me]);
  const opp = useMemo(() => ratingsOf(L, oppTeam), [L, oppTeam]);
  const theirs = useMemo(() => oppDrives(key, you, opp), [key, you, opp]);
  const youFirst = useMemo(() => createRng(`${key}:coin`).next() < 0.5, [key]);
  const label = L.phase === 'playoffs' ? PLAYOFF_ROUNDS[L.po!.round] : `Week ${L.week + 1}`;
  const finish = (r: GameOver) => {
    // Box score names back to roster ids.
    const stats: Record<string, Partial<SStats>> = {};
    for (const [n, s] of Object.entries(r.stats)) { const p = me.roster.find((x) => x.n === n); if (p) stats[p.id] = s; }
    onDone({ pf: r.pf, pa: r.pa, stats });
  };
  return (
    <BowlGame you={you} opp={opp} theirs={theirs} youFirst={youFirst} luckSeed={key} label={label}
      final={(r) => <>
        {L.phase === 'playoffs' && r.pf === r.pa && <p className="muted">Tied. Overtime decides it.</p>}
        <button type="button" className="btn btn-primary btn-lg" onClick={() => finish(r)}>Continue</button>
      </>} />
  );
}

