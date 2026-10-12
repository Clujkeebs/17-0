'use client';
import { useEffect, useState } from 'react';

const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

/** Listens for the old cheat code anywhere on the site. When it is typed, a signed-in player earns a hidden achievement. */
export function KonamiCode() {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    let i = 0;
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if (typing) { i = 0; return; }
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      i = k === CODE[i] ? i + 1 : k === CODE[0] ? 1 : 0;
      if (i < CODE.length) return;
      i = 0;
      void fetch('/api/secret', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'konami' }) })
        .then((r) => r.json()).then((d) => { if (d.fresh) { setToast('Cheat code accepted. Check your achievements.'); window.dispatchEvent(new Event('notifications-updated')); setTimeout(() => setToast(null), 5000); } })
        .catch(() => {});
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return toast ? <div className="konami-toast" role="status">{toast}</div> : null;
}
