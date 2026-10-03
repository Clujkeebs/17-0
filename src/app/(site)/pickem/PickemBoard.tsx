'use client';
import { useState } from 'react';

type Side = { abbr: string; name: string; logo: string | null; score: number | null };
type Game = { id: string; kickoff: string; home: Side; away: Side; status: string; winner: string | null; locked: boolean };
const fmt = (iso: string) => new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).format(new Date(iso)) + ' ET';

export function PickemBoard({ games, picks: initial, signedIn }: { games: Game[]; picks: Record<string, string>; signedIn: boolean }) {
  const [picks, setPicks] = useState(initial);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  async function pick(g: Game, side: 'home' | 'away') {
    setBusy(g.id); setMsg('');
    const prev = picks[g.id];
    setPicks((p) => ({ ...p, [g.id]: side }));
    try {
      const r = await fetch('/api/pickem', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId: g.id, pick: side }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setPicks((p) => ({ ...p, [g.id]: prev })); setMsg(d.error ?? 'Could not save.'); }
    } finally { setBusy(''); }
  }

  const made = games.filter((g) => picks[g.id]).length;
  return (
    <>
      <p className="hint" aria-live="polite">{msg || `${made} of ${games.length} picked`}</p>
      <ul className="pk-list">
        {games.map((g) => {
          const locked = g.locked;
          const mine = picks[g.id];
          const result = g.winner && mine ? (g.winner === mine ? 'right' : 'wrong') : '';
          return (
            <li key={g.id} className={`pk-game ${result}`}>
              <div className="pk-meta"><span>{g.status === 'post' ? 'Final' : g.status === 'in' ? 'Live' : fmt(g.kickoff)}</span>{result && <strong>{result === 'right' ? 'Right' : 'Wrong'}</strong>}</div>
              <div className="pk-teams">
                {(['away', 'home'] as const).map((side) => {
                  const t = g[side];
                  return (
                    <button key={side} type="button" className={`pk-team${mine === side ? ' on' : ''}${g.winner === side ? ' won' : ''}`} aria-pressed={mine === side}
                      disabled={!signedIn || locked || busy === g.id} onClick={() => pick(g, side)} aria-label={`${t.name}${side === 'home' ? ' (home)' : ''}${mine === side ? ', your pick' : ''}`}>
                      {t.logo ? <img src={t.logo} alt="" width={32} height={32} /> : <span className="pk-abbr">{t.abbr}</span>}
                      <span className="pk-name">{t.abbr}</span>
                      {t.score != null && <span className="pk-score num">{t.score}</span>}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
