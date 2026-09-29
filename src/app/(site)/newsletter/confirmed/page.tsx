import type { Metadata } from 'next';
import Link from 'next/link';
import { ConfirmedBeacon } from './ConfirmedBeacon';

export const metadata: Metadata = {
  title: 'Subscription confirmed',
  description: 'Your Gridiron Lab newsletter subscription is confirmed.',
  alternates: { canonical: '/newsletter/confirmed' },
  robots: { index: false, follow: true },
};

export default function ConfirmedPage() {
  return (
    <div className="container section prose">
      <span className="eyebrow">Newsletter</span>
      <h1>You are in.</h1>
      <p>Subscription confirmed. Expect the daily board, rating moves that matter, and the occasional argument about slot weights. Every email has a one-click unsubscribe.</p>
      <p><Link className="btn btn-primary" href="/games/17-0">Play today&apos;s 17-0</Link></p>
      <ConfirmedBeacon />
    </div>
  );
}
