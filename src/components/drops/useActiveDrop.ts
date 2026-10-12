'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';

export interface LiveDrop { id: string; itemKey: string; kind: string; label: string; blurb: string | null; startsAt: string; endsAt: string }
export interface DropState { drop: LiveDrop | null; owned: boolean; signedIn: boolean; /** Server clock minus this device's clock, in ms. */ skew: number }

/**
 * One shared poller for every component that shows the live drop (the banner and the shop panel). It starts with the
 * first subscriber, asks every 30 seconds while the tab is visible, and stops with the last.
 */
let state: DropState | null = null;
const subs = new Set<() => void>();
let timer: number | undefined;
let inflight = false;

const emit = () => subs.forEach((f) => f());

export async function refreshDrop(): Promise<void> {
  if (inflight) return;
  inflight = true;
  try {
    const p = await (await fetch('/api/drops/active', { cache: 'no-store' })).json();
    state = { drop: p.drop ?? null, owned: !!p.owned, signedIn: !!p.signedIn, skew: typeof p.now === 'number' ? p.now - Date.now() : 0 };
    emit();
  } catch { /* offline: keep what we had */ } finally { inflight = false; }
}

const onVisible = () => { if (document.visibilityState === 'visible') void refreshDrop(); };

function subscribe(fn: () => void) {
  subs.add(fn);
  if (timer === undefined) {
    void refreshDrop();
    timer = window.setInterval(onVisible, 30_000);
    document.addEventListener('visibilitychange', onVisible);
  }
  return () => {
    subs.delete(fn);
    if (!subs.size && timer !== undefined) { window.clearInterval(timer); timer = undefined; document.removeEventListener('visibilitychange', onVisible); }
  };
}

/** The live drop, or null. `undefined` until the first answer arrives. */
export function useActiveDrop(): DropState | null {
  return useSyncExternalStore(subscribe, () => state, () => null);
}

/** Whole seconds left in a drop, counting down on the server's clock. Null until the first tick. */
export function useSecondsLeft(drop: LiveDrop | null, skew: number): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!drop) return;
    const tick = () => setNow(Date.now());
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [drop]);
  if (!drop || now === null) return null;
  return Math.max(0, Math.ceil((new Date(drop.endsAt).getTime() - (now + skew)) / 1000));
}

/** Claims a drop. Resolves to the item label, or throws with a message to show. */
export async function claimDrop(dropId: string): Promise<{ label: string; itemKey: string }> {
  const res = await fetch('/api/drops/claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dropId }) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error ?? 'That did not work.');
  void refreshDrop();
  window.dispatchEvent(new Event('notifications-updated'));
  return { label: d.label, itemKey: d.itemKey };
}
