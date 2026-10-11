'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Item = { id: string; kind: string; title: string; body: string | null; href: string | null; at: string; read: boolean };

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? 'now' : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};

/** Header bell for signed-in players: gifts, bonus points, streaks. Opening it marks everything read. */
export function NotificationBell() {
  const [data, setData] = useState<{ items: Item[]; unread: number } | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const load = useCallback(() => fetch('/api/notifications', { cache: 'no-store' }).then((r) => r.json()).then(setData).catch(() => {}), []);
  useEffect(() => {
    void load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 120_000);
    window.addEventListener('notifications-updated', load);
    return () => { clearInterval(t); window.removeEventListener('notifications-updated', load); };
  }, [load]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && data?.unread) {
      void fetch('/api/notifications', { method: 'POST' }).catch(() => {});
      setData({ ...data, unread: 0 });
    }
  }
  const unread = data?.unread ?? 0;
  return (
    <div className="nb" ref={box}>
      <button type="button" className={`nb-btn${unread ? ' has' : ''}`} aria-expanded={open} aria-haspopup="true" onClick={toggle}
        aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v3.6L4.2 16h15.6L18 12.6V9a6 6 0 0 0-6-6zM9.5 18.5a2.5 2.5 0 0 0 5 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {unread > 0 && <span className="nb-count num">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="nb-panel" role="dialog" aria-label="Notifications">
          <p className="nb-h">Notifications</p>
          {data?.items.length ? (
            <ul className="nb-list">
              {data.items.map((n) => {
                const inner = <><span className={`nb-dot k-${n.kind}`} aria-hidden="true" /><span className="nb-text"><strong>{n.title}</strong>{n.body && <span className="muted">{n.body}</span>}</span><span className="nb-ago muted num">{ago(n.at)}</span></>;
                return <li key={n.id} className={n.read ? '' : 'new'}>{n.href ? <Link href={n.href} onClick={() => setOpen(false)}>{inner}</Link> : <span>{inner}</span>}</li>;
              })}
            </ul>
          ) : <p className="muted nb-empty">Nothing yet. Perfect games, streaks and gifts show up here.</p>}
        </div>
      )}
    </div>
  );
}
