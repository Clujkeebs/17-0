'use client';
import { useState } from 'react';
import { MiniGameShell } from '../MiniGameShell';
import { TeamTag } from '../TeamTag';
import { PlayerFace } from '@/components/game/PlayerFace';

type Meta = { slug: string; name: string; tagline: string; howTo: string[] };

/* ------------------------------------------------------------------ basketball */
type Trait = 'scoring' | 'rebounding' | 'playmaking' | 'steals' | 'blocks';
interface HOpt { id: string; name: string; position: string; img: string | null; team: string; teamColor: string; logoUrl: string | null; ppg: number; rpg: number; apg: number; spg: number; bpg: number }
interface HP { traits: { key: Trait; label: string; hint: string }[]; rounds: { team: { name: string; abbr: string; color: string; logo: string | null }; season: string; options: HOpt[] }[] }
interface HLine { score: number; line: { ppg?: number; rpg?: number; apg?: number; spg?: number; bpg?: number }; from: Record<Trait, string> }
interface HD extends HLine { best: HLine }
const TRAIT_LABEL: Record<Trait, string> = { scoring: 'Scoring', rebounding: 'Rebounding', playmaking: 'Playmaking', steals: 'Steals', blocks: 'Blocks' };

function HSummary({ title, l }: { title: string; l: HLine }) {
  const x = l.line;
  return (
    <div className="m-opt" style={{ cursor: 'default', display: 'block' }}>
      <p className="m-kicker" style={{ margin: '0 0 6px' }}>{title}</p>
      <p className="m-big" style={{ margin: '0 0 8px' }}><span className="num">{x.ppg ?? 0}</span> pts, <span className="num">{x.rpg ?? 0}</span> reb, <span className="num">{x.apg ?? 0}</span> ast, <span className="num">{x.spg ?? 0}</span> stl, <span className="num">{x.bpg ?? 0}</span> blk</p>
      <p className="muted" style={{ margin: '0 0 6px' }}>Build score <strong className="num">{l.score}</strong> (100 is a star at all five)</p>
      <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
        {(Object.keys(TRAIT_LABEL) as Trait[]).map((t) => <li key={t}>{TRAIT_LABEL[t]}: {l.from[t]}</li>)}
      </ul>
    </div>
  );
}

/** Build a Player for college basketball: one real season from each of five programs, each lending one skill. */
export function HoopsBuild({ signedIn, meta }: { signedIn: boolean; meta: Meta }) {
  return (
    <MiniGameShell<HP> {...meta} signedIn={signedIn}
      render={({ puzzle, submit, busy }) => <HoopsPlay puzzle={puzzle} submit={submit} busy={busy} />}
      renderResult={(r) => {
        const d = r.detail as HD;
        return <div style={{ display: 'grid', gap: 12 }}><HSummary title="Your player" l={d} /><HSummary title="Best build on this board" l={d.best} /></div>;
      }} />
  );
}

