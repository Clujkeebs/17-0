'use client';
import { useState } from 'react';
import { MiniGameShell } from '../MiniGameShell';
import { TeamTag } from '../TeamTag';
import { PlayerFace } from '@/components/game/PlayerFace';
import './group-b.css';

interface Card { id: string; name: string; position: string; team: string; teamColor: string; logoUrl?: string | null; img: string | null }
interface P { rounds: { player: Card & { age: number | null; yearsPro: number | null; archetype: string | null }; anchors: (Card & { ovr: number })[] }[] }
interface D { name: string; team: string; teamColor?: string; logoUrl?: string | null; img?: string | null; position: string; actual: number; guess: number; points: number }
type Meta = { slug: string; name: string; tagline: string; howTo: string[] };

const LO = 40, HI = 99;
const pct = (v: number) => `${((v - LO) / (HI - LO)) * 100}%`;

export function GuessTheOvr({ signedIn, meta }: { signedIn: boolean; meta: Meta }) {
  return (
    <MiniGameShell<P> {...meta} signedIn={signedIn}
      render={({ puzzle, submit, busy }) => <Play puzzle={puzzle} submit={submit} busy={busy} />}
      renderResult={(r) => (
        <ol className="m-grid" style={{ listStyle: 'none', padding: 0 }}>
          {(r.detail as D[]).map((d, i) => {
            const miss = Math.abs(d.guess - d.actual);
            return (
              <li key={i} className={`m-opt gb-reveal ${miss <= 2 ? 'right' : miss >= 10 ? 'wrong' : ''}`} style={{ cursor: 'default', display: 'block', animationDelay: `${i * 60}ms` }}>
                <span className="m-row" style={{ justifyContent: 'space-between' }}>
                  <span className="m-who"><PlayerFace name={d.name} src={d.img} color={d.teamColor ?? 'var(--green)'} size={36} /><span><strong>{d.name}</strong> <span className="muted">{d.position} · <TeamTag abbr={d.team} logoUrl={d.logoUrl} color={d.teamColor} /></span></span></span>
                  <span className="num"><strong>{d.points}</strong> pts</span>
                </span>
                <span className="muted" style={{ fontSize: '.9rem' }}>Actual <strong className="num" style={{ color: 'var(--bone)' }}>{d.actual}</strong> · You said <strong className="num" style={{ color: 'var(--orange)' }}>{d.guess}</strong> · {miss === 0 ? 'Exact' : `Off by ${miss}`}</span>
                <span className="gb-bar" aria-hidden="true">
                  <b style={{ left: pct(Math.min(d.actual, d.guess)), width: `calc(${pct(Math.max(d.actual, d.guess))} - ${pct(Math.min(d.actual, d.guess))})` }} />
                  <i className="a" style={{ left: pct(d.actual) }} /><i className="g" style={{ left: pct(d.guess) }} />
                </span>
              </li>
            );
          })}
        </ol>
      )} />
  );
}

function Play({ puzzle, submit, busy }: { puzzle: P; submit: (a: unknown) => Promise<unknown>; busy: boolean }) {
  const [guesses, setGuesses] = useState<number[]>([]);
  const [v, setV] = useState(75);
  const n = puzzle.rounds.length;
  const i = guesses.length;
  const r = puzzle.rounds[i];
  const set = (x: number) => setV(Math.max(LO, Math.min(HI, Math.round(x))));
  const lock = () => {
    const next = [...guesses, v];
    setGuesses(next); setV(75);
    if (next.length === n) void submit(next);
  };
  if (!r) return <p className="muted">{busy ? 'Scoring' : 'Submitting'}</p>;
  const p = r.player;
  return (
    <div>
      <div className="m-progress" role="img" aria-label={`Player ${i + 1} of ${n}`}>{puzzle.rounds.map((_, k) => <span key={k} className={k <= i ? 'on' : ''} />)}</div>
      <p className="m-kicker">Player {i + 1} of {n}</p>
      <div className="gb-target">
        <PlayerFace name={p.name} src={p.img} color={p.teamColor} size={64} />
        <div>
          <p className="m-big" style={{ margin: 0 }}>{p.name}</p>
          <p className="muted" style={{ margin: 0 }}>{p.position} · <TeamTag abbr={p.team} logoUrl={p.logoUrl} color={p.teamColor} />{p.age ? ` · Age ${p.age}` : ''}{p.archetype ? ` · ${p.archetype}` : ''}</p>
        </div>
      </div>
      <p className="m-kicker">For reference</p>
      <div className="gb-anchors">
        {r.anchors.map((a) => (
          <div key={a.id} className="gb-anchor">
            <PlayerFace name={a.name} src={a.img} color={a.teamColor} size={32} />
            <span className="n"><strong>{a.name}</strong><br /><span className="muted">{a.position} · <TeamTag abbr={a.team} logoUrl={a.logoUrl} color={a.teamColor} /></span></span>
            <span className="o num" aria-label={`Overall ${a.ovr}`}>{a.ovr}</span>
          </div>
        ))}
      </div>
      <label htmlFor="go-range" className="m-kicker" style={{ display: 'block' }}>Your guess: Madden 27 overall</label>
      <div className="gb-dial">
        <button type="button" className="gb-step" aria-label="Lower by one" onClick={() => set(v - 1)} disabled={v <= LO || busy}>-</button>
        <output htmlFor="go-range" className="num" aria-live="polite">{v}</output>
        <button type="button" className="gb-step" aria-label="Higher by one" onClick={() => set(v + 1)} disabled={v >= HI || busy}>+</button>
      </div>
      <input id="go-range" className="gb-range" type="range" min={LO} max={HI} step={1} value={v} onChange={(e) => set(Number(e.target.value))} disabled={busy} />
      <div className="gb-scale" aria-hidden="true"><span>{LO}</span><span>70</span><span>{HI}</span></div>
      <div className="gb-actions">
        <span className="muted">{i === n - 1 ? 'Last one.' : `${n - i - 1} to go.`}</span>
        <button type="button" className="btn btn-primary" onClick={lock} disabled={busy}>{i === n - 1 ? 'Lock in and score' : 'Lock in'}</button>
      </div>
    </div>
  );
}
