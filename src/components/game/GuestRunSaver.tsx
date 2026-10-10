'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { forgetGuestRuns, guestRuns } from '@/lib/guest-runs';

/**
 * Signed out after a great run: a pop-up offers to save it. Signed in: any runs this browser finished while
 * signed out are moved onto the account (the server checks each game's private token first).
 */
export function GuestRunSaver({ resultId, signedIn, owned, great, headline }: { resultId: string; signedIn: boolean; owned: boolean; great: boolean; headline: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const saveRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const runs = guestRuns();
    if (signedIn) {
      if (!runs.length) return;
      void fetch('/api/results/claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ runs }) })
        .then((r) => (r.ok ? r.json() : null)).then((d: { claimed?: string[] } | null) => {
          // Forget everything sent: claimed runs are saved, the rest were not this browser's to claim.
          forgetGuestRuns(runs.map((x) => x.id));
          if (d?.claimed?.includes(resultId)) router.refresh();
        }).catch(() => {});
      return;
    }
    if (owned || !great || !runs.some((x) => x.id === resultId)) return;
    try { if (sessionStorage.getItem(`unbeaten:save-asked:${resultId}`)) return; sessionStorage.setItem(`unbeaten:save-asked:${resultId}`, '1'); } catch { /* storage off */ }
    const t = setTimeout(() => setOpen(true), 2600); // after the celebration has its moment
    return () => clearTimeout(t);
  }, [signedIn, owned, great, resultId, router]);
  useEffect(() => {
    if (!open) return;
    saveRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  if (!open) return null;
  const next = encodeURIComponent(`/results/${resultId}`);
  return (
    <div className="sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="sheet save-run" role="dialog" aria-modal="true" aria-labelledby="save-run-h">
        <div className="sheet-grip" aria-hidden="true" />
        <button type="button" className="sheet-x" aria-label="Close" onClick={() => setOpen(false)}>×</button>
        <p className="eyebrow" style={{ margin: '4px 0 6px' }}>Not saved yet</p>
        <h2 id="save-run-h" className="sheet-h">{headline} deserves a home.</h2>
        <p className="muted" style={{ marginTop: 0 }}>Sign in or make a free account and this run goes on your profile, with points and your best records. Takes ten seconds: a username and a password.</p>
        <div className="sheet-actions">
          <a ref={saveRef} className="btn btn-primary btn-lg" href={`/register?next=${next}`}>Create account</a>
          <a className="btn btn-lg" href={`/login?next=${next}`}>Sign in</a>
        </div>
      </div>
    </div>
  );
}
