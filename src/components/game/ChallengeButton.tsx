'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics';

/** "Challenge friends": saves this game's spins as a challenge, then opens its page, where the link is shared. */
export function ChallengeButton({ resultId, existing }: { resultId: string; existing?: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function go() {
    if (existing) { router.push(`/c/${existing}`); return; }
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/challenges', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ resultId }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? 'Could not create the challenge.');
      track('challenge_created', { path: d.url });
      router.push(d.url);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  return (
    <>
      <button type="button" className="btn btn-lg" onClick={go} disabled={busy}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20 14 10M14 10l-3-3 6-4 4 4-4 6-3-3M20 20 10 10M10 10l3-3-6-4-4 4 4 6 3-3" /></svg>
        {busy ? 'Saving the spins' : existing ? 'See the challenge' : 'Challenge friends'}
      </button>
      {error && <p role="alert" className="field-error">{error}</p>}
    </>
  );
}
