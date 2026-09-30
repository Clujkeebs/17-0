'use client';
import { useState } from 'react';
import { MiniGameShell } from '../MiniGameShell';
import { TeamTag } from '../TeamTag';
import { PlayerFace } from '@/components/game/PlayerFace';
import './group-b.css';

interface Card { id: string; name: string; position: string; team: string; teamColor: string; logoUrl?: string | null; img: string | null }
interface P { seed: string; players: Card[]; labels: string[]; lines: number[][] }
interface D { players: { name: string; team: string; teamColor?: string; logoUrl?: string | null; img?: string | null; position: string; line: number; pick: number; ok: boolean }[]; score: number; attempts: number }
type Meta = { slug: string; name: string; tagline: string; howTo: string[] };

const L = 'ABCDE';
const MAX = 3;
/** Compact column label: OVR, initials for two words, first three letters for one. */
const short = (l: string) => (l === 'Overall' ? 'OVR' : l.includes(' ') ? l.split(' ').map((w) => w[0]).join('') : l.slice(0, 3)).toUpperCase();

function Line({ vals, labels }: { vals: number[]; labels: string[] }) {
  return <>{vals.map((v, k) => <span key={k} className={`v num ${k === 0 ? 'ovr' : ''}`}><small title={labels[k]}>{short(labels[k])}</small>{v}</span>)}</>;
}

export function RatingMatch({ signedIn, meta }: { signedIn: boolean; meta: Meta }) {
  return (
    <MiniGameShell<P> {...meta} signedIn={signedIn}
      render={({ puzzle, submit, busy }) => <Play puzzle={puzzle} submit={submit} busy={busy} slug={meta.slug} />}
      renderResult={(r, puzzle) => {
        const d = r.detail as D;
        return (
          <>
            <p className="muted" style={{ marginTop: -8 }}>{d.score} points · {d.attempts} {d.attempts === 1 ? 'attempt' : 'attempts'}</p>
            <ol className="m-grid" style={{ listStyle: 'none', padding: 0 }}>
              {d.players.map((x, i) => (
                <li key={i} className={`m-opt gb-reveal ${x.ok ? 'right' : 'wrong'}`} style={{ cursor: 'default', flexWrap: 'wrap', animationDelay: `${i * 60}ms` }}>
                  <span className="m-who" style={{ flex: '1 1 160px' }}><PlayerFace name={x.name} src={x.img} color={x.teamColor ?? 'var(--green)'} size={36} /><span><strong>{x.name}</strong> <span className="muted">{x.position} · <TeamTag abbr={x.team} logoUrl={x.logoUrl} color={x.teamColor} /></span>{!x.ok && <><br /><span className="muted">You gave him line {L[x.pick]}</span></>}</span></span>
                  {puzzle && <span className="gb-line" style={{ flex: '1 1 260px' }}><span className="gb-tag">{L[x.line]}</span><Line vals={puzzle.lines[x.line]} labels={puzzle.labels} /></span>}
                  <span>{x.ok ? 'Right' : 'Wrong'}</span>
                </li>
              ))}
            </ol>
          </>
        );
      }} />
  );
}

