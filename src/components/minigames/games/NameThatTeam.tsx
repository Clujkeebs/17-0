'use client';
import { useMemo, useState } from 'react';
import { TeamMark } from '@/components/game/Reel';
import { MiniGameShell } from '../MiniGameShell';
import { TeamTag } from '../TeamTag';
import './group-c.css';

interface Team { id: number; abbr: string; name: string; color: string; logoUrl?: string | null }
interface P { seed: string; first: string; total: number; teams: Team[] }
interface D { team: Team; clues: string[]; used: number; solved: boolean; guesses: number[] }
type Meta = { slug: string; name: string; tagline: string; howTo: string[] };

export function NameThatTeam({ signedIn, meta }: { signedIn: boolean; meta: Meta }) {
  return (
    <MiniGameShell<P> {...meta} signedIn={signedIn}
      render={({ puzzle, submit, busy }) => <Play key={puzzle.seed} puzzle={puzzle} submit={submit} busy={busy} />}
      renderResult={(r, p) => {
        const d = r.detail as D;
        const tm = (id: number) => p?.teams.find((t) => t.id === id);
        return (
          <>
            <div className="m-who" style={{ gap: 12, margin: '0 0 4px' }}>
              <TeamMark team={{ abbreviation: d.team.abbr, logoUrl: d.team.logoUrl ?? p?.teams.find((t) => t.id === d.team.id)?.logoUrl ?? null, color: d.team.color, city: '', name: d.team.name }} size={56} alt="" />
              <p className="m-big" style={{ margin: 0 }}>{d.team.name}</p>
            </div>
            <p className="muted" style={{ marginTop: 0 }}>{d.solved ? `Solved on clue ${d.used}.` : 'Not solved in six.'} {r.score} pts.</p>
            <ol className="gc-clues">
              {d.clues.map((c, i) => <li key={i} className={`gc-clue${i < d.used ? '' : ' unused'}`}><b>Clue {i + 1}{i >= d.used ? ' (unused)' : ''}</b>{c}</li>)}
            </ol>
            <p className="gc-label">Your guesses</p>
            <div className="m-row">{d.guesses.map((g, i) => <span key={i} className="m-pill"><TeamTag abbr={tm(g)?.abbr ?? String(g)} logoUrl={tm(g)?.logoUrl} color={tm(g)?.color} label={tm(g)?.name ?? String(g)} />: {g === d.team.id ? 'Right' : 'Wrong'}</span>)}</div>
          </>
        );
      }} />
  );
}

function Play({ puzzle, submit, busy }: { puzzle: P; submit: (a: unknown) => Promise<unknown>; busy: boolean }) {
  const [clues, setClues] = useState([puzzle.first]);
  const [guesses, setGuesses] = useState<number[]>([]);
  const [filter, setFilter] = useState('');
  const [sel, setSel] = useState('');
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState(false);
  const left = puzzle.teams.filter((t) => !guesses.includes(t.id));
  const shown = useMemo(() => { const f = filter.trim().toLowerCase(); return f ? left.filter((t) => t.name.toLowerCase().includes(f) || t.abbr.toLowerCase().startsWith(f)) : left; }, [filter, left]);
  const cur = shown.find((t) => String(t.id) === (sel || String(shown[0]?.id ?? '')));
  const name = (id: number) => puzzle.teams.find((t) => t.id === id)?.name ?? '';

  const guess = async () => {
    const id = Number(sel || shown[0]?.id);
    if (!id) return;
    const g = [...guesses, id];
    setPending(true);
    try {
      const res = await fetch('/api/mini/name-that-team/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seed: puzzle.seed, guess: { guesses: g } }) });
      const body = await res.json();
      if (!res.ok) { setMsg(body.error ?? 'Could not check that one.'); return; }
      const f = body.feedback as { correct: boolean; clues: string[]; done: boolean };
      setGuesses(g); setSel(''); setFilter('');
      if (f.correct) { setMsg(`Right. It is the ${name(id)}.`); void submit(g); return; }
      setClues(f.clues);
      if (f.done) { setMsg(`Wrong. Not the ${name(id)}. Out of clues.`); void submit(g); return; }
      setMsg(`Wrong. Not the ${name(id)}. Clue ${f.clues.length} is up.`);
    } finally { setPending(false); }
  };

  return (
    <div>
      <div className="m-progress" role="img" aria-label={`Clue ${clues.length} of ${puzzle.total}`}>{Array.from({ length: puzzle.total }, (_, k) => <span key={k} className={k < guesses.length ? 'bad' : k < clues.length ? 'on' : ''} />)}</div>
      <p className="m-kicker">Clue {clues.length} of {puzzle.total} · worth {puzzle.total + 1 - clues.length} pts</p>
      <ol className="gc-clues">{clues.map((c, i) => <li key={i} className="gc-clue"><b>Clue {i + 1}</b>{c}</li>)}</ol>
      <form onSubmit={(e) => { e.preventDefault(); void guess(); }} className="m-grid" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
        <div className="gc-search">
          <label className="gc-label" htmlFor="gc-tf">Filter teams</label>
          <input id="gc-tf" value={filter} onChange={(e) => { setFilter(e.target.value); setSel(''); }} placeholder="City, name or abbreviation" autoComplete="off" />
        </div>
        <div className="gc-search">
          <label className="gc-label" htmlFor="gc-ts">Your guess</label>
          <div className="m-who" style={{ display: 'flex', gap: 10 }}>
            {cur ? <TeamMark key={cur.id} team={{ abbreviation: cur.abbr, logoUrl: cur.logoUrl ?? null, color: cur.color, city: '', name: cur.name }} size={40} alt="" /> : <span style={{ width: 40, height: 40, flex: 'none' }} />}
            <select id="gc-ts" style={{ flex: 1, minWidth: 0 }} value={sel || String(shown[0]?.id ?? '')} onChange={(e) => setSel(e.target.value)} size={1}>
              {shown.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.abbr})</option>)}
            </select>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || pending || !shown.length}>Guess</button>
      </form>
      <p className="gc-feedback" aria-live="polite">{msg}</p>
      {guesses.length > 0 && <div className="m-row">{guesses.map((g) => { const t = puzzle.teams.find((x) => x.id === g); return <span key={g} className="m-pill"><TeamTag abbr={t?.abbr ?? ''} logoUrl={t?.logoUrl} color={t?.color} label={name(g)} />: Wrong</span>; })}</div>}
    </div>
  );
}