function HoopsPlay({ puzzle, submit, busy }: { puzzle: HP; submit: (a: unknown) => Promise<unknown>; busy: boolean }) {
  const [pick, setPick] = useState<(number | null)[]>(puzzle.rounds.map(() => null));
  const [trait, setTrait] = useState<(Trait | null)[]>(puzzle.rounds.map(() => null));
  const ready = pick.every((x) => x !== null) && trait.every((x) => x !== null);
  const setT = (i: number, t: Trait) => setTrait((cur) => cur.map((x, k) => (k === i ? t : x === t ? null : x)));
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {puzzle.rounds.map((r, i) => (
        <section key={r.team.abbr + i} className="m-card sb-club" aria-label={`${r.team.name} ${r.season}: pick a player and a skill`}>
          <p className="m-kicker" style={{ margin: '0 0 8px' }}>Program {i + 1} · <TeamTag abbr={r.team.abbr} logoUrl={r.team.logo} color={r.team.color} /> {r.team.name}, {r.season}</p>
          <div role="radiogroup" aria-label={`${r.team.name} players`} style={{ display: 'grid', gap: 8 }}>
            {r.options.map((o, k) => (
              <button key={o.id} type="button" role="radio" aria-checked={pick[i] === k} className={`m-opt${pick[i] === k ? ' on' : ''}`} disabled={busy}
                onClick={() => setPick((cur) => cur.map((x, j) => (j === i ? k : x)))} style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span className="m-who"><PlayerFace name={o.name} src={o.img} color={o.teamColor} size={40} /><span><strong>{o.name}</strong><br /><span className="muted">{o.position}</span></span></span>
                <span className="num muted" style={{ textAlign: 'right', fontSize: '.85rem' }}>{o.ppg} PTS · {o.rpg} REB<br />{o.apg} AST · {o.spg} STL · {o.bpg} BLK</span>
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label={`Skill from ${r.team.name}`} className="seg" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            {puzzle.traits.map((t) => (
              <button key={t.key} type="button" role="radio" aria-checked={trait[i] === t.key} className={trait[i] === t.key ? 'on' : ''} disabled={busy} title={t.hint} onClick={() => setT(i, t.key)}>{t.label}</button>
            ))}
          </div>
        </section>
      ))}
      <button type="button" className="btn btn-primary" disabled={!ready || busy} onClick={() => void submit(pick.map((p, i) => ({ pick: p, trait: trait[i] })))}>{busy ? 'Building' : 'Build my player'}</button>
      <p className="hint" style={{ margin: 0 }}>Each skill uses one stat from the season you give it to: points, rebounds, assists, steals or blocks per game. Use each skill once.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ football */
interface FOpt { id: string; skill: string; name: string; position: string; img: string | null; text: string }
interface FP { skills: string[]; rounds: { school: { name: string; abbr: string; color: string; logo: string | null }; season: number; options: FOpt[] }[] }
interface FFrom { skill: string; name: string; season: number; school: string; text: string }
interface FD { score: number; from: FFrom[]; best: { score: number; from: FFrom[] } }

function FSummary({ title, score, from }: { title: string; score: number; from: FFrom[] }) {
  return (
    <div className="m-opt" style={{ cursor: 'default', display: 'block' }}>
      <p className="m-kicker" style={{ margin: '0 0 6px' }}>{title}</p>
      <p className="m-big" style={{ margin: '0 0 8px' }}>Build score <span className="num">{score}</span></p>
      <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
        {from.map((f) => <li key={f.skill}>{f.skill}: {f.name}, {f.school} {f.season} ({f.text})</li>)}
      </ul>
    </div>
  );
}

/** Build a Player for college football: five teams, each lending the skill of its best performer that season. */
export function FootballBuild({ signedIn, meta }: { signedIn: boolean; meta: Meta }) {
  return (
    <MiniGameShell<FP> {...meta} signedIn={signedIn}
      render={({ puzzle, submit, busy }) => <FootballPlay puzzle={puzzle} submit={submit} busy={busy} />}
      renderResult={(r) => {
        const d = r.detail as FD;
        return <div style={{ display: 'grid', gap: 12 }}><FSummary title="Your player" score={d.score} from={d.from} /><FSummary title="Best build on this board" score={d.best.score} from={d.best.from} /></div>;
      }} />
  );
}

function FootballPlay({ puzzle, submit, busy }: { puzzle: FP; submit: (a: unknown) => Promise<unknown>; busy: boolean }) {
  const [pick, setPick] = useState<(number | null)[]>(puzzle.rounds.map(() => null));
  const ready = pick.every((x) => x !== null);
  const taken = (i: number, k: number) => pick.some((x, j) => j !== i && x === k);
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {puzzle.rounds.map((r, i) => (
        <section key={r.school.abbr + i} className="m-card sb-club" aria-label={`${r.school.name} ${r.season}: take one skill`}>
          <p className="m-kicker" style={{ margin: '0 0 8px' }}>Team {i + 1} · <TeamTag abbr={r.school.abbr} logoUrl={r.school.logo} color={r.school.color} /> {r.school.name}, {r.season}</p>
          <div role="radiogroup" aria-label={`${r.school.name} skills`} style={{ display: 'grid', gap: 8 }}>
            {r.options.map((o, k) => (
              <button key={o.id} type="button" role="radio" aria-checked={pick[i] === k} className={`m-opt${pick[i] === k ? ' on' : ''}`} disabled={busy || taken(i, k)}
                onClick={() => setPick((cur) => cur.map((x, j) => (j === i ? k : x)))} style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span className="m-who"><PlayerFace name={o.name} src={o.img} color={r.school.color} size={40} /><span><strong>{o.skill}</strong><br /><span className="muted">{o.name}{o.position ? `, ${o.position}` : ''}</span></span></span>
                <span className="num muted" style={{ textAlign: 'right', fontSize: '.85rem', maxWidth: '45%' }}>{o.text}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
      <button type="button" className="btn btn-primary" disabled={!ready || busy} onClick={() => void submit(pick)}>{busy ? 'Building' : 'Build my player'}</button>
      <p className="hint" style={{ margin: 0 }}>Five different skills, one from each team. A skill someone else already supplies is greyed out.</p>
    </div>
  );
}