function Play({ puzzle, submit, busy, slug }: { puzzle: P; submit: (a: unknown) => Promise<unknown>; busy: boolean; slug: string }) {
  const n = puzzle.players.length;
  const [pairs, setPairs] = useState<(number | null)[]>(() => Array(n).fill(null));
  const [sel, setSel] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState('');
  const attempt = history.length + 1;
  const full = pairs.every((x) => x !== null);
  const owner = (line: number) => pairs.indexOf(line);

  const assign = (line: number) => {
    if (sel === null) { setMsg('Pick a player first, then his rating line.'); return; }
    setPairs((p) => p.map((x, pi) => (pi === sel ? line : x === line ? null : x)));
    setMsg(`${puzzle.players[sel].name} paired with line ${L[line]}.`);
    const nextOpen = pairs.findIndex((x, pi) => x === null && pi !== sel);
    setSel(nextOpen >= 0 ? nextOpen : null);
  };
  const tapPlayer = (pi: number) => {
    if (sel === pi && pairs[pi] !== null) { setPairs((p) => p.map((x, k) => (k === pi ? null : x))); setMsg(`${puzzle.players[pi].name} unpaired.`); return; }
    setSel(pi);
  };

  const go = async () => {
    if (!full) return;
    if (attempt >= MAX) { void submit({ pairs, attempts: attempt }); return; }
    setChecking(true); setMsg('');
    try {
      const res = await fetch(`/api/mini/${slug}/check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seed: puzzle.seed, guess: { pairs } }) });
      const body = await res.json();
      if (!res.ok) { setMsg(body.error ?? 'Could not check.'); return; }
      const c = body.feedback.correct as number;
      setHistory((h) => [...h, c]);
      if (c === n) { setMsg('All five. Locking it in.'); void submit({ pairs, attempts: attempt }); return; }
      setMsg(`${c} of ${n} right. ${MAX - attempt === 1 ? 'Last attempt is scored.' : `${MAX - attempt} attempts left.`}`);
    } finally { setChecking(false); }
  };

  return (
    <div>
      <div className="m-row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <p className="m-kicker" style={{ margin: 0 }}>Attempt {attempt} of {MAX}</p>
        <span className="gb-dots" aria-hidden="true">{Array.from({ length: MAX }, (_, k) => <span key={k} className={k < history.length ? 'used' : ''} />)}</span>
      </div>
      <p className="m-big" style={{ margin: '0 0 16px' }}>Match each player to his ratings.</p>
      <div className="gb-match">
        <div className="gb-col">
          <h3 id="rm-p">Players</h3>
          <div className="m-grid" role="group" aria-labelledby="rm-p">
            {puzzle.players.map((c, pi) => (
              <button key={c.id} type="button" className="m-opt" aria-pressed={sel === pi} onClick={() => tapPlayer(pi)} disabled={busy || checking}
                aria-label={`${c.name}, ${pairs[pi] === null ? 'unpaired' : `paired with line ${L[pairs[pi]!]}`}`}>
                <PlayerFace name={c.name} src={c.img} color={c.teamColor} size={36} />
                <span style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block' }}>{c.name}</strong><span className="muted">{c.position} · <TeamTag abbr={c.team} logoUrl={c.logoUrl} color={c.teamColor} /></span></span>
                <span className={`gb-tag ${pairs[pi] !== null ? 'on' : ''}`}>{pairs[pi] === null ? '?' : L[pairs[pi]!]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="gb-col">
          <h3 id="rm-l">Rating lines</h3>
          <div className="m-grid" role="group" aria-labelledby="rm-l">
            {puzzle.lines.map((vals, li) => {
              const o = owner(li);
              return (
                <button key={li} type="button" className="m-opt gb-line" onClick={() => assign(li)} disabled={busy || checking}
                  aria-label={`Line ${L[li]}: ${vals.map((v, k) => `${puzzle.labels[k]} ${v}`).join(', ')}${o >= 0 ? `, paired with ${puzzle.players[o].name}` : ''}`}>
                  <span className={`gb-tag ${o >= 0 ? 'on' : ''}`}>{L[li]}</span>
                  <Line vals={vals} labels={puzzle.labels} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <p aria-live="polite" className="gb-feedback">{msg}</p>
      {history.length > 0 && <p className="muted" style={{ margin: '4px 0 0' }}>{history.map((c, k) => `Attempt ${k + 1}: ${c}/${n}`).join(' · ')}</p>}
      <div className="gb-actions">
        <span className="muted">{pairs.filter((x) => x !== null).length} of {n} paired</span>
        <div className="m-row">
          {attempt > 1 && attempt <= MAX && <button type="button" className="btn" disabled={!full || busy || checking} onClick={() => submit({ pairs, attempts: attempt })}>Lock it in</button>}
          <button type="button" className="btn btn-primary" disabled={!full || busy || checking} onClick={go}>{attempt >= MAX ? 'Submit final' : 'Check'}</button>
        </div>
      </div>
    </div>
  );
}
