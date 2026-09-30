'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const KEY = 'gl-cookie-ack';
export function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => { try { setShow(!localStorage.getItem(KEY)); } catch { /* storage blocked */ } }, []);
  if (!show) return null;
  return (
    <div role="region" aria-label="Cookie notice" style={{ position: 'fixed', bottom: 16, left: 16, right: 16, maxWidth: 420, zIndex: 50, boxShadow: 'var(--shadow-lift)' }} className="card">
      <p style={{ margin: 0, fontSize: '.88rem' }}>
        We use a sign-in cookie, and Google uses ad cookies. No other trackers. <Link href="/legal/cookies">Details</Link>.
      </p>
      <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => { try { localStorage.setItem(KEY, '1'); } catch {} setShow(false); }}>Got it</button>
    </div>
  );
}
