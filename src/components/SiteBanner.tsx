'use client';
import { useEffect, useState } from 'react';

/** The owner's site-wide message (set on /owner). Dismissed per message, per device. */
export function SiteBanner() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/api/banner', { cache: 'no-store' }).then((r) => r.json()).then((d) => {
      if (!live || !d?.text) return;
      try { if (localStorage.getItem('gl-banner-dismissed') === d.text) return; } catch { /* storage blocked */ }
      setText(d.text);
    }).catch(() => {});
    return () => { live = false; };
  }, []);
  if (!text) return null;
  return (
    <aside className="site-banner" aria-label="Announcement">
      <span>{text}</span>
      <button type="button" aria-label="Dismiss" onClick={() => { try { localStorage.setItem('gl-banner-dismissed', text); } catch { /* storage blocked */ } setText(null); }}>×</button>
    </aside>
  );
}
