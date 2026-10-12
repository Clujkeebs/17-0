'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlayerFace } from '@/components/game/PlayerFace';
import { PlayerPicker } from '@/components/fantasy/PlayerPicker';
import { startSit, type SSPlayer } from '@/lib/fantasy/startsit';
import type { Wide } from '@/lib/fantasy/slim';
import '@/components/fantasy/fantasy.css';

const MAX = 4;
const n1 = (v: number | null) => (v == null ? 'n/a' : v.toFixed(1));

const toSS = (p: Wide): SSPlayer => ({ id: p.id, name: p.name, pos: p.pos, team: p.team, recent: p.recent, ppg: p.ppg, proj: p.proj, games: p.games, rostered: p.rostered, trend: p.trend });

export function StartSit({ players }: { players: Wide[] }) {
  const [picked, setPicked] = useState<Wide[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  // A shared link opens with its players already in.
  useEffect(() => {
    const ids = (new URLSearchParams(window.location.search).get('p') ?? '').split(',');
    setPicked(ids.map((id) => players.find((p) => p.id === id)).filter((p): p is Wide => !!p).slice(0, MAX));
    setLoaded(true);
  }, [players]);
  useEffect(() => {
    if (!loaded) return;
    window.history.replaceState(null, '', picked.length ? `?p=${picked.map((p) => p.id).join(',')}` : window.location.pathname);
  }, [picked, loaded]);

  const verdict = startSit(picked.map(toSS));
  const byId = new Map(picked.map((p) => [p.id, p]));
  const lines = verdict?.lines ?? [];
  const top = Math.max(...lines.map((l) => l.expected), 1);
  const noNumbers = picked.filter((p) => !lines.some((l) => l.id === p.id));

  async function copy() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ }
  }

  return (
    <>
      {picked.length < MAX
        ? <PlayerPicker players={players} label={picked.length ? 'Add another player' : 'Add a player'} exclude={picked.map((p) => p.id)} onPick={(p) => setPicked([...picked, players.find((x) => x.id === p.id)!])} />
        : <p className="muted ss-full">Four is the most. Remove one to add someone else.</p>}

      {verdict ? (
        <section className={`ss-verdict card ss-${verdict.confidence === 'Toss-up' ? 'toss' : verdict.confidence.toLowerCase()}`} aria-live="polite" aria-label="The call">
          <p className="ss-pill">{verdict.confidence === 'Toss-up' ? 'Toss-up' : verdict.confidence === 'Clear' ? 'Clear call' : 'Lean'}</p>
          <h2>{verdict.confidence === 'Toss-up' ? 'Too close to call' : verdict.confidence === 'Clear' ? `Start ${verdict.pick.name}` : `Lean toward ${verdict.pick.name}`}</h2>
          <p className="ss-summary">{verdict.summary}</p>
        </section>
      ) : picked.length >= 2
        ? <p className="card ss-verdict" role="status">We do not have numbers for enough of these players yet.</p>
        : <p className="muted ss-hint">{picked.length ? 'Add one more player to get a call.' : 'Start by searching for a player.'}</p>}

      {(lines.length > 0 || noNumbers.length > 0) && (
        <ol className="ss-cards">
          {lines.map((l, i) => {
            const p = byId.get(l.id)!;
            return (
              <li key={l.id} className={`ss-card${i === 0 && verdict!.confidence !== 'Toss-up' ? ' win' : ''}`}>
                <div className="ss-head">
                  <PlayerFace name={p.name} src={p.img} color={p.teamColor} size={40} />
                  <span className="ss-who"><Link href={`/players/${p.slug}`}><strong>{p.name}</strong></Link><span className="muted">{p.pos}{p.posRank} · {p.team}</span></span>
                  <span className="ss-tag" aria-label={i === 0 ? 'Start' : 'Sit'}>{verdict!.confidence === 'Toss-up' ? 'Even' : i === 0 ? 'Start' : 'Sit'}</span>
                  <button type="button" className="trade-x" aria-label={`Remove ${p.name}`} onClick={() => setPicked(picked.filter((x) => x.id !== p.id))}>×</button>
                </div>
                <div className="ss-bar-row">
                  <span className="ss-bar" aria-hidden="true"><span style={{ width: `${(l.expected / top) * 100}%` }} /></span>
                  <span className="num ss-exp"><strong>{l.expected.toFixed(1)}</strong> <span className="muted">expected</span></span>
                </div>
                <p className="muted ss-parts num">Last 4 {n1(l.parts.recent)} · Season {n1(l.parts.ppg)} · Projection {n1(l.parts.proj)}</p>
                <ul className="ss-notes">{l.notes.map((n, k) => <li key={k}>{n}</li>)}</ul>
              </li>
            );
          })}
          {noNumbers.map((p) => (
            <li key={p.id} className="ss-card dim">
              <div className="ss-head">
                <PlayerFace name={p.name} src={p.img} color={p.teamColor} size={40} />
                <span className="ss-who"><strong>{p.name}</strong><span className="muted">{p.pos} · {p.team}</span></span>
                <button type="button" className="trade-x" aria-label={`Remove ${p.name}`} onClick={() => setPicked(picked.filter((x) => x.id !== p.id))}>×</button>
              </div>
              <p className="muted ss-parts">No games or projection yet, so he is left out of the call.</p>
            </li>
          ))}
        </ol>
      )}

      {picked.length > 0 && (
        <div className="ss-actions">
          <button type="button" className="btn" onClick={copy}>{copied ? 'Link copied' : 'Copy link to this call'}</button>
          <button type="button" className="btn" onClick={() => setPicked([])}>Clear</button>
        </div>
      )}

      <details className="m-how" style={{ marginTop: 24 }}>
        <summary>How the call works</summary>
        <p>Each player gets an expected number of PPR points for this week: half from his last four games, 30 percent from the season average and 20 percent from the projection. If one of those is missing, the other two share the weight.</p>
        <p>The call is Clear when the gap is about 2.5 points or 15 percent, a Lean when it is at least a point, and a Toss-up under that. Matchups, injuries and weather are not counted, so if two players are close, check those before you lock a lineup.</p>
      </details>
    </>
  );
}
