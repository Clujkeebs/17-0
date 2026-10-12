'use client';
import { useCallback, useMemo, useState } from 'react';
import { MiniGameShell } from '../MiniGameShell';
import { bowlMatchup, oppDrives, type BowlTeam } from '@/lib/game/bowl';
import { createRng } from '@/lib/game/prng';
import { BowlGame } from '../bowl/BowlGame';
import { Franchise } from '../bowl/Franchise';
import '../bowl.css';

type Meta = { slug: string; name: string; tagline: string; howTo: string[] };
interface P { seed: string; today: boolean; teams: BowlTeam[]; fixed: string | null; drives: number }
interface D { you: string; opp: string; youName: string; oppName: string; pf: number; pa: number; drives: number[]; theirs: number[] }

const LAST_TEAM = 'bowl:quick-team';

export function UnbeatenBowl({ signedIn, meta, gm }: { signedIn: boolean; meta: Meta; gm?: boolean }) {
  return (
    <MiniGameShell<P> {...meta} signedIn={signedIn}
      labels={{ today: 'Daily match', casual: 'Quick play' }}
      extra={{ label: 'GM mode', kicker: 'GM mode · Your franchise', node: <Franchise signedIn={signedIn} />, initial: gm }}
      render={({ puzzle, submit, busy, seed, mode }) => <Bowl puzzle={puzzle} seed={seed} today={mode === 'today'} submit={submit} busy={busy} />}
      renderResult={(r) => {
        const d = r.detail as D;
        return (
          <div className="bw-box">
            <p className="bw-final">{d.pf > d.pa ? 'Final. You win.' : d.pf < d.pa ? 'Final. You lose.' : 'Final. A tie.'}</p>
            <table className="bw-lines">
              <thead><tr><th scope="col">Team</th>{d.drives.map((_, i) => <th key={i} scope="col">D{i + 1}</th>)}<th scope="col">T</th></tr></thead>
              <tbody>
                <tr><th scope="row">{d.youName}</th>{d.drives.map((p, i) => <td key={i} className="num">{p}</td>)}<td className="num"><strong>{d.pf}</strong></td></tr>
                <tr><th scope="row">{d.oppName}</th>{d.theirs.map((p, i) => <td key={i} className="num">{p}</td>)}<td className="num"><strong>{d.pa}</strong></td></tr>
              </tbody>
            </table>
          </div>
        );
      }} />
  );
}

function Bowl({ puzzle, seed, today, submit, busy }: { puzzle: P; seed: string; today: boolean; submit: (a: unknown) => Promise<unknown>; busy: boolean }) {
  const [team, setTeam] = useState<string | null>(puzzle.fixed);
  const pick = (abbr: string) => { try { localStorage.setItem(LAST_TEAM, abbr); } catch { /* private mode */ } setTeam(abbr); };
  if (!team) return <TeamPicker teams={puzzle.teams} onPick={pick} />;
  return <Match key={team} puzzle={puzzle} seed={seed} today={today} team={team} submit={submit} busy={busy} />;
}

function TeamPicker({ teams, onPick }: { teams: BowlTeam[]; onPick: (abbr: string) => void }) {
  // Quick play: one tap to go again with your usual team, or a random one.
  const [lastTeam] = useState(() => { try { return typeof window === 'undefined' ? null : localStorage.getItem(LAST_TEAM); } catch { return null; } });
  const last = teams.find((t) => t.abbr === lastTeam);
  const random = useCallback(() => onPick(teams[Math.floor(Math.random() * teams.length)].abbr), [teams, onPick]);
  return (
    <div>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {last && <button type="button" className="btn btn-primary btn-lg" onClick={() => onPick(last.abbr)}>Play as the {last.name}</button>}
        <button type="button" className={`btn btn-lg${last ? '' : ' btn-primary'}`} onClick={random}>Random team</button>
      </div>
      <p className="m-kicker" style={{ marginTop: 18 }}>Or pick your team</p>
      <p className="muted" style={{ marginTop: 0 }}>Real rosters, real ratings. Your opponent is drawn when you pick.</p>
      <ul className="bw-teams">
        {[...teams].sort((a, b) => b.offense + b.defense - a.offense - a.defense).map((t) => (
          <li key={t.abbr}>
            <button type="button" className="bw-team" style={{ ['--tc' as string]: t.color }} onClick={() => onPick(t.abbr)}>
              {t.logo ? <img src={t.logo} alt="" width={36} height={36} /> : <span className="bw-abbr">{t.abbr}</span>}
              <span><strong>{t.city} {t.name}</strong><span className="muted">{t.qb.name} · OFF {t.offense} · DEF {t.defense}</span></span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Match({ puzzle, seed, today, team, submit, busy }: { puzzle: P; seed: string; today: boolean; team: string; submit: (a: unknown) => Promise<unknown>; busy: boolean }) {
  const { you, opp } = useMemo(() => bowlMatchup(seed, puzzle.teams, puzzle.fixed ?? team), [seed, puzzle, team]);
  const theirs = useMemo(() => oppDrives(seed, you, opp), [seed, you, opp]);
  // Who has the ball first comes from the seed too.
  const youFirst = useMemo(() => createRng(`bowl:${seed}:coin`).next() < 0.5, [seed]);
  // Today: each finished drive is recorded as you play, so a reload cannot replay a bad drive.
  const onDrive = useCallback((idx: number, points: number) => {
    if (today) void fetch('/api/mini/unbeaten-bowl/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seed, guess: { drive: idx, points } }) }).catch(() => {});
  }, [today, seed]);
  return (
    <BowlGame you={you} opp={opp} theirs={theirs} youFirst={youFirst} luckSeed={seed} label={today ? 'Daily match' : 'Quick play'} onDrive={onDrive}
      final={(r) => <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={() => void submit({ team: you.abbr, drives: r.drives })}>{busy ? 'Saving' : 'Post the score'}</button>} />
  );
}
