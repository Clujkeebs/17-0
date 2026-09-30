'use client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ShareButton } from '@/components/game/ShareButton';
import { Celebration } from '@/components/game/Celebration';
import { track } from '@/lib/analytics';
import './mini.css';

export type Mode = 'today' | 'casual';
export interface MiniResult { id: string; score: number; summary: string; detail: unknown; perfect: boolean }
interface Loaded { mode: Mode; date: string; seed?: string; puzzle?: unknown; played?: boolean; result?: MiniResult }

export interface RenderArgs<P> {
  puzzle: P;
  mode: Mode;
  /** Submit the final answer. Resolves with the scored result. */
  submit: (answer: unknown) => Promise<MiniResult | null>;
  busy: boolean;
}

/**
 * Shared frame for every daily mini game: Today (ranked, one attempt, account required) and Casual (unlimited).
 * Each game supplies `render` for play and `renderResult` for the reveal.
 */
export function MiniGameShell<P>({ slug, name, tagline, howTo, signedIn, render, renderResult }: {
  slug: string; name: string; tagline: string; howTo: string[]; signedIn: boolean;
  render: (a: RenderArgs<P>) => ReactNode;
  renderResult: (r: MiniResult, puzzle: P | null) => ReactNode;
}) {
  const [mode, setMode] = useState<Mode>(signedIn ? 'today' : 'casual');
  const [data, setData] = useState<Loaded | null>(null);
  const [result, setResult] = useState<MiniResult | null>(null);
  const [error, setError] = useState('');
  const [needsAccount, setNeedsAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [round, setRound] = useState(0);

  const load = useCallback(async (m: Mode) => {
    setError(''); setResult(null); setData(null); setNeedsAccount(false);
    const res = await fetch(`/api/mini/${slug}?mode=${m}`, { cache: 'no-store' });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 && body.requireAccount) { setNeedsAccount(true); return; }
    if (!res.ok) { setError(body.error ?? 'Could not load the puzzle.'); return; }
    setData(body);
    if (body.played && body.result) setResult(body.result);
    else track('game_started', { game: slug, mode: m });
  }, [slug]);

  useEffect(() => { void load(mode); }, [load, mode, round]);

  const submit = async (answer: unknown) => {
    if (!data?.seed) return null;
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/mini/${slug}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode, seed: data.seed, answer }) });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? 'Could not submit.'); return null; }
      setResult(body);
      track('game_completed', { game: slug, mode, score: body.score });
      return body as MiniResult;
    } finally { setBusy(false); }
  };

  return (
    <div className="m-wrap">
      <header className="m-head">
        <div>
          <p className="m-kicker">{mode === 'today' ? `Today · ${data?.date ?? ''} · Ranked` : 'Casual · Unlimited'}</p>
          <h1 className="m-title">{name}</h1>
          <p className="m-tag">{tagline}</p>
        </div>
        <div className="m-modes" role="tablist" aria-label="Mode">
          <button role="tab" aria-selected={mode === 'today'} className={mode === 'today' ? 'on' : ''} onClick={() => setMode('today')}>Today</button>
          <button role="tab" aria-selected={mode === 'casual'} className={mode === 'casual' ? 'on' : ''} onClick={() => { setMode('casual'); setRound((r) => r + 1); }}>Casual</button>
        </div>
      </header>

      {error && <div role="alert" className="card card-error" style={{ marginBottom: 16 }}>{error}</div>}

      {needsAccount && (
        <section className="m-card m-gate">
          <h2>Today is ranked.</h2>
          <p className="muted">Everyone gets the same puzzle, you get one shot, and your score goes on the leaderboard. That needs an account. Casual is open to everyone and unlimited.</p>
          <div className="row">
            <Link className="btn btn-primary" href={`/login?next=/games/${slug}`}>Sign in</Link>
            <Link className="btn" href={`/register?next=/games/${slug}`}>Create an account</Link>
            <button className="btn-link" onClick={() => setMode('casual')}>Play Casual instead</button>
          </div>
        </section>
      )}

      {!needsAccount && !data && !error && <div className="m-card"><div className="skeleton" style={{ height: 240 }} /></div>}

      {data && !result && data.puzzle != null && (
        <section className="m-card">{render({ puzzle: data.puzzle as P, mode, submit, busy })}</section>
      )}

      {result && (
        <section className="m-card m-result" aria-live="polite">
          <p className="m-kicker">{data?.played ? 'You already played Today' : result.perfect ? 'Perfect' : 'Final'}</p>
          {result.perfect && <Celebration tier={{ key: 'perfect', title: 'Perfect.', line: 'Flawless. Share it before anyone says you looked it up.', confetti: true }} />}
          <p className="m-score num">{result.summary}</p>
          {renderResult(result, (data?.puzzle as P) ?? null)}
          <div style={{ marginTop: 20 }}>
            <ShareButton text={`${name}: ${result.summary}${mode === 'today' ? ` (Today, ${data?.date})` : ''}. Beat it on Unbeaten.`} url={`/results/${result.id}`} imageUrl={`/api/og/game-result?id=${result.id}`} fileName={`unbeaten-${slug}.png`} />
          </div>
          <div className="row" style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={() => { setMode('casual'); setRound((r) => r + 1); }}>{mode === 'casual' ? 'Play again' : 'Play Casual'}</button>
            {mode === 'today' && <Link className="btn" href={`/leaderboard?tab=daily&game=${slug}`}>Leaderboard</Link>}
            <Link className="btn" href="/games">More games</Link>
          </div>
        </section>
      )}

      <details className="m-how">
        <summary>How to play</summary>
        <ol>{howTo.map((h) => <li key={h}>{h}</li>)}</ol>
      </details>
    </div>
  );
}
