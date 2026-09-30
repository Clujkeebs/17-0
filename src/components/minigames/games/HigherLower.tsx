'use client';
import { useState } from 'react';
import { MiniGameShell } from '../MiniGameShell';
import { TeamTag } from '../TeamTag';
import { PlayerFace } from '@/components/game/PlayerFace';

interface Card { id: string; name: string; position: string; team: string; teamColor: string; logoUrl?: string | null; img: string | null }
interface P { rounds: { a: Card; b: Card; label: string }[] }
interface D { a: string; b: string; aImg?: string | null; bImg?: string | null; aTeam?: string; bTeam?: string; aColor?: string; bColor?: string; aLogo?: string | null; bLogo?: string | null; label: string; av: number; bv: number; pick: 'a' | 'b'; ok: boolean }

export function HigherLower({ signedIn, meta }: { signedIn: boolean; meta: { slug: string; name: string; tagline: string; howTo: string[] } }) {
  return (
    <MiniGameShell<P> {...meta} signedIn={signedIn}
      render={({ puzzle, submit, busy }) => <Play puzzle={puzzle} submit={submit} busy={busy} />}
      renderResult={(r) => (
        <ol className="m-grid" style={{ listStyle: 'none', padding: 0 }}>
          {(r.detail as D[]).map((d, i) => (
            <li key={i} className={`m-opt ${d.ok ? 'right' : 'wrong'}`} style={{ cursor: 'default' }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block' }}>{d.label}</strong>
                {(['a', 'b'] as const).map((k) => (
                  <span key={k} className="m-who" style={{ display: 'flex', marginTop: 6 }}>
                    <PlayerFace name={d[k]} src={d[`${k}Img`]} color={d[`${k}Color`] ?? 'var(--green)'} size={28} />
                    <span style={{ flex: 1, minWidth: 0 }}>{d[k]} {d[`${k}Team`] && <span className="muted"><TeamTag abbr={d[`${k}Team`]!} logoUrl={d[`${k}Logo`]} color={d[`${k}Color`]} /></span>}</span>
                    <span className="num">{k === 'a' ? d.av : d.bv}</span>
                  </span>
                ))}
              </span>
              <span aria-label={d.ok ? 'correct' : 'wrong'}>{d.ok ? 'Right' : 'Wrong'}</span>
            </li>
          ))}
        </ol>
      )} />
  );
}

function Play({ puzzle, submit, busy }: { puzzle: P; submit: (a: unknown) => Promise<unknown>; busy: boolean }) {
  const [picks, setPicks] = useState<('a' | 'b')[]>([]);
  const i = picks.length;
  const r = puzzle.rounds[i];
  const choose = (x: 'a' | 'b') => {
    const next = [...picks, x];
    setPicks(next);
    if (next.length === puzzle.rounds.length) void submit(next);
  };
  if (!r) return <p className="muted">{busy ? 'Scoring' : 'Submitting'}</p>;
  return (
    <div>
      <div className="m-progress" role="img" aria-label={`Round ${i + 1} of ${puzzle.rounds.length}`}>{puzzle.rounds.map((_, k) => <span key={k} className={k < i ? 'on' : ''} />)}</div>
      <p className="m-kicker">Round {i + 1} of {puzzle.rounds.length}</p>
      <p className="m-big" style={{ margin: '0 0 16px' }}>Who has the higher {r.label.toLowerCase()}?</p>
      <div className="m-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {(['a', 'b'] as const).map((k) => {
          const c = r[k];
          return (
            <button key={k} type="button" className="m-opt" style={{ minHeight: 96 }} onClick={() => choose(k)} disabled={busy}>
              <PlayerFace name={c.name} src={c.img} color={c.teamColor} size={56} />
              <span><strong style={{ display: 'block', fontSize: '1.1rem' }}>{c.name}</strong><span className="muted">{c.position} · <TeamTag abbr={c.team} logoUrl={c.logoUrl} color={c.teamColor} /></span></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
