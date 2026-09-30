import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site';
import { ContactLink, contactVerb } from '@/components/ContactLink';
import { LAST_UPDATED } from './_components/LegalPage';

export const metadata: Metadata = {
  title: 'Legal',
  description: `Terms, privacy, cookies, disclaimer, DMCA, and accessibility for ${SITE.name}. Each page starts with a plain-English summary.`,
  alternates: { canonical: '/legal' },
};

const PAGES = [
  { href: '/legal/terms', title: 'Terms of Service', blurb: 'Who can play, what is not allowed, and how disputes are handled.' },
  { href: '/legal/privacy', title: 'Privacy Policy', blurb: 'What we collect, how long we keep it, and how to delete it. We never sell your data.' },
  { href: '/legal/cookies', title: 'Cookie Policy', blurb: 'Every cookie and storage key, with durations and opt-out links.' },
  { href: '/legal/disclaimer', title: 'Disclaimer', blurb: 'Not affiliated with EA, the NFL, the NFLPA, or any team. Entertainment only.' },
  { href: '/legal/dmca', title: 'DMCA and Copyright', blurb: 'Our designated agent, notice and counter-notice, and 48-hour image takedowns.' },
  { href: '/legal/accessibility', title: 'Accessibility', blurb: 'Our WCAG 2.2 AA target, known limitations, and how to report a barrier.' },
];

export default function LegalIndexPage() {
  return (
    <div className="container section">
      <span className="eyebrow">Legal</span>
      <h1>The fine print, readable.</h1>
      <p className="muted" style={{ maxWidth: '60ch' }}>
        Every page opens with a short summary in plain English, then the full text. Last updated: {LAST_UPDATED}.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '32px 0 0', display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' }}>
        {PAGES.map((p) => (
          <li key={p.href} className="card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: 6 }}>
              <Link href={p.href}>{p.title}</Link>
            </h2>
            <p className="muted" style={{ margin: 0 }}>{p.blurb}</p>
          </li>
        ))}
      </ul>
      <p className="muted" style={{ marginTop: 32 }}>
        Legal questions: <ContactLink kind="legal" />. Everything else: <ContactLink kind="general" />.
      </p>
    </div>
  );
}
