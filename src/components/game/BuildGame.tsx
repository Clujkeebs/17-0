'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Reel, type ReelTeam } from './Reel';
import { SoundToggle } from './SoundToggle';
import { CheckIcon } from '../Icons';
import { track } from '@/lib/analytics';
import { ATTRIBUTE_LABELS, POSITION_NAMES, type AttributeKey } from '@/lib/game/attributes';
import { BUILD_CATEGORIES, BUILD_POSITIONS, type BuildPosition } from '@/lib/game/build';
import type { PublicPlayer, PublicTeam } from '@/lib/server/games';

interface Spin { sessionId: string; token: string; teams: PublicTeam[]; respinsLeft: number }

const POSITION_BLURB: Record<BuildPosition, string> = {
  QB: 'Arm, touch, and the nerve to stand in.', RB: 'Vision first. Speed is a bonus.', WR: 'Separation plus hands.',
  TE: 'Block like a tackle, catch like a receiver.', EDGE: 'Get home in 2.5 seconds.', LB: 'Diagnose, fill, finish.',
  CB: 'Mirror, press, turn.', S: 'Last line. Do not miss.',
};

export function BuildGame({ reelPool, initialPosition }: { reelPool: ReelTeam[]; initialPosition: BuildPosition | null }) {
  const router = useRouter();
  const [position, setPosition] = useState<BuildPosition | null>(initialPosition);
  const [spin, setSpin] = useState<Spin | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [chosen, setChosen] = useState<Record<number, PublicPlayer>>({}); // team index -> player
  const [choices, setChoices] = useState<Partial<Record<AttributeKey, number>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [announce, setAnnounce] = useState('');

  const cats = position ? BUILD_CATEGORIES[position] : [];
  const sources = spin ? spin.teams.map((_, i) => chosen[i]).filter(Boolean) : [];
  const poolReady = !!spin && sources.length === spin.teams.length;
  const complete = poolReady && cats.every((c) => choices[c] !== undefined);
  const stage = !spin ? 1 : !poolReady ? 2 : 3;

  const preview = useMemo(() => {
    if (!poolReady) return null;
    const vals = cats.map((c) => (choices[c] !== undefined ? sources[choices[c]!]!.attrs?.[c] ?? 50 : null)).filter((v): v is number => v !== null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }, [poolReady, cats, choices, sources]);

  async function doSpin(pos: BuildPosition) {
    setBusy('spin'); setError(''); setChosen({}); setChoices({}); setRevealed(0);
    try {
      const res = await fetch('/api/games/build-a-player/spin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ position: pos }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Spin failed.');
      setSpin(data);
      track('game_started', { game: 'build-a-player', position: pos });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  }

  async function respin(i: number) {
    if (!spin) return;
    setBusy('respin'); setError('');
    try {
      const res = await fetch('/api/games/build-a-player/spin', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ respin: { sessionId: spin.sessionId, token: spin.token, index: i } }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Re-spin failed.');
      setSpin({ ...spin, teams: data.teams, respinsLeft: data.respinsLeft });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  }

  function bestFill() {
    const next: Partial<Record<AttributeKey, number>> = {};
    for (const c of cats) {
      let best = 0;
      sources.forEach((s, i) => { if ((s!.attrs?.[c] ?? 0) > (sources[best]!.attrs?.[c] ?? 0)) best = i; });
      next[c] = best;
    }
    setChoices(next);
  }

  async function grade() {
    if (!spin || !complete) return;
    setBusy('grade'); setError('');
    try {
      const res = await fetch('/api/games/build-a-player/grade', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: spin.sessionId, token: spin.token, players: spin.teams.map((_, i) => chosen[i].id), choices }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Grading failed.');
      track('game_completed', { game: 'build-a-player', rating: data.result.rating });
      router.push(`/results/${data.id}`);
    } catch (e) { setError((e as Error).message); setBusy(null); }
  }

  return (
    <div className="container section">
      <div aria-live="polite" className="sr-only">{announce}</div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <span className="eyebrow">Build a Player{position ? ` · ${POSITION_NAMES[position]}` : ''}</span>
          <h1 style={{ marginBottom: 0 }}>Five teams. One player.</h1>
        </div>
        <div className="row">
          <div className="dots" role="img" aria-label={`Step ${stage} of 3`}>{[1, 2, 3].map((n) => <span key={n} className={`dot ${stage >= n ? 'on' : ''}`} />)}</div>
          <SoundToggle />
        </div>
      </div>

      {error && <div role="alert" className="card card-error" style={{ marginBottom: 16 }}>{error}</div>}

      {!spin && (
        <section aria-labelledby="pos-h">
          <h2 id="pos-h" style={{ fontSize: '1.2rem' }}>Pick a position</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
            {BUILD_POSITIONS.map((p) => (
              <button key={p} type="button" className="pbtn" aria-pressed={position === p} onClick={() => setPosition(p)} style={{ flexDirection: 'column', alignItems: 'flex-start', minHeight: 84 }}>
                <span className="num" style={{ fontSize: '1.4rem', fontWeight: 800 }}>{p}</span>
                <span className="pos" style={{ letterSpacing: 0 }}>{POSITION_BLURB[p]}</span>
              </button>
            ))}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 20 }} disabled={!position || !!busy} onClick={() => position && doSpin(position)}>
            {busy === 'spin' ? 'Spinning' : 'Spin five teams'}
          </button>
        </section>
      )}

      {spin && (
        <div className="stack">
          {spin.teams.map((t, i) => (
            <section key={`${t.id}-${i}`} className={`team-card ${chosen[i] ? 'drafted' : ''}`} aria-label={`${t.city} ${t.name}`} style={{ opacity: i <= revealed ? 1 : 0.35 }}>
              <div>
                <span className="eyebrow">Team {i + 1}</span>
                {i <= revealed && <Reel pool={reelPool} target={{ abbreviation: t.abbreviation, city: t.city, name: t.name, color: t.color }} delay={i === revealed ? 400 : 0}
                  onLand={() => { setRevealed((r) => Math.max(r, i + 1)); setAnnounce(`Team ${i + 1}: ${t.city} ${t.name}`); }} />}
                {i < revealed && <p style={{ margin: '4px 0 8px', fontWeight: 700 }}>{t.city} {t.name}</p>}
                {i < revealed && !chosen[i] && spin.respinsLeft > 0 && revealed >= spin.teams.length && (
                  <button className="btn btn-sm" onClick={() => respin(i)} disabled={!!busy}>Re-spin ({spin.respinsLeft} left)</button>
                )}
              </div>
              {i < revealed ? (
                <div className="plist">
                  {t.players.map((p) => (
                    <button key={p.id} type="button" className="pbtn" aria-pressed={chosen[i]?.id === p.id} disabled={revealed < spin.teams.length}
                      onClick={() => { setChosen((c) => ({ ...c, [i]: p })); setChoices({}); setAnnounce(`${p.name} added to the pool`); }}>
                      <span><span style={{ display: 'block', fontWeight: 600, fontSize: '.9rem' }}>{p.name}</span><span className="pos">{p.position}</span></span>
                      <span className="ovr">{p.ovr}</span>
                    </button>
                  ))}
                  {!t.players.length && <p className="muted">No eligible players. Re-spin this team.</p>}
                </div>
              ) : <div className="skeleton" style={{ minHeight: 96 }} />}
            </section>
          ))}

          {poolReady && (
            <section className="card" aria-labelledby="asm-h">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h2 id="asm-h" style={{ fontSize: '1.2rem', margin: 0 }}>Assemble your {position}</h2>
                <div className="row">
                  {preview !== null && <span className="muted">Avg of picks <span className="num accent" style={{ fontWeight: 700 }}>{preview}</span></span>}
                  <button className="btn btn-sm" onClick={bestFill}>Take the best of each</button>
                </div>
              </div>
              <p className="hint">For each attribute, choose whose number you want. One player can supply as many attributes as you like.</p>
              <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
                <table className="build-grid">
                  <thead><tr><th scope="col">Attribute</th>{sources.map((s) => <th key={s!.id} scope="col" className="num">{s!.name.split(' ').slice(-1)[0]}</th>)}</tr></thead>
                  <tbody>
                    {cats.map((c) => (
                      <tr key={c}>
                        <th scope="row" style={{ textTransform: 'none', letterSpacing: 0, fontSize: '.9rem', color: 'var(--bone)' }}>{ATTRIBUTE_LABELS[c]}</th>
                        {sources.map((s, i) => {
                          const on = choices[c] === i;
                          return (
                            <td key={s!.id} className="num">
                              <button type="button" className="pbtn" aria-pressed={on} style={{ justifyContent: 'center', minHeight: 40 }}
                                aria-label={`${ATTRIBUTE_LABELS[c]} from ${s!.name}: ${s!.attrs?.[c] ?? 50}`}
                                onClick={() => setChoices((prev) => ({ ...prev, [c]: i }))}>
                                <span className="ovr">{s!.attrs?.[c] ?? 50}</span>{on && <CheckIcon size={14} />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div className="row" style={{ position: 'sticky', bottom: 0, background: 'var(--navy)', padding: '12px 0', borderTop: '1px solid var(--steel)' }}>
            <button className="btn btn-primary" onClick={grade} disabled={!complete || !!busy}>{busy === 'grade' ? 'Simulating' : 'Grade and simulate'}</button>
            <span className="muted num">{Object.keys(choices).length}/{cats.length}</span>
            <button className="btn-link" onClick={() => { setSpin(null); setChosen({}); setChoices({}); }}>Start over</button>
          </div>
        </div>
      )}
    </div>
  );
}
