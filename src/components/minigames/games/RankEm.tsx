'use client';
import { useState } from 'react';
import { MiniGameShell } from '../MiniGameShell';
import { TeamTag } from '../TeamTag';
import { PlayerFace } from '@/components/game/PlayerFace';
import './group-c.css';

interface Card { id: string; name: string; position: string; team: string; teamColor: string; logoUrl?: string | null; img: string | null }
interface P { label: string; groupName: string; players: Card[] }
interface D { label: string; pairs: number; total: number; exact: number; truth: { id: string; name: string; team: string; teamColor?: string; logoUrl?: string | null; img?: string | null; v: number; yourSlot: number; ok: boolean }[] }
type Meta = { slug: string; name: string; tagline: string; howTo: string[] };

export function RankEm({ signedIn, meta }: { signedIn: boolean; meta: Meta }) {
  return (
    <MiniGameShell<P> {...meta} signedIn={signedIn}
      render={({ puzzle, submit, busy }) => <Play key={puzzle.players.map((p) => p.id).join()} puzzle={puzzle} submit={submit} busy={busy} />}
      renderResult={(r) => {
        const d = r.detail as D;
        return (
          <>
            <p className="muted" style={{ marginTop: 0 }}>{d.pairs} of {d.total} pairs in order, {d.exact} of {d.truth.length} exact slots. {r.score} pts. True order by {d.label.toLowerCase()}:</p>
            <ol className="gc-board">
              {d.truth.map((x, i) => (
                <li key={x.id} className={`gc-slot ${x.ok ? 'hit' : 'miss'}`}>
                  <span className="gc-rank num">{i + 1}</span>
                  <PlayerFace name={x.name} src={x.img} color={x.teamColor ?? 'var(--green)'} size={32} />
                  <span className="gc-name">{x.name} <span className="muted" style={{ fontWeight: 400 }}><TeamTag abbr={x.team} logoUrl={x.logoUrl} color={x.teamColor} /></span></span>
                  <span className="num" style={{ fontWeight: 700 }}>{x.v}</span>
                  <span className="gc-tag">{x.ok ? 'Exact' : `You: ${x.yourSlot}`}</span>
                </li>
              ))}
            </ol>
          </>
        );
      }} />
  );
}

function Play({ puzzle, submit, busy }: { puzzle: P; submit: (a: unknown) => Promise<unknown>; busy: boolean }) {
  const [order, setOrder] = useState(puzzle.players);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setOrder(next);
    setMsg(`${x.name} moved to spot ${to + 1}.`);
  };
  return (
    <div>
      <p className="m-kicker">{puzzle.groupName}s</p>
      <p className="m-big" style={{ margin: '0 0 4px' }}>Rank by {puzzle.label.toLowerCase()}</p>
      <p className="muted" style={{ margin: '0 0 16px' }}>Highest at the top, lowest at the bottom.</p>
      <ol className="gc-order">
        {order.map((c, i) => (
          <li key={c.id} className={`gc-item ${drag === i ? 'drag' : ''} ${over === i && drag !== i ? 'over' : ''}`} draggable
            onDragStart={() => setDrag(i)} onDragEnd={() => { setDrag(null); setOver(null); }}
            onDragOver={(e) => { e.preventDefault(); setOver(i); }}
            onDrop={(e) => { e.preventDefault(); if (drag !== null) move(drag, i); setDrag(null); setOver(null); }}>
            <span className="gc-rank num" style={{ fontSize: '1.1rem' }}>{i + 1}</span>
            <PlayerFace name={c.name} src={c.img} color={c.teamColor} size={44} />
            <span style={{ minWidth: 0, flex: 1 }}><strong style={{ display: 'block', lineHeight: 1.25 }}>{c.name}</strong><span className="muted">{c.position} · <TeamTag abbr={c.team} logoUrl={c.logoUrl} color={c.teamColor} /></span></span>
            <span className="gc-arrows">
              <button type="button" aria-label={`Move ${c.name} up`} disabled={i === 0 || busy} onClick={() => move(i, i - 1)}>&uarr;</button>
              <button type="button" aria-label={`Move ${c.name} down`} disabled={i === order.length - 1 || busy} onClick={() => move(i, i + 1)}>&darr;</button>
            </span>
          </li>
        ))}
      </ol>
      <p className="gc-feedback muted" aria-live="polite" style={{ fontWeight: 400 }}>{msg}</p>
      <button type="button" className="btn btn-primary" style={{ marginTop: 8 }} disabled={busy} onClick={() => void submit(order.map((c) => c.id))}>Lock it in</button>
    </div>
  );
}
