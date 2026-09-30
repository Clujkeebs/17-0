export const SITE = {
  name: 'Unbeaten',
  tagline: 'Six picks. Seventeen games. One perfect season.',
  url: (process.env.SITE_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  description: 'Spin six NFL teams, draft one player from each, and find out if your roster can go 17-0. Built on EA Sports Madden NFL ratings.',
  /** Set CONTACT_EMAIL / LEGAL_EMAIL once the domain mailboxes exist. Until then the site routes people to /contact. */
  contactEmail: process.env.CONTACT_EMAIL ?? null as string | null,
  legalEmail: process.env.LEGAL_EMAIL ?? process.env.CONTACT_EMAIL ?? null as string | null,
  mailingAddress: process.env.MAILING_ADDRESS ?? 'Unbeaten, 12831 Muscatine Street, Suite A, Pacoima, CA 91331',
  state: 'California',
};

export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
