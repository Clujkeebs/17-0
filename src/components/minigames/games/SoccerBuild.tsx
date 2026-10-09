'use client';
import { useState } from 'react';
import { MiniGameShell } from '../MiniGameShell';
import { TeamTag } from '../TeamTag';
import { PlayerFace } from '@/components/game/PlayerFace';

type Trait = 'finishing' | 'playmaking' | 'fitness';
interface Opt { id: string; name: string; position: string; team: string; teamColor: string; logoUrl?: string | null; img: string | null; goals: number; assists: number; matches: number }
interface P { traits: { key: Trait; label: string; hint: string }[]; rounds: { club: { name: string; abbr: string; color: string; logo: string | null }; options: Opt[] }[] }
interface Line { goals: number; assists: number; matches: number; from: Record<Trait, string> }
interface D extends Line { best: Line }
type Meta = { slug: string; name: string; tagline: string; howTo: string[] };
const LABEL: Record<Trait, string> = { finishing: 'Finishing', playmaking: 'Playmaking', fitness: 'Fitness' };

function Summary({ title, l }: { title: string; l: Line }) {
  return (
    <div className="m-opt" style={{ cursor: 'default', display: 'block' }}>
      <p className="m-kicker" style={{ margin: '0 0 6px' }}>{title}</p>
      <p className="m-big" style={{ margin: '0 0 8px' }}><span className="num">{l.goals}</span> goals, <span className="num">{l.assists}</span> assists in <span className="num">{l.matches}</span> matches</p>
      <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
        {(Object.keys(LABEL) as Trait[]).map((t) => <li key={t}>{LABEL[t]}: {l.from[t]}</li>)}
      </ul>
    </div>
  );
}

/** Build a Soccer Player: one real season from each of three clubs, each lending one trait. */
export function SoccerBuild({ signedIn, meta }: { signedIn: boolean; meta: Meta }) {
  return (
    <MiniGameShell<P> {...meta} signedIn={signedIn}
      render={({ puzzle, submit, busy }) => <Play puzzle={puzzle} submit={submit} busy={busy} />}
      renderResult={(r) => {
        const d = r.detail as D;
        return <div style={{ display: 'grid', gap: 12 }}><Summary title="Your player" l={d} /><Summary title="Best build on this board" l={d.best} /></div>;
      }} />
  );
}

function Play({ puzzle, submit, busy }: { puzzle: P; submit: (a: unknown) => Promise<unknown>; busy: boolean }) {
  const [pick, setPick] = useState<(number | null)[]>(puzzle.rounds.map(() => null));
  const [trait, setTrait] = useState<(Trait | null)[]>(puzzle.rounds.map(() => null));
  const ready = pick.every((x) => x !== null) && trait.every((x) => x !== null);
  const setT = (i: number, t: Trait) => setTrait((cur) => cur.map((x, k) => (k === i ? t : x === t ? null : x)));
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {puzzle.rounds.map((r, i) => (
        <section key={r.club.abbr + i} className="m-card sb-club" aria-label={`${r.club.name}: pick a season and a trait`}>
          <p className="m-kicker" style={{ margin: '0 0 8px' }}>Club {i + 1} · <TeamTag abbr={r.club.abbr} logoUrl={r.club.logo} color={r.club.color} /> {r.club.name}</p>
          <div role="radiogroup" aria-label={`${r.club.name} seasons`} style={{ display: 'grid', gap: 8 }}>
            {r.options.map((o, k) => (
              <button key={o.id} type="button" role="radio" aria-checked={pick[i] === k} className={`m-opt${pick[i] === k ? ' on' : ''}`} disabled={busy}
                onClick={() => setPick((cur) => cur.map((x, j) => (j === i ? k : x)))} style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span className="m-who"><PlayerFace name={o.name} src={o.img} color={o.teamColor} size={40} /><span><strong>{o.name}</strong><br /><span className="muted">{o.position}</span></span></span>
                <span className="num muted" style={{ whiteSpace: 'nowrap' }}>{o.goals} G · {o.assists} A · {o.matches} MP</span>
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label={`Trait from ${r.club.name}`} className="seg" style={{ marginTop: 10 }}>
            {puzzle.traits.map((t) => (
              <button key={t.key} type="button" role="radio" aria-checked={trait[i] === t.key} className={trait[i] === t.key ? 'on' : ''} disabled={busy} title={t.hint} onClick={() => setT(i, t.key)}>{t.label}</button>
            ))}
          </div>
        </section>
      ))}
      <button type="button" className="btn btn-primary" disabled={!ready || busy} onClick={() => void submit(pick.map((p, i) => ({ pick: p, trait: trait[i] })))}>{busy ? 'Building' : 'Build my player'}</button>
      <p className="hint" style={{ margin: 0 }}>Finishing uses goals per match, Playmaking assists per match, Fitness matches played. Each trait goes to one club.</p>
    </div>
  );
}
