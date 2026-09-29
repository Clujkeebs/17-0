import Link from 'next/link';
import type { ReactNode } from 'react';

export const LAST_UPDATED = 'September 29, 2026';

type Props = {
  title: string;
  eyebrow?: string;
  summary: ReactNode;
  children: ReactNode;
};

/** Shared shell for legal pages: plain-English summary box, then the full text. Server-only, zero client JS. */
export function LegalPage({ title, eyebrow = 'Legal', summary, children }: Props) {
  return (
    <div className="container section">
      <nav aria-label="Breadcrumb" className="muted" style={{ fontSize: '.85rem', marginBottom: 16 }}>
        <Link href="/legal">Legal</Link> <span aria-hidden="true">/</span> <span aria-current="page">{title}</span>
      </nav>
      <article className="prose">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="muted">Last updated: {LAST_UPDATED}</p>
        <section aria-labelledby="summary-heading" className="card card-green" style={{ margin: '24px 0 8px' }}>
          <h2 id="summary-heading" style={{ marginTop: 0, fontSize: '1.1rem' }}>The short version</h2>
          {summary}
          <p style={{ margin: 0, fontSize: '.85rem' }}>
            This summary is here to help you read the full text below. It is not a replacement for it. If the two ever disagree, the full text controls.
          </p>
        </section>
        {children}
      </article>
    </div>
  );
}
