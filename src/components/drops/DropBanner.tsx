'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clock } from '@/lib/drops';
import { KIND_LABELS, type ItemKind } from '@/lib/shop';
import { claimDrop, refreshDrop, useActiveDrop, useSecondsLeft } from './useActiveDrop';

/** Says a drop is live on every page: what it is, how long is left, and a Claim button. Renders nothing otherwise. */
export function DropBanner() {
  const s = useActiveDrop();
  const drop = s?.drop ?? null;
  const left = useSecondsLeft(drop, s?.skew ?? 0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState('');

  // The countdown reaching zero asks again, so the bar goes away on its own.
  useEffect(() => { if (left === 0) void refreshDrop(); }, [left]);
  // A system notification when a drop lands while the tab is in the background (only if the player allowed them).
  useEffect(() => {
    if (!drop || s?.owned || document.visibilityState !== 'hidden') return;
    try {
      if (Notification.permission !== 'granted' || localStorage.getItem('gl-drop-seen') === drop.id) return;
      localStorage.setItem('gl-drop-seen', drop.id);
      new Notification(`Free drop: ${drop.label}`, { body: 'Claim it in the next 10 minutes. It is not sold anywhere.', tag: drop.id });
    } catch { /* notifications unavailable */ }
  }, [drop, s?.owned]);
  useEffect(() => { if (!done) return; const t = setTimeout(() => setDone(null), 9000); return () => clearTimeout(t); }, [done]);

  async function claim() {
    if (!drop) return;
    setBusy(true); setErr('');
    try { setDone((await claimDrop(drop.id)).label); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="drop-bar done" role="status">
        <div className="container drop-row"><span className="drop-text"><strong>{done} is yours.</strong> <Link href="/shop">Equip it in the shop</Link></span></div>
      </div>
    );
  }
  if (!drop || !s || s.owned || left === null || left <= 0) return null;
  return (
    <div className="drop-bar" role="region" aria-label="Free drop">
      <div className="container drop-row">
        <span className="drop-gift" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="9" width="17" height="11" rx="1.5" /><path d="M12 9v11M3.5 13h17M12 9C10 5 6.5 5.5 7 7.8c.4 1.6 3 1.2 5 1.2M12 9c2-4 5.5-3.5 5-1.2-.4 1.6-3 1.2-5 1.2" /></svg>
        </span>
        <span className="drop-text">
          <strong>Free drop: {drop.label}</strong>
          <span className="drop-sub">{KIND_LABELS[drop.kind as ItemKind] ?? 'Item'} · not sold anywhere</span>
        </span>
        <span className="drop-time num" role="timer" aria-label={`${Math.ceil(left / 60)} minutes left`}>{clock(left)}</span>
        {s.signedIn
          ? <button type="button" className="btn btn-sm drop-claim" onClick={claim} disabled={busy}>{busy ? 'Claiming' : 'Claim free'}</button>
          : <Link className="btn btn-sm drop-claim" href="/login?next=/shop">Sign in to claim</Link>}
        <Link className="drop-see" href="/shop#drops">See it</Link>
        {err && <span className="drop-err" role="alert">{err}</span>}
      </div>
    </div>
  );
}
