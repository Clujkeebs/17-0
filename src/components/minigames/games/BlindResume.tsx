'use client';
import { useEffect, useRef, useState } from 'react';
import { MiniGameShell } from '../MiniGameShell';
import { PlayerFace } from '@/components/game/PlayerFace';
import './group-b.css';

interface Card { id: string; name: string; position: string; team: string; teamColor: string; img: string | null }
interface Profile { position: string; archetype: string | null; age: number | null; yearsPro: number | null; heightInches: number | null; weightLbs: number | null; ovr: number; ratings: { label: string; value: number }[] }
interface P { seed: string; rounds: { profile: Profile; options: Card[] }[] }
interface D { rounds: { answer: string; team: string; position: string; pick: string; ok: boolean; confident: boolean }[]; score: number; max: number }
interface FB { ok: boolean; answerId: string; name: string; team: string }
type Meta = { slug: string; name: string; tagline: string; howTo: string[] };

const height = (h: number | null) => (h ? `${Math.floor(h / 12)}'${h % 12}"` : 'N/A');

export function BlindResume({ signedIn, meta }: { signedIn: boolean; meta: Meta }) {
  return (
    <MiniGameShell<P> {...meta} signedIn={signedIn}
      render={({ puzzle, submit, busy }) => <Play puzzle={puzzle} submit={submit} busy={busy} slug={meta.slug} />}
      renderResult={(r) => {
        const d = r.detail as D;
        return (
          <>
            <p className="muted" style={{ marginTop: -8 }}>{d.score} of {d.max} points</p>
            <ol className="m-grid" style={{ listStyle: 'none', padding: 0 }}>
              {d.rounds.map((x, i) => (
                <li key={i} className={`m-opt gb-reveal ${x.ok ? 'right' : 'wrong'}`} style={{ cursor: 'default', animationDelay: `${i * 60}ms` }}>
                  <span style={{ flex: 1 }}><strong>{x.answer}</strong> <span className="muted">{x.position} · {x.team}</span>{!x.ok && <><br /><span className="muted">You picked {x.pick}</span></>}</span>
                  {x.confident && <span className="m-pill">Confident</span>}
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
  const [picks, setPicks] = useState<string[]>([]);
  const [results, setResults] = useState<boolean[]>([]);
  const [confident, setConfident] = useState<number | null>(null);
  const [fb, setFb] = useState<FB | null>(null);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState('');
  const nextRef = useRef<HTMLButtonElement>(null);
  const i = picks.length - (fb ? 1 : 0);
  const n = puzzle.rounds.length;
  const r = puzzle.rounds[i];

  useEffect(() => { if (fb) nextRef.current?.focus(); }, [fb]);

  const choose = async (id: string) => {
    if (fb || checking) return;
    setChecking(true); setErr('');
    try {
      const res = await fetch(`/api/mini/${slug}/check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seed: puzzle.seed, guess: { round: i, pick: id } }) });
      const body = await res.json();
      if (!res.ok) { setErr(body.error ?? 'Could not check that pick.'); return; }
      setPicks((p) => [...p, id]);
      setResults((x) => [...x, body.feedback.ok]);
      setFb(body.feedback);
    } finally { setChecking(false); }
  };
  const next = () => {
    setFb(null);
    if (picks.length === n) void submit({ picks, confident });
  };

  if (!r) return <p className="muted">{busy ? 'Scoring' : 'Submitting'}</p>;
  const pr = r.profile;
  const lockedConf = confident !== null && confident !== i;
  return (
    <div>
      <div className="m-progress" role="img" aria-label={`Round ${i + 1} of ${n}`}>{puzzle.rounds.map((_, k) => <span key={k} className={k < results.length ? (results[k] ? 'ok' : 'bad') : k === i ? 'on' : ''} />)}</div>
      <p className="m-kicker">Round {i + 1} of {n}</p>
      <p className="m-big" style={{ margin: '0 0 12px' }}>Whose résumé is this?</p>
      <div className="gb-bio">
        <span className="m-pill"><strong>{pr.position}</strong></span>
        {pr.archetype && <span className="m-pill">{pr.archetype}</span>}
        <span className="m-pill">Age {pr.age ?? 'N/A'}</span>
        <span className="m-pill">{pr.yearsPro == null ? 'Years N/A' : pr.yearsPro === 0 ? 'Rookie' : `${pr.yearsPro} yrs pro`}</span>
        <span className="m-pill">{height(pr.heightInches)}, {pr.weightLbs ?? 'N/A'} lbs</span>
      </div>
      <dl className="gb-sheet">
        <div className="gb-stat hi"><dt>Overall</dt><dd className="num">{pr.ovr}</dd></div>
        {pr.ratings.map((x) => <div key={x.label} className="gb-stat"><dt>{x.label}</dt><dd className="num">{x.value}</dd></div>)}
      </dl>

      <div className="m-row" style={{ marginBottom: 12 }}>
        <button type="button" className="gb-toggle" aria-pressed={confident === i} disabled={!!fb || lockedConf} onClick={() => setConfident(confident === i ? null : i)}>
          {confident === i ? 'Confident: on' : 'Go confident'}
        </button>
        <span className="muted" style={{ fontSize: '.85rem' }}>{lockedConf ? `Used on round ${confident! + 1}.` : 'Once per game. Right is worth 2, wrong costs 1.'}</span>
      </div>

      <div className="m-grid" role="group" aria-label="Options" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {r.options.map((c) => {
          const state = fb ? (c.id === fb.answerId ? 'right' : c.id === picks[i] ? 'wrong' : '') : '';
          return (
            <button key={c.id} type="button" className={`m-opt ${state}`} onClick={() => choose(c.id)} disabled={busy || checking || !!fb} aria-pressed={fb ? c.id === picks[i] : undefined}>
              <PlayerFace name={c.name} src={c.img} color={c.teamColor} size={44} />
              <span style={{ flex: 1 }}><strong style={{ display: 'block' }}>{c.name}</strong><span className="muted">{c.position} · {c.team}</span></span>
              {state && <span>{state === 'right' ? 'Answer' : 'Your pick'}</span>}
            </button>
          );
        })}
      </div>

      <div aria-live="polite" className="gb-feedback">
        {err && <span className="danger">{err}</span>}
        {fb && <span className="gb-reveal">{fb.ok ? 'Right.' : 'Wrong.'} That was {fb.name}, {fb.team}.{confident === i ? (fb.ok ? ' Confidence paid.' : ' Confidence cost you.') : ''}</span>}
      </div>
      {fb && (
        <div className="gb-actions">
          <span className="muted">{results.filter(Boolean).length} right so far</span>
          <button ref={nextRef} type="button" className="btn btn-primary" onClick={next} disabled={busy}>{picks.length === n ? 'See results' : 'Next round'}</button>
        </div>
      )}
    </div>
  );
}
