'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { F_POS, snakePicks, tiers, type FPos } from '@/lib/fantasy/rank';
import type { Slim } from '@/lib/fantasy/slim';

/** How deep each position list runs on the printed sheet. */
const DEPTH: Record<FPos, number> = { QB: 24, RB: 44, WR: 48, TE: 20 };
const ROUNDS = 15;

/** For each of your picks, the players ranked right around that spot. Those are the realistic targets. */
export function CheatSheet({ players }: { players: Slim[] }) {
  const [teams, setTeams] = useState(12);
  const [slot, setSlot] = useState(1);
  const picks = snakePicks(Math.min(slot, teams), teams, ROUNDS);
  const around = (pick: number) => players.filter((p) => p.overall >= pick - 2 && p.overall <= pick + 3).slice(0, 5);

  function print() {
    // Only the sheet prints: the rest of the page is hidden while the print dialog is open.
    document.documentElement.classList.add('print-sheet');
    const done = () => { document.documentElement.classList.remove('print-sheet'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  }

  return (
    <>
      <div className="row cs-controls" style={{ gap: 16, margin: '20px 0' }}>
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
        <button type="button" className="btn btn-primary cs-print-btn" onClick={print}>Print or save as PDF</button>
      </div>
      <ol className="cs-rounds">
        {picks.map((pick, r) => (
          <li key={pick} className="card">
            <p className="g-kicker" style={{ margin: 0 }}>Round {r + 1} · Pick {pick}</p>
            <ul className="cs-targets">
              {around(pick).map((p) => <li key={p.id}><Link href={`/players/${p.slug}`}>{p.name}</Link> <span className="muted">{p.pos}{p.posRank} · {p.team} · #{p.overall}</span></li>)}
            </ul>
          </li>
        ))}
      </ol>
      <PrintSheet players={players} teams={teams} slot={Math.min(slot, teams)} picks={picks} around={around} />
    </>
  );
}

/** The printed version: your picks on top, then every position by tier with a box to cross players off. */
function PrintSheet({ players, teams, slot, picks, around }: { players: Slim[]; teams: number; slot: number; picks: number[]; around: (pick: number) => Slim[] }) {
  // The page is prerendered, so today's date is filled in on the client (a build-time date would mismatch the next day).
  const [date, setDate] = useState('');
  useEffect(() => setDate(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })), []);
  return (
    <section className="cs-print" aria-hidden="true">
      <header className="csp-head">
        <strong>Unbeaten draft cheat sheet</strong>
        <span>{teams} teams · Pick {slot} · PPR · {date ? `${date} · ` : ''}playunbeaten.com</span>
      </header>
      <h2 className="csp-h">Your picks</h2>
      <ol className="csp-picks">
        {picks.map((pick, r) => (
          <li key={pick}><b>R{r + 1} · #{pick}</b> {around(pick).slice(0, 3).map((p) => `${p.name} (${p.pos})`).join(', ')}</li>
        ))}
      </ol>
      <div className="csp-cols">
        {F_POS.map((pos) => {
          const list = players.filter((p) => p.pos === pos).sort((a, b) => a.posRank - b.posRank).slice(0, DEPTH[pos]);
          const t = tiers(list.map((p) => p.value));
          return (
            <div key={pos} className="csp-col">
              <h2 className="csp-h">{pos}</h2>
              <ol>
                {list.map((p, i) => (
                  <li key={p.id} className={i > 0 && t[i] !== t[i - 1] ? 'csp-break' : undefined} data-tier={i === 0 || t[i] !== t[i - 1] ? `Tier ${t[i]}` : undefined}>
                    <span className="csp-box" />
                    <span className="csp-rank">{p.posRank}</span>
                    <span className="csp-name">{p.name}</span>
                    <span className="csp-meta">{p.team} · {p.overall}</span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
      <p className="csp-foot">Rankings are PPR points per game over a replacement starter, from Sleeper data. Tiers break where the values drop off. Number after the team is the overall rank.</p>
    </section>
  );
}
