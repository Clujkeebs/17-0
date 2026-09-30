'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Reel, type ReelTeam } from './Reel';
import { SoundToggle } from './SoundToggle';
import { PlayerFace } from './PlayerFace';
import { track } from '@/lib/analytics';
import { ATTRIBUTE_LABELS, POSITION_NAMES, type AttributeKey } from '@/lib/game/attributes';
import { BUILD_CATEGORIES, BUILD_POSITIONS, type BuildPosition } from '@/lib/game/build';
import type { DraftState } from '@/lib/server/draft';
import type { PublicPlayer } from '@/lib/server/games';
import './game.css';

type Draft = DraftState & { token: string };
type Source = PublicPlayer & { teamColor: string; teamName: string };

const BLURB: Record<BuildPosition, string> = {
  QB: 'Arm, touch, and the nerve to stand in.', RB: 'Vision first. Speed is a bonus.', WR: 'Separation plus hands.',
  TE: 'Block like a tackle, catch like a receiver.', EDGE: 'Get home in 2.5 seconds.', LB: 'Diagnose, fill, finish.',
  CB: 'Mirror, press, turn.', S: 'Last line. Do not miss.',
};

async function post(body: object) {
  const res = await fetch('/api/games/build-a-player/spin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Try again.');
  return data;
}

