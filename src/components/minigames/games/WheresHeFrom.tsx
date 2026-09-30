'use client';
import { useRef, useEffect, useState } from 'react';
import { MiniGameShell } from '../MiniGameShell';
import { TeamTag } from '../TeamTag';
import { PlayerFace } from '@/components/game/PlayerFace';
import { checkGuess } from './checkA';
import './groupA.css';

interface Card { id: string; name: string; position: string; team: string; teamName: string; teamColor: string; logoUrl?: string | null; img: string | null }
interface P { seed: string; rounds: { player: Card; choices: string[] }[] }
interface FB { ok: boolean; correct: string; fact: string }
interface D { name: string; team: string; teamColor?: string; logoUrl?: string | null; img?: string | null; pick: string; correct: string; ok: boolean; fact: string }
type Meta = { slug: string; name: string; tagline: string; howTo: string[] };

export function WheresHeFrom({ signedIn, meta }: { signedIn: boolean; meta: Meta }) {
  return (
    <MiniGameShell<P> {...meta} signedIn={signedIn}
      render={({ puzzle, submit, busy }) => <Play puzzle={puzzle} submit={submit} busy={busy} />}
      renderResult={(r) => (
        <ol className="ga-rev">
          {(r.detail as D[]).map((d, i) => (
            <li key={i} className={`ga-in ${d.ok ? 'right' : 'wrong'}`} style={{ animationDelay: `${i * 50}ms` }}>
              <div className="top"><span className="m-who"><PlayerFace name={d.name} src={d.img} color={d.teamColor ?? 'var(--green)'} size={32} /><strong>{d.name} <span className="muted">· <TeamTag abbr={d.team} logoUrl={d.logoUrl} color={d.teamColor} /></span></strong></span><span>{d.ok ? 'Right' : 'Wrong'}</span></div>
              <div>{d.correct}{!d.ok && <span className="muted"> · you said {d.pick}</span>}</div>
              <div className="oth">{d.fact}</div>
            </li>
          ))}
        </ol>
      )} />
  );
}

function Play({ puzzle, submit, busy }: { puzzle: P; submit: (a: unknown) => Promise<unknown>; busy: boolean }) {
  const [picks, setPicks] = useState<string[]>([]);
  const [oks, setOks] = useState<boolean[]>([]);
  const [fb, setFb] = useState<FB | null>(null);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState('');
  const nextRef = useRef<HTMLButtonElement>(null);
  const i = fb ? picks.length - 1 : picks.length;
  const r = puzzle.rounds[i];
  const total = puzzle.rounds.length;
  let streak = 0; for (let k = oks.length - 1; k >= 0 && oks[k]; k--) streak++;

  useEffect(() => { if (fb) nextRef.current?.focus(); }, [fb]);

  const choose = async (c: string) => {
    setChecking(true); setErr('');
    try {
      const f = await checkGuess<FB>('wheres-he-from', puzzle.seed, { round: i, pick: c });
      setPicks([...picks, c]); setOks([...oks, f.ok]); setFb(f);
    } catch (e) { setErr((e as Error).message); }
    finally { setChecking(false); }
  };
  const advance = () => { setFb(null); if (picks.length === total) void submit(picks); };

  if (!r) return <p className="muted">Scoring</p>;
  const pick = fb ? picks[i] : null;
  return (
    <div>
      <div className="m-progress" role="img" aria-label={`Round ${i + 1} of ${total}`}>{puzzle.rounds.map((_, k) => <span key={k} className={k < oks.length ? (oks[k] ? 'ok' : 'bad') : ''} />)}</div>
      <div className="m-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <p className="m-kicker" style={{ margin: 0 }}>Round {i + 1} of {total}</p>
        {streak >= 2 && <span className="m-pill ga-in">Streak {streak} · +{25 * (streak - 1)} bonus</span>}
      </div>
      <div className="ga-hero">
        <PlayerFace name={r.player.name} src={r.player.img} color={r.player.teamColor} size={72} />
        <div>
          <p className="m-big" style={{ margin: 0 }}>{r.player.name}</p>
          <p className="muted" style={{ margin: 0 }}>{r.player.position} · <TeamTag abbr={r.player.team} logoUrl={r.player.logoUrl} color={r.player.teamColor} label={r.player.teamName} /></p>
        </div>
      </div>
      <p style={{ fontWeight: 600, margin: '0 0 10px' }}>Where did he play college ball?</p>
      <div className="m-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {r.choices.map((c) => {
          const state = !fb ? '' : c === fb.correct ? 'right' : c === pick ? 'wrong' : '';
          return (
            <button key={c} type="button" className={`m-opt ${state}`} disabled={!!fb || checking || busy} aria-pressed={pick === c} onClick={() => choose(c)}>
              <span style={{ flex: 1, fontWeight: 600 }}>{c}</span>
              {state && <span>{state === 'right' ? 'Right' : 'Wrong'}</span>}
            </button>
          );
        })}
      </div>
      <div aria-live="polite">
        {err && <p className="ga-live">{err}</p>}
        {fb && (
          <div className="ga-in">
            <p className="ga-live">{fb.ok ? `Right. ${fb.correct}.` : `Wrong. He went to ${fb.correct}.`}</p>
            <p className="ga-fact">{fb.fact}</p>
          </div>
        )}
      </div>
      {fb && <button ref={nextRef} type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={advance} disabled={busy}>{picks.length === total ? 'See results' : 'Next player'}</button>}
    </div>
  );
}
