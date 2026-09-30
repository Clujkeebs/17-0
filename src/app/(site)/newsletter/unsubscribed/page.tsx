import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Unsubscribed',
  description: 'You have been removed from the Unbeaten newsletter.',
  alternates: { canonical: '/newsletter/unsubscribed' },
  robots: { index: false, follow: true },
};

export default async function UnsubscribedPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return (
    <div className="container section prose">
      <span className="eyebrow">Newsletter</span>
      {reason === 'invalid' ? (
        <>
          <h1>We could not find that subscription.</h1>
          <p>The link may be from an old email for an address that was already removed. If mail keeps arriving, forward one to us and we will fix it by hand.</p>
        </>
      ) : (
        <>
          <h1>Unsubscribed.</h1>
          <p>Done, effective immediately. You will not get another newsletter email from us. We delete the record entirely after 90 days.</p>
          <p className="muted">Changed your mind? You can sign up again any time from the <Link href="/newsletter">newsletter page</Link>.</p>
        </>
      )}
      <p><Link href="/">Back to Unbeaten</Link></p>
    </div>
  );
}