export function BuildGame({ reelPool, initialPosition }: { reelPool: ReelTeam[]; initialPosition: BuildPosition | null }) {
  const router = useRouter();
  const [position, setPosition] = useState<BuildPosition | null>(initialPosition);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [spinKey, setSpinKey] = useState(0);
  const [landed, setLanded] = useState(false);
  const [choices, setChoices] = useState<Partial<Record<AttributeKey, number>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [announce, setAnnounce] = useState('');
  const [showAll, setShowAll] = useState(false);

  const cats = position ? BUILD_CATEGORIES[position] : [];
  const complete = !!draft?.done && cats.every((c) => choices[c] !== undefined);
  const team = draft?.team ?? null;

  const preview = useMemo(() => {
    const vals = cats.filter((c) => choices[c] !== undefined).map((c) => sources[choices[c]!]?.attrs?.[c] ?? 50);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }, [cats, choices, sources]);

  async function start() {
    if (!position) return;
    setBusy('start'); setError(''); setSources([]); setChoices({});
    try {
      const d = await post({ action: 'start', position });
      setDraft(d); setLanded(false); setSpinKey((k) => k + 1);
      track('game_started', { game: 'build-a-player', position });
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  async function act(body: object, label: string, picked?: Source) {
    if (!draft) return;
    setBusy(label); setError('');
    try {
      const d = await post({ ...body, sessionId: draft.sessionId, token: draft.token });
      setDraft({ ...draft, ...d });
      if (picked) setSources((s) => [...s, picked]);
      if (!d.done) { setLanded(false); setShowAll(false); setSpinKey((k) => k + 1); }
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  function bestOfEach() {
    const next: Partial<Record<AttributeKey, number>> = {};
    for (const c of cats) {
      let best = 0;
      sources.forEach((s, i) => { if ((s.attrs?.[c] ?? 0) > (sources[best].attrs?.[c] ?? 0)) best = i; });
      next[c] = best;
    }
    setChoices(next);
  }

  async function grade() {
    if (!draft || !complete) return;
    setBusy('grade'); setError('');
    try {
      const res = await fetch('/api/games/build-a-player/grade', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: draft.sessionId, token: draft.token, choices }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Grading failed.');
      track('game_completed', { game: 'build-a-player', rating: data.result.rating });
      router.push(`/results/${data.id}`);
    } catch (e) { setError((e as Error).message); setBusy(null); }
  }

  if (!draft) {
    return (
      <div className="g-wrap">
        <section className="g-intro" style={{ maxWidth: 'none' }}>
          <p className="g-kicker">Build a Player</p>
          <h1 className="g-title">Five teams.<br />One perfect player.</h1>
          <p className="g-lede">Pick a position. Spin five teams and take one player from each. Then build your player one attribute at a time, taking the best number from whoever has it.</p>
          <div className="b-pos" role="group" aria-label="Position">
            {BUILD_POSITIONS.map((p) => (
              <button key={p} type="button" aria-pressed={position === p} onClick={() => setPosition(p)}>
                <strong>{p}</strong><span>{BLURB[p]}</span>
              </button>
            ))}
          </div>
          <button className="btn btn-primary btn-lg" disabled={!position || !!busy} onClick={start}>{busy ? 'Starting' : position ? `Build a ${position}` : 'Pick a position'}</button>
          {error && <p role="alert" className="field-error">{error}</p>}
        </section>
      </div>
    );
  }

  return (
    <div className="g-wrap g-board">
      <div aria-live="polite" className="sr-only">{announce}</div>
      <div className="g-main">
        <header className="g-head">
          <div>
            <h1 className="g-kicker" style={{ margin: 0 }}>Build a {position ? POSITION_NAMES[position] : 'Player'} · {draft.done ? 'Assemble' : `Spin ${draft.index + 1} of ${draft.total}`}</h1>
            <div className="g-progress" role="progressbar" aria-valuemin={0} aria-valuemax={draft.total} aria-valuenow={draft.picks.length} aria-label="Players drafted">
              {Array.from({ length: draft.total }, (_, i) => <span key={i} className={i < draft.picks.length ? 'on' : i === draft.index ? 'now' : ''} />)}
            </div>
          </div>
          <SoundToggle />
        </header>

        {error && <div role="alert" className="card card-error">{error}</div>}

        {team ? (
          <section className="g-stage" aria-labelledby="clock-h">
            <div className="g-team">
              <Reel pool={reelPool} target={{ id: team.id, abbreviation: team.abbreviation, city: team.city, name: team.name, color: team.color, logoUrl: team.logoUrl }}
                spinKey={`${draft.sessionId}-${spinKey}`} onLand={() => { setLanded(true); setAnnounce(`${team.city} ${team.name}`); }} />
              <div className={`g-team-name ${landed ? 'in' : ''}`}>
                <p className="g-kicker">On the clock</p>
                <h2 id="clock-h">{landed ? <>{team.city} <strong>{team.name}</strong></> : 'Spinning'}</h2>
              </div>
              <button className="btn btn-sm g-respin" onClick={() => act({ action: 'respin' }, 'respin')} disabled={!landed || !!busy || draft.respinsLeft <= 0}>
                Re-spin <span className="num">{draft.respinsLeft} left</span>
              </button>
            </div>
            <div className={`g-roster ${landed ? 'in' : ''}`}>
              <div className="g-group">
                <h3 className="g-group-h"><span>{position}s</span><span className="muted">Take one. You can mix his numbers with the others later.</span></h3>
                <ul className="g-list">
                  {[...team.players].sort((a, b) => b.ovr - a.ovr).slice(0, showAll ? undefined : 6).map((p) => {
                    const top = cats.map((c) => [c, p.attrs?.[c] ?? 0] as const).sort((a, b) => b[1] - a[1]).slice(0, 2);
                    return (
                      <li key={p.id}>
                        <button type="button" className="g-player" disabled={!landed || !!busy}
                          onClick={() => { setAnnounce(`${p.name} added`); act({ action: 'pick', playerId: p.id }, 'pick', { ...p, teamColor: team.color, teamName: team.name }); }}
                          aria-label={`Take ${p.name}, overall ${p.ovr}`}>
                          <PlayerFace name={p.name} src={p.img} color={team.color} size={44} />
                          <span className="g-player-name">{p.name}<span className="g-player-pos">{top.map(([k, v]) => `${ATTRIBUTE_LABELS[k]} ${v}`).join(' · ')}</span></span>
                          <span className="g-ovr num">{p.ovr}</span>
                        </button>
                      </li>
                    );
                  })}
                  {!team.players.length && <li className="muted">No eligible players on this team. Re-spin.</li>}
                </ul>
                {team.players.length > 6 && <button type="button" className="btn-link g-more" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show fewer' : `Show all ${team.players.length}`}</button>}
              </div>
            </div>
          </section>
        ) : (
          <section className="g-stage" style={{ padding: 24 }} aria-labelledby="asm-h">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
              <div>
                <p className="g-kicker">Assemble</p>
                <h2 id="asm-h" style={{ margin: 0, letterSpacing: '-0.03em' }}>Pick whose number you want for each attribute.</h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="g-kicker" style={{ margin: 0 }}>Average so far</p>
                <p className="b-rating num" style={{ margin: 0 }}>{preview ?? '–'}</p>
              </div>
            </div>
            <button className="btn btn-sm" onClick={bestOfEach} style={{ margin: '8px 0 16px' }}>Take the best of each</button>
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Attribute sources">
              <table className="b-grid">
                <thead>
                  <tr><th scope="col" style={{ textAlign: 'left' }}>Attribute</th>
                    {sources.map((s) => <th key={s.id} scope="col" style={{ textAlign: 'center', fontWeight: 600 }}><PlayerFace name={s.name} src={s.img} color={s.teamColor} size={32} /><div style={{ fontSize: '.75rem', marginTop: 4 }}>{s.name.split(' ').slice(-1)[0]}</div></th>)}
                  </tr>
                </thead>
                <tbody>
                  {cats.map((c) => (
                    <tr key={c}>
                      <th scope="row" style={{ textAlign: 'left', fontWeight: 500, textTransform: 'none', letterSpacing: 0, fontSize: '.92rem', color: 'var(--bone)', whiteSpace: 'nowrap' }}>{ATTRIBUTE_LABELS[c]}</th>
                      {sources.map((s, i) => (
                        <td key={s.id}>
                          <button type="button" className="b-cell" aria-pressed={choices[c] === i} aria-label={`${ATTRIBUTE_LABELS[c]} from ${s.name}: ${s.attrs?.[c] ?? 50}`}
                            onClick={() => setChoices((prev) => ({ ...prev, [c]: i }))}>{s.attrs?.[c] ?? 50}</button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <aside className="g-side" aria-label="Your player pool">
        <div className="g-side-inner">
          <p className="g-kicker">Your pool</p>
          <ol className="g-slots">
            {Array.from({ length: draft.total }, (_, i) => {
              const s = sources[i];
              return (
                <li key={i} className={s ? 'filled' : ''}>
                  <span className="g-slot-k">#{i + 1}</span>
                  {s ? <span className="g-slot-v"><PlayerFace name={s.name} src={s.img} color={s.teamColor} size={24} /><span className="g-slot-name">{s.name}</span><span className="num g-slot-ovr">{s.ovr}</span></span>
                    : <span className="g-slot-empty">Open</span>}
                </li>
              );
            })}
          </ol>
          {draft.done && (
            <>
              <p className="g-fine">{Object.keys(choices).length} of {cats.length} attributes chosen</p>
              <button className="btn btn-primary g-side-cta" onClick={grade} disabled={!complete || !!busy}>{busy === 'grade' ? 'Simulating' : 'Grade and simulate'}</button>
            </>
          )}
          <button className="btn-link g-reset" onClick={() => { setDraft(null); setSources([]); setChoices({}); }}>Start over</button>
        </div>
      </aside>
    </div>
  );
}
