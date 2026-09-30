import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site';
import { isContactKind } from '@/lib/contact';
import { ContactForm } from './ContactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Reach the ${SITE.name} team: questions, bug reports, legal, privacy, accessibility, and copyright notices.`,
  alternates: { canonical: '/contact' },
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ kind?: string | string[] }> }) {
  const { kind } = await searchParams;
  const k = Array.isArray(kind) ? kind[0] : kind;
  return (
    <div className="container section">
      <article className="prose" style={{ maxWidth: 640 }}>
        <span className="eyebrow">Contact</span>
        <h1>Say the thing.</h1>
        <p>
          Bug, formula dispute, privacy request, copyright notice, or just an opinion about your roster. Pick a topic and write it out. A person reads
          every message.
        </p>
        <ContactForm initialKind={isContactKind(k) ? k : 'general'} />
        <p className="muted" style={{ marginTop: 32 }}>
          By mail: {SITE.mailingAddress}. For copyright notices, see the <Link href="/legal/dmca">DMCA policy</Link>. For how we handle what you send,
          see the <Link href="/legal/privacy">Privacy Policy</Link>.
        </p>
      </article>
    </div>
  );
}
