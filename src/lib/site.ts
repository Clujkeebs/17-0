export const SITE = {
  name: 'Gridiron Lab',
  tagline: 'Six picks. Seventeen games. One perfect season.',
  url: (process.env.SITE_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  description: 'Spin six NFL teams, draft one player from each, and find out if your roster can go 17-0. Built on EA Sports Madden NFL ratings.',
  contactEmail: 'hello@gridironlab.example',
  legalEmail: 'legal@gridironlab.example',
  mailingAddress: process.env.MAILING_ADDRESS ?? 'Gridiron Lab, 1000 N West St Suite 1200, Wilmington, DE 19801',
};

export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
