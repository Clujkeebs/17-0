import type { Metadata } from 'next';
import { NewsletterForm } from '@/components/NewsletterForm';

export const metadata: Metadata = {
  title: 'Newsletter',
  description: 'The daily 17-0 board, rating moves that matter, and roster math. Double opt-in, one-click unsubscribe.',
  alternates: { canonical: '/newsletter' },
};

export default function NewsletterPage() {
  return (
    <div className="container section prose">
      <span className="eyebrow">Newsletter</span>
      <h1>The board, in your inbox.</h1>
      <p>Today&apos;s daily 17-0 teams, rating changes that actually move a roster, and the occasional deep cut on why a 90 tight end is worth less than you think.</p>
      <ul>
        <li>Double opt-in. Nothing arrives until you click the confirmation link.</li>
        <li>One click to unsubscribe, from any email.</li>
        <li>We never sell or share your address.</li>
      </ul>
      <div className="card" style={{ maxWidth: 480 }}>
        <NewsletterForm source="newsletter-page" />
      </div>
    </div>
  );
}
