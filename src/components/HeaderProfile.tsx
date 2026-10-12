'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { NameStyle } from '@/lib/cosmetics';
import { Effect, FRAMED, Frame } from './Effect';
import { NotificationBell } from './NotificationBell';

type Me = { signedIn: false } | { signedIn: true; username: string | null; name: string; image: string | null; style: NameStyle };

/** Top-right profile button: picture and "Account" when signed in, Sign in otherwise. Loads after the page. */
export function HeaderProfile() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => fetch('/api/user/me', { cache: 'no-store' }).then((r) => r.json()).then((d: Me) => { if (live) setMe(d); }).catch(() => { if (live) setMe({ signedIn: false }); });
    void load();
    // The profile editor fires this after a save, so the header shows the new name and picture right away.
    window.addEventListener('profile-updated', load);
    return () => { live = false; window.removeEventListener('profile-updated', load); };
  }, []);
  if (!me) return <span className="hp hp-wait" aria-hidden="true" />;
  if (!me.signedIn) return <Link href="/login?next=/profile" className="hp hp-in">Sign in</Link>;
  return (
    <span className="hp-row">
    <NotificationBell />
    <Link href="/profile" className="hp" title={me.name}>
      <Avatar name={me.name} src={me.image} size={28} />
      <span className="hp-name">Account</span>
    </Link>
    </span>
  );
}

export function Avatar({ name, src, size = 40, ring, effect }: { name: string; src: string | null; size?: number; ring?: string | null; effect?: string | null }) {
  const initials = name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const img = src
    ? <img className="avatar" src={src} alt="" width={size} height={size} style={{ width: size, height: size }} />
    : <span className="avatar avatar-i" aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.4 }}>{initials || '?'}</span>;
  // An equipped avatar border (shop item) wraps the picture in a ring.
  const pic = ring ? <span className={`ring ${ring}`}>{img}</span> : img;
  // An equipped effect (shop item) animates around the picture, and ornate borders add a frame over it.
  // Fire rings burn for real: flames rise off them even without an effect equipped.
  const fx = effect ?? (ring === 'ring-flame' || ring === 'ring-lava' ? 'fx-ringfire' : null);
  const framed = !!ring && FRAMED.has(ring);
  return fx || framed ? <span className="fx-wrap">{pic}<Frame k={ring} /><Effect k={fx} /></span> : pic;
}
