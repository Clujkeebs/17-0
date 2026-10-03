'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MiniGameShell, type RenderArgs } from '../MiniGameShell';
import './puzzles.css';

type Meta = { slug: string; name: string; tagline: string; howTo: string[] };
interface P { slots: { rank: number; hint: string }[] }
interface D { list: { rank: number; name: string; hint: string; found: boolean }[]; n: number }

/** Now and All-time are separate lists; this switches between the two for the same league. */
function Switch({ listKey }: { listKey: string }) {
  const [lg, when] = listKey.split('-');
  return (
    <nav className="seg" aria-label="List" style={{ marginBottom: 16 }}>
      <Link href={`/games/top-100-${lg}-now`} className={when === 'now' ? 'on' : ''} aria-current={when === 'now' ? 'page' : undefined}>Now</Link>
      <Link href={`/games/top-100-${lg}-all`} className={when === 'all' ? 'on' : ''} aria-current={when === 'all' ? 'page' : undefined}>All-time</Link>
    </nav>
  );
}

export function Top100({ signedIn, meta, listKey }: { signedIn: boolean; meta: Meta; listKey: string }) {
  return (
    <>
      <div className="container" style={{ paddingTop: 16 }}><Switch listKey={listKey} /></div>
      <MiniGameShell<P> {...meta} signedIn={signedIn}
        render={(a) => <Play {...a} slug={meta.slug} />}
        renderResult={(r) => {
          const d = r.detail as D;
          return <ol className="t100-grid">{d.list.map((e) => <li key={e.rank} className={e.found ? 'found' : 'missed'}><span className="t100-r num">{e.rank}</span><span className="t100-n">{e.name}</span><span className="t100-h">{e.hint}</span></li>)}</ol>;
        }} />
    </>
  );
}

function Play({ puzzle, submit, busy, seed, slug }: RenderArgs<P> & { slug: string }) {
  const [found, setFound] = useState<Record<number, string>>({});
  const [guesses, setGuesses] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [checking, setChecking] = useState(false);
  const [secs, setSecs] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { const id = setInterval(() => setSecs((s) => s + 1), 1000); return () => clearInterval(id); }, []);
  const n = Object.keys(found).length;

  async function guess(e: React.FormEvent) {
    e.preventDefault();
    const name = q.trim();
    if (name.length < 3 || checking) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/mini/${slug}/check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seed, guess: { name } }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(body.error ?? 'Could not check.'); return; }
      const fb = body.feedback as { hit: boolean; rank?: number; name?: string; message?: string };
      setGuesses((g) => [...g, name]);
      if (fb.hit && fb.rank) {
        if (found[fb.rank]) setMsg(`Already found ${fb.name}.`);
        else { setFound((f) => ({ ...f, [fb.rank!]: fb.name! })); setMsg(`#${fb.rank} ${fb.name}`); setQ(''); }
        if (n + (found[fb.rank] ? 0 : 1) === 100) await submit({ guesses: [...guesses, name] });
      } else setMsg(fb.message ?? 'Not on this list.');
    } finally { setChecking(false); input.current?.focus(); }
  }

  return (
    <div className="t100">
      <form onSubmit={guess} className="t100-bar">
        <label htmlFor="t100-q" className="sr-only">Type a player&apos;s name</label>
        <input id="t100-q" ref={input} type="search" autoComplete="off" autoFocus placeholder="Type a name" value={q} onChange={(e) => setQ(e.target.value)} disabled={busy} />
        <span className="t100-count num" aria-live="polite">{n}/100</span>
        <span className="t100-time num">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</span>
      </form>
      <p className="hint" aria-live="polite" style={{ minHeight: '1.4em' }}>{msg}</p>
      <ol className="t100-grid">
        {puzzle.slots.map((s) => <li key={s.rank} className={found[s.rank] ? 'found' : ''}><span className="t100-r num">{s.rank}</span><span className="t100-n">{found[s.rank] ?? ''}</span><span className="t100-h">{s.hint}</span></li>)}
      </ol>
      <div className="row" style={{ marginTop: 16, justifyContent: 'center' }}>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => { if (n === 0 || window.confirm(`Finish with ${n}/100?`)) void submit({ guesses }); }}>{busy ? 'Scoring' : n === 0 ? 'Give up' : `Finish with ${n}`}</button>
      </div>
    </div>
  );
}
