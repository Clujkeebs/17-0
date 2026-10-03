'use client';
import { useState } from 'react';
import Link from 'next/link';
import { snakePicks } from '@/lib/fantasy/rank';
import type { Slim } from '@/lib/fantasy/slim';

/** For each of your picks, the players ranked right around that spot. Those are the realistic targets. */
export function CheatSheet({ players }: { players: Slim[] }) {
  const [teams, setTeams] = useState(12);
  const [slot, setSlot] = useState(1);
  const rounds = 15;
  const picks = snakePicks(Math.min(slot, teams), teams, rounds);
  return (
    <>
      <div className="row" style={{ gap: 16, margin: '20px 0' }}>
        <label className="cs-field">Teams
          <select value={teams} onChange={(e) => { const n = Number(e.target.value); setTeams(n); if (slot > n) setSlot(n); }}>
            {[8, 10, 12, 14, 16].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="cs-field">Your pick
          <select value={slot} onChange={(e) => setSlot(Number(e.target.value))}>
            {Array.from({ length: teams }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
        </label>
      </div>
      <ol className="cs-rounds">
        {picks.map((pick, r) => {
          const around = players.filter((p) => p.overall >= pick - 2 && p.overall <= pick + 3).slice(0, 5);
          return (
            <li key={pick} className="card">
              <p className="g-kicker" style={{ margin: 0 }}>Round {r + 1} · Pick {pick}</p>
              <ul className="cs-targets">
                {around.map((p) => <li key={p.id}><Link href={`/players/${p.slug}`}>{p.name}</Link> <span className="muted">{p.pos}{p.posRank} · {p.team} · #{p.overall}</span></li>)}
              </ul>
            </li>
          );
        })}
      </ol>
    </>
  );
}
