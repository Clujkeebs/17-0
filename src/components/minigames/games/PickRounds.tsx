'use client';
import { useState } from 'react';
import { MiniGameShell } from '../MiniGameShell';
import { TeamTag } from '../TeamTag';
import { PlayerFace } from '@/components/game/PlayerFace';

interface Card { id: string; name: string; position: string; team: string; teamColor: string; logoUrl?: string | null; img: string | null }
interface P { rounds: { prompt: string; options: Card[] }[] }
interface D { prompt: string; pick: number; correct: number; right: boolean; options: (Card & { note: string })[] }
type Meta = { slug: string; name: string; tagline: string; howTo: string[] };

function Face({ c }: { c: Card }) {
  return (
    <span className="m-who">
      <PlayerFace name={c.name} src={c.img} color={c.teamColor} size={44} />
      <span><strong>{c.name}</strong><br /><span className="muted">{c.position} · <TeamTag abbr={c.team} logoUrl={c.logoUrl} color={c.teamColor} /></span></span>
    </span>
  );
}

/** Shared play screen for games where every round is "tap one card". */
export function PickRounds({ signedIn, meta }: { signedIn: boolean; meta: Meta }) {
  return (
    <MiniGameShell<P> {...meta} signedIn={signedIn}
      render={({ puzzle, submit, busy }) => <Play puzzle={puzzle} submit={submit} busy={busy} />}
      renderResult={(r) => (
        <ol style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
          {(r.detail as D[]).map((d, i) => (
            <li key={i} className="m-opt" style={{ cursor: 'default', display: 'block' }}>
              <p className="m-kicker" style={{ margin: '0 0 8px' }}>Round {i + 1} · {d.right ? 'Right' : 'Missed'}</p>
              <div style={{ display: 'grid', gap: 8 }}>
                {d.options.map((o, k) => (
                  <div key={o.id} className="m-row" style={{ justifyContent: 'space-between', fontWeight: k === d.correct ? 700 : 400, opacity: k === d.correct || k === d.pick ? 1 : 0.7 }}>
                    <Face c={o} />
                    <span className="num">{o.note}{k === d.correct ? ' ✓' : k === d.pick ? ' ✗' : ''}</span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )} />
  );
}

function Play({ puzzle, submit, busy }: { puzzle: P; submit: (a: unknown) => Promise<unknown>; busy: boolean }) {
  const [picks, setPicks] = useState<number[]>([]);
  const n = puzzle.rounds.length;
  const i = picks.length;
  const r = puzzle.rounds[i];
  if (!r) return <p className="muted">{busy ? 'Scoring' : 'Submitting'}</p>;
  const choose = (k: number) => {
    const next = [...picks, k];
    setPicks(next);
    if (next.length === n) void submit(next);
  };
  return (
    <div>
      <div className="m-progress" role="img" aria-label={`Round ${i + 1} of ${n}`}>{puzzle.rounds.map((_, k) => <span key={k} className={k <= i ? 'on' : ''} />)}</div>
      <p className="m-kicker">Round {i + 1} of {n}</p>
      <p className="m-big">{r.prompt}</p>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: r.options.length === 2 ? 'repeat(auto-fit, minmax(220px, 1fr))' : '1fr' }}>
        {r.options.map((o, k) => (
          <button key={o.id} type="button" className="m-opt" onClick={() => choose(k)} disabled={busy} style={{ textAlign: 'left' }}>
            <Face c={o} />
          </button>
        ))}
      </div>
    </div>
  );
}
