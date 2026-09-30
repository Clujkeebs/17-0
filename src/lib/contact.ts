export const CONTACT_KINDS = ['general', 'legal', 'dmca', 'privacy', 'accessibility', 'bug'] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

export const CONTACT_KIND_LABELS: Record<ContactKind, string> = {
  general: 'General question or feedback',
  legal: 'Legal',
  dmca: 'Copyright or DMCA notice',
  privacy: 'Privacy or data request',
  accessibility: 'Accessibility barrier',
  bug: 'Bug report',
};

export const isContactKind = (v: unknown): v is ContactKind => typeof v === 'string' && (CONTACT_KINDS as readonly string[]).includes(v);

export const CONTACT_SUCCESS = 'Got it. A human reads every message. If it needs a reply, you will get one.';
