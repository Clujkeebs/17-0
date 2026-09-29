import type { Metadata } from 'next';
import { NewsletterForm } from '@/components/NewsletterForm';

export const metadata: Metadata = {
  title: 'Link expired',
  description: 'That newsletter confirmation link has expired. Request a new one.',
  alternates: { canonical: '/newsletter/expired' },
  robots: { index: false, follow: true },
};

export default async function ExpiredPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return (
    <div className="container section prose">
      <span className="eyebrow">Newsletter</span>
      <h1>{reason === 'invalid' ? 'That link does not work.' : 'That link expired.'}</h1>
      <p>
        {reason === 'invalid'
          ? 'It was already used, or it was mangled on the way here. If you already confirmed, you are all set. Otherwise, request a fresh link.'
          : 'Confirmation links last 24 hours. Enter your email and we will send a fresh one.'}
      </p>
      <div className="card" style={{ maxWidth: 480 }}>
        <NewsletterForm source="expired" label="Email address" />
      </div>
    </div>
  );
}
