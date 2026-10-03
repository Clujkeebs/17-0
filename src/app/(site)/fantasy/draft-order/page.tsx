import type { Metadata } from 'next';
import Link from 'next/link';
import { DraftOrder } from './DraftOrder';

export const metadata: Metadata = { title: 'Fantasy draft order randomizer', description: 'Paste your league\'s team names and get a fair random draft order.', alternates: { canonical: '/fantasy/draft-order' } };

export default function Page() {
  return (
    <div className="container section" style={{ maxWidth: 720 }}>
      <p className="eyebrow"><Link href="/fantasy">Fantasy</Link> · Draft order</p>
      <h1>Draft order randomizer</h1>
      <p className="muted">Uses your browser&apos;s secure random numbers, so nobody can game it. Nothing is saved.</p>
      <DraftOrder />
    </div>
  );
}
