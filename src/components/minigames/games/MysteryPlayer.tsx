'use client';
import { useState } from 'react';
import { MiniGameShell } from '../MiniGameShell';
import { TeamTag } from '../TeamTag';
import { PlayerFace } from '@/components/game/PlayerFace';
import { TypeaheadA, type SearchHit } from './TypeaheadA';
import { checkGuess } from './checkA';
import './groupA.css';

interface P { seed: string; maxGuesses: number; hintAfter: number }
interface Num { dir: 'up' | 'down' | 'exact' | 'none'; close: boolean; value: number | null }
interface Row {
  player: { id: string; name: string; position: string; team: string; teamColor: string; logoUrl?: string | null; img: string | null; division: string; conference: string };
  correct: boolean; team: string; division: string; position: string; age: Num; jersey: Num; ovr: Num; height: Num;
}
interface FB { row: Row; hint: string | null; answer: { name: string } | null }
interface D { target: { name: string; position: string; team: string; teamColor: string; logoUrl?: string | null; img: string | null; college: string | null; ovr: number }; solved: boolean; used: number; rows: Row[] }
type Meta = { slug: string; name: string; tagline: string; howTo: string[] };

const ht = (n: number | null) => (n == null ? '?' : `${Math.floor(n / 12)}'${n % 12}"`);
const arrow = (n: Num) => (n.dir === 'up' ? '↑ Higher' : n.dir === 'down' ? '↓ Lower' : n.dir === 'exact' ? 'Exact' : 'n/a');
const exactTag = (s: string) => (s === 'exact' ? 'Match' : s === 'partial' ? 'Close' : 'No');

function NumCell({ n, fmt = String }: { n: Num; fmt?: (v: number | null) => string }) {
  const cls = n.dir === 'exact' ? 'exact' : n.close ? 'close' : '';
  return <td className={cls}>{n.value == null ? '?' : fmt(n.value)}<span className="tag">{arrow(n)}{n.close ? ' · close' : ''}</span></td>;
}

export function ClueTable({ rows }: { rows: Row[] }) {
  return (
    <div className="ga-clues" tabIndex={0} aria-label="Clue grid">
      <table>
        <thead><tr><th scope="col">Player</th><th scope="col">Team</th><th scope="col">Division</th><th scope="col">Pos</th><th scope="col">Age</th><th scope="col">No.</th><th scope="col">OVR</th><th scope="col">Height</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="ga-in">
              <td className={r.correct ? 'exact' : ''}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><PlayerFace name={r.player.name} src={r.player.img} color={r.player.teamColor} size={28} />{r.player.name}</span></td>
              <td className={r.team}><TeamTag abbr={r.player.team} logoUrl={r.player.logoUrl} color={r.player.teamColor} size={20} /><span className="tag">{exactTag(r.team)}</span></td>
              <td className={r.division}>{r.player.division}<span className="tag">{r.division === 'exact' ? 'Match' : r.division === 'partial' ? 'Same conf' : 'No'}</span></td>
              <td className={r.position}>{r.player.position}<span className="tag">{r.position === 'exact' ? 'Match' : r.position === 'partial' ? 'Same group' : 'No'}</span></td>
              <NumCell n={r.age} />
              <NumCell n={r.jersey} />
              <NumCell n={r.ovr} />
              <NumCell n={r.height} fmt={ht} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MysteryPlayer({ signedIn, meta }: { signedIn: boolean; meta: Meta }) {
  return (
    <MiniGameShell<P> {...meta} signedIn={signedIn}
      render={({ puzzle, submit, busy }) => <Play puzzle={puzzle} submit={submit} busy={busy} />}
      renderResult={(r) => {
        const d = r.detail as D;
        return (
          <div>
            <div className="ga-hero ga-in">
              <PlayerFace name={d.target.name} src={d.target.img} color={d.target.teamColor} size={64} />
              <div>
                <p className="m-kicker" style={{ margin: 0 }}>{d.solved ? `Solved in ${d.used}` : 'The answer'}</p>
                <p className="m-big" style={{ margin: 0 }}>{d.target.name}</p>
                <p className="muted" style={{ margin: 0 }}>{d.target.position} · <TeamTag abbr={d.target.team} logoUrl={d.target.logoUrl} color={d.target.teamColor} /> · {d.target.ovr} OVR{d.target.college ? ` · ${d.target.college}` : ''}</p>
              </div>
            </div>
            {d.rows.length > 0 && <ClueTable rows={d.rows} />}
          </div>
        );
      }} />
  );
}

function Play({ puzzle, submit, busy }: { puzzle: P; submit: (a: unknown) => Promise<unknown>; busy: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [checking, setChecking] = useState(false);
  const n = rows.length;

  const guess = async (h: SearchHit) => {
    setChecking(true);
    try {
      const fb = await checkGuess<FB>('mystery-player', puzzle.seed, { id: h.id, n: n + 1 });
      const next = [...rows, fb.row];
      setRows(next);
      if (fb.hint) setHint(fb.hint);
      const left = puzzle.maxGuesses - next.length;
      setMsg(fb.row.correct ? `Got him. ${h.name}.` : fb.answer ? `Out of guesses. It was ${fb.answer.name}.` : `Not him. ${left} ${left === 1 ? 'guess' : 'guesses'} left.`);
      if (fb.row.correct || fb.answer) setTimeout(() => void submit(next.map((r) => r.player.id)), 900);
    } catch (e) { setMsg((e as Error).message); }
    finally { setChecking(false); }
  };

  const done = rows.some((r) => r.correct) || n >= puzzle.maxGuesses;
  return (
    <div>
      <div className="m-progress" role="img" aria-label={`Guess ${Math.min(n + 1, puzzle.maxGuesses)} of ${puzzle.maxGuesses}`}>
        {Array.from({ length: puzzle.maxGuesses }, (_, k) => <span key={k} className={k < n ? (rows[k].correct ? 'ok' : 'bad') : ''} />)}
      </div>
      <p className="m-kicker">Guess {Math.min(n + 1, puzzle.maxGuesses)} of {puzzle.maxGuesses}</p>
      {!done && <TypeaheadA autoFocus label="Guess the mystery player" onPick={guess} disabled={checking || busy} usedIds={rows.map((r) => r.player.id)} />}
      <p className="ga-live" aria-live="polite">{busy ? 'Scoring' : msg}</p>
      {hint ? (
        <div className="ga-hint ga-in" aria-live="polite"><span className="m-kicker" style={{ display: 'block', margin: 0 }}>College silhouette</span><span className="sil">{hint}</span></div>
      ) : n > 0 && !done ? <p className="muted" style={{ fontSize: '.85rem' }}>College hint unlocks after guess {puzzle.hintAfter}.</p> : null}
      {rows.length > 0 && <ClueTable rows={rows} />}
    </div>
  );
}
