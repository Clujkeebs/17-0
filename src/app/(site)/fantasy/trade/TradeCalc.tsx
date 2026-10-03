'use client';
import { useState } from 'react';
import { PlayerPicker } from '@/components/fantasy/PlayerPicker';
import { tradeVerdict, type Ranked } from '@/lib/fantasy/rank';
import type { Slim } from '@/lib/fantasy/slim';

function Side({ title, list, players, others, set }: { title: string; list: Slim[]; players: Slim[]; others: string[]; set: (l: Slim[]) => void }) {
  return (
    <section className="card" aria-label={title}>
      <h2 style={{ fontSize: '1.15rem', margin: '0 0 12px' }}>{title}</h2>
      <PlayerPicker players={players} label={`Add to ${title.toLowerCase()}`} exclude={[...others, ...list.map((p) => p.id)]} onPick={(p) => set([...list, p])} />
      <ul className="trade-list">
        {list.map((p) => (
          <li key={p.id}>
            <span><strong>{p.name}</strong> <span className="muted">{p.pos}{p.posRank} · {p.team}</span></span>
            <span className="num">{p.value.toFixed(1)}</span>
            <button type="button" className="btn-link" onClick={() => set(list.filter((x) => x.id !== p.id))} aria-label={`Remove ${p.name}`}>Remove</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TradeCalc({ players }: { players: Slim[] }) {
  const [give, setGive] = useState<Slim[]>([]);
  const [get, setGet] = useState<Slim[]>([]);
  const v = give.length && get.length ? tradeVerdict(give as Ranked[], get as Ranked[]) : null;
  return (
    <>
      <div className="trade-grid">
        <Side title="You give" list={give} players={players} others={get.map((p) => p.id)} set={setGive} />
        <Side title="You get" list={get} players={players} others={give.map((p) => p.id)} set={setGet} />
      </div>
      <div className="card trade-verdict" aria-live="polite">
        {v ? (
          <>
            <p className="big-num" style={{ margin: 0, color: v.verdict === 'You lose it' ? 'var(--danger)' : undefined }}>{v.verdict}</p>
            <p className="muted" style={{ margin: '6px 0 0' }}>Value given <strong className="num">{v.give}</strong>, value received <strong className="num">{v.get}</strong>{v.verdict !== 'Fair' ? `, a ${v.pct} percent gap` : ''}. Value is points per game above a waiver-level starter at the same position.</p>
          </>
        ) : <p className="muted" style={{ margin: 0 }}>Add at least one player to each side.</p>}
      </div>
    </>
  );
}
