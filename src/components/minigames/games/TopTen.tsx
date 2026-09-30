'use client';
import { useEffect, useRef, useState } from 'react';
import { MiniGameShell } from '../MiniGameShell';
import { PlayerFace } from '@/components/game/PlayerFace';
import './group-c.css';

interface P { seed: string; group: string; groupName: string; size: number }
interface Hit { id: string; name: string; team: string; ovr: number; rank: number }
interface Opt { id: string; name: string; position: string; team: string; teamColor: string; img: string | null }
interface D { strikes: number; groupName: string; rows: { rank: number; name: string; team: string; ovr: number; found: boolean }[] }
type Meta = { slug: string; name: string; tagline: string; howTo: string[] };

export function TopTen({ signedIn, meta }: { signedIn: boolean; meta: Meta }) {
  return (
    <MiniGameShell<P> {...meta} signedIn={signedIn}
      render={({ puzzle, submit, busy }) => <Play key={puzzle.seed} puzzle={puzzle} submit={submit} busy={busy} />}
      renderResult={(r) => {
        const d = r.detail as D;
        return (
          <>
            <p className="muted" style={{ marginTop: 0 }}>Top ten {d.groupName.toLowerCase()}s. {d.strikes} strike{d.strikes === 1 ? '' : 's'}. {r.score} pts.</p>
            <ol className="gc-board">
              {d.rows.map((x) => (
                <li key={x.rank} className={`gc-slot ${x.found ? 'hit' : 'miss'}`}>
                  <span className="gc-rank num">{x.rank}</span>
                  <span className="gc-name">{x.name} <span className="muted" style={{ fontWeight: 400 }}>{x.team}</span></span>
                  <span className="num" style={{ fontWeight: 700 }}>{x.ovr}</span>
                  <span className="gc-tag">{x.found ? 'Found' : 'Missed'}</span>
                </li>
              ))}
            </ol>
          </>
        );
      }} />
  );
}

function Play({ puzzle, submit, busy }: { puzzle: P; submit: (a: unknown) => Promise<unknown>; busy: boolean }) {
  const [guesses, setGuesses] = useState<string[]>([]);
  const [hits, setHits] = useState<Hit[]>([]);
  const [strikes, setStrikes] = useState(0);
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState(false);
  const done = strikes >= 3 || hits.length === puzzle.size;

  const guess = async (o: Opt) => {
    if (guesses.includes(o.id)) { setMsg(`${o.name} is already on the board.`); return; }
    setPending(true);
    try {
      const res = await fetch(`/api/mini/top-ten/check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seed: puzzle.seed, guess: { id: o.id } }) });
      const body = await res.json();
      if (!res.ok) { setMsg(body.error ?? 'Could not check that one.'); return; }
      const f = body.feedback as { hit: boolean; rank?: number; name: string; team?: string; ovr?: number };
      const g = [...guesses, o.id];
      setGuesses(g);
      if (f.hit) {
        const h = [...hits, { id: o.id, name: f.name, team: f.team!, ovr: f.ovr!, rank: f.rank! }];
        setHits(h);
        setMsg(`Right. ${f.name} is number ${f.rank}.`);
        if (h.length === puzzle.size) void submit({ guesses: g });
      } else {
        const s = strikes + 1;
        setStrikes(s);
        setMsg(`Wrong. ${f.name} is not in the top ten. Strike ${s}.`);
        if (s >= 3) void submit({ guesses: g });
      }
    } finally { setPending(false); }
  };

  return (
    <div>
      <div className="m-row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <p className="m-big" style={{ margin: 0 }}>Top ten {puzzle.groupName.toLowerCase()}s</p>
        <div className="gc-strikes" aria-label={`${strikes} of 3 strikes`}>
          <span className="gc-tag">Strikes</span>
          {[0, 1, 2].map((i) => <span key={i} className={`gc-strike ${i < strikes ? 'on' : ''}`} aria-hidden>{i < strikes ? 'X' : ''}</span>)}
        </div>
      </div>
      <Search pos={puzzle.group} disabled={done || busy || pending} onPick={guess} label={`Name a ${puzzle.groupName.toLowerCase()}`} />
      <p className="gc-feedback" aria-live="polite">{msg}</p>
      <ol className="gc-board" style={{ marginTop: 12 }}>
        {Array.from({ length: puzzle.size }, (_, i) => {
          const h = hits.find((x) => x.rank === i + 1);
          return (
            <li key={i} className={`gc-slot ${h ? 'hit' : ''}`}>
              <span className="gc-rank num">{i + 1}</span>
              <span className="gc-name">{h ? <>{h.name} <span className="muted" style={{ fontWeight: 400 }}>{h.team}</span></> : <span className="muted" style={{ fontWeight: 400 }}>Open</span>}</span>
              {h && <span className="num" style={{ fontWeight: 700 }}>{h.ovr}</span>}
            </li>
          );
        })}
      </ol>
      <div className="m-row" style={{ marginTop: 16, justifyContent: 'space-between' }}>
        <span className="muted">{hits.length} of {puzzle.size} found</span>
        <button type="button" className="btn" disabled={busy || done} onClick={() => void submit({ guesses })}>Give up</button>
      </div>
    </div>
  );
}

export function Search({ pos, disabled, onPick, label }: { pos: string; disabled: boolean; onPick: (o: Opt) => void; label: string }) {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState<Opt[]>([]);
  const [act, setAct] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (q.trim().length < 2) { setOpts([]); return; }
    const c = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/mini-search?q=${encodeURIComponent(q)}&pos=${pos}`, { signal: c.signal }).then((r) => r.json()).then((b) => { setOpts(b.results ?? []); setAct(0); }).catch(() => {});
    }, 150);
    return () => { clearTimeout(t); c.abort(); };
  }, [q, pos]);
  useEffect(() => { if (!disabled) ref.current?.focus(); }, [disabled]);
  const pick = (o: Opt) => { setQ(''); setOpts([]); onPick(o); };
  return (
    <div className="gc-search">
      <label className="gc-label" htmlFor="gc-q">{label}</label>
      <input id="gc-q" ref={ref} value={q} disabled={disabled} autoComplete="off" placeholder="Start typing a name"
        role="combobox" aria-expanded={opts.length > 0} aria-controls="gc-q-list" aria-activedescendant={opts[act] ? `gc-o-${act}` : undefined}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setAct((a) => Math.min(a + 1, opts.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setAct((a) => Math.max(a - 1, 0)); }
          else if (e.key === 'Enter' && opts[act]) { e.preventDefault(); pick(opts[act]); }
          else if (e.key === 'Escape') setOpts([]);
        }} />
      {opts.length > 0 && (
        <ul className="gc-list" id="gc-q-list" role="listbox">
          {opts.map((o, i) => (
            <li key={o.id} id={`gc-o-${i}`} role="option" aria-selected={i === act} onMouseDown={(e) => { e.preventDefault(); pick(o); }} onMouseEnter={() => setAct(i)}>
              <PlayerFace name={o.name} src={o.img} color={o.teamColor} size={32} />
              <span><strong>{o.name}</strong> <span className="muted">{o.position} · {o.team}</span></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
