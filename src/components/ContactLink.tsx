import Link from 'next/link';
import { SITE } from '@/lib/site';
import type { ContactKind } from '@/lib/contact';

const LEGAL_KINDS: ContactKind[] = ['legal', 'dmca', 'privacy'];

/** Email address for this kind of message, or null when no mailbox is configured yet. */
export const contactEmailFor = (kind: ContactKind) => (LEGAL_KINDS.includes(kind) ? SITE.legalEmail : SITE.contactEmail);

/** Verb phrase that reads naturally before a ContactLink: "email" or "use". */
export const contactVerb = (kind: ContactKind) => (contactEmailFor(kind) ? 'email' : 'use');

/** Mailto link when a mailbox exists, otherwise a link to /contact with the kind preselected. */
export function ContactLink({ kind = 'general', subject }: { kind?: ContactKind; subject?: string }) {
  const email = contactEmailFor(kind);
  if (email) {
    const href = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
    return <a href={href}>{email}</a>;
  }
  return <Link href={`/contact?kind=${kind}`}>our contact form</Link>;
}
