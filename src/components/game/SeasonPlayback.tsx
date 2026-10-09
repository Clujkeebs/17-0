'use client';
import { useEffect, useMemo, useState } from 'react';
import { createRng } from '@/lib/game/prng';

/**
 * Plays the projected season out one game at a time: a dot per game fills in as a win or a loss while the record
 * counts up. The order of wins and losses is drawn from the result id, so a result always replays the same way;
 * the record itself is the graded one. Skippable, and shown complete for reduced motion.
 */
export function gameOrder(seed: string, wins: number, games: number): boolean[] {
  const rng = createRng(`playback:${seed}`);
  // Losses cluster a little (slumps and back-to-backs) instead of landing evenly.
  const weights = Array.from({ length: games }, () => rng.next() + 0.35 * Math.sin(rng.next() * Math.PI));
  const lossAt = new Set(weights.map((w, i) => [w, i] as const).sort((a, b) => a[0] - b[0]).slice(0, games - wins).map(([, i]) => i));
  return Array.from({ length: games }, (_, i) => !lossAt.has(i));
}

export function longestStreak(order: boolean[]): number {
  let best = 0, run = 0;
  for (const w of order) { run = w ? run + 1 : 0; best = Math.max(best, run); }
  return best;
}

export function SeasonPlayback({ seed, wins, games, perfectColor = 'var(--orange)' }: { seed: string; wins: number; games: number; perfectColor?: string }) {
  const order = useMemo(() => gameOrder(seed, wins, games), [seed, wins, games]);
  const [shown, setShown] = useState(games);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setShown(0);
    const step = Math.max(12, Math.round(3600 / games));
    const t = setInterval(() => setShown((n) => { if (n + 1 >= games) clearInterval(t); return Math.min(games, n + 1); }), step);
    return () => clearInterval(t);
  }, [games, seed]);
  const done = shown >= games;
  const w = order.slice(0, shown).filter(Boolean).length, l = shown - w;
  return (
    <div className="sp">
      <div className="row" style={{ alignItems: 'flex-end', gap: 16 }}>
        <p className="big-num" style={{ margin: 0, color: done && wins === games ? perfectColor : undefined }} aria-hidden={!done}>{w}-{l}</p>
        {!done && <button type="button" className="btn btn-sm" onClick={() => setShown(games)}>Skip</button>}
      </div>
      <p className="sr-only" aria-live="polite">{done ? `Final record ${wins}-${games - wins}` : ''}</p>
      <ol className={`sp-dots${games > 100 ? ' sp-small' : ''}`} aria-label={`Game by game, ${games} games`}>
        {order.map((win, i) => <li key={i} className={i < shown ? (win ? 'w' : 'l') : ''} title={i < shown ? `Game ${i + 1}: ${win ? 'win' : 'loss'}` : undefined} />)}
      </ol>
      <p className="hint" style={{ margin: '6px 0 0', minHeight: '1.4em' }}>{done ? `Longest win streak: ${longestStreak(order)}. Game order is simulated; the record is your graded projection.` : `Game ${shown} of ${games}`}</p>
    </div>
  );
}
