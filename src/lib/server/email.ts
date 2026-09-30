import { Resend } from 'resend';
import { SITE } from '@/lib/site';

// Transactional + marketing email. Every message ships HTML and plain text, an honest From,
// the physical mailing address, and an unsubscribe link. Marketing mail adds RFC 8058 headers.

export interface Email {
  subject: string;
  html: string;
  text: string;
}

export interface SendOptions extends Email {
  to: string;
  /** Marketing mail gets List-Unsubscribe + List-Unsubscribe-Post headers. Requires unsubscribeUrl. */
  marketing?: boolean;
  unsubscribeUrl?: string | null;
}

export interface SendResult { ok: boolean; id?: string; error?: string }

const C = { navy: '#0A1128', green: '#1B4332', bone: '#F8F9FA', orange: '#E76F51', steel: '#4A5568', boneDim: '#B8C0CC' };

const from = () => process.env.EMAIL_FROM ?? `${SITE.name} <onboarding@resend.dev>`;
const unsubscribeMailto = (): string | null =>
  process.env.EMAIL_UNSUBSCRIBE_MAILTO ?? (SITE.contactEmail ? `mailto:${SITE.contactEmail}?subject=unsubscribe` : null);

let client: Resend | null = null;
function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  client ??= new Resend(key);
  return client;
}

export const unsubscribeUrlFor = (unsubscribeToken: string) =>
  `${SITE.url}/api/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export async function sendEmail(opts: SendOptions): Promise<SendResult> {
  const headers: Record<string, string> = {};
  if (opts.marketing) {
    if (!opts.unsubscribeUrl) return { ok: false, error: 'marketing email requires an unsubscribe URL' };
    const mailto = unsubscribeMailto();
    headers['List-Unsubscribe'] = mailto ? `<${opts.unsubscribeUrl}>, <${mailto}>` : `<${opts.unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }
  const resend = getClient();
  if (!resend) {
    if (process.env.NODE_ENV !== 'production') {
      const link = opts.text.match(/https?:\/\/\S+/)?.[0] ?? '(no link)';
      console.info(`[email:dev] to=${opts.to} subject="${opts.subject}" link=${link}`);
    } else {
      console.warn('[email] RESEND_API_KEY missing, email not sent:', opts.subject);
    }
    return { ok: true };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: from(), to: opts.to, subject: opts.subject, html: opts.html, text: opts.text,
      headers: Object.keys(headers).length ? headers : undefined,
    });
    if (error) { console.error('[email]', error.message); return { ok: false, error: error.message }; }
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error('[email]', (e as Error).message);
    return { ok: false, error: (e as Error).message };
  }
}

// ---------- layout ----------

interface LayoutInput { heading: string; paragraphs: string[]; cta?: { label: string; url: string }; after?: string[]; unsubscribeUrl?: string | null; footerNote?: string }

function footerText(unsubscribeUrl?: string | null, note?: string) {
  const lines = ['--', note ?? `You are getting this because of an action on ${SITE.url.replace(/^https?:\/\//, '')}.`];
  lines.push(unsubscribeUrl ? `Unsubscribe in one click: ${unsubscribeUrl}` : `You are not on any ${SITE.name} mailing list. Manage email settings: ${SITE.url}/settings`);
  lines.push(SITE.mailingAddress);
  return lines.join('\n');
}

function layout(i: LayoutInput): { html: string; text: string } {
  const p = (t: string) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${C.bone};">${t}</p>`;
  const cta = i.cta
    ? `<p style="margin:24px 0;"><a href="${escapeHtml(i.cta.url)}" style="display:inline-block;background:${C.orange};color:${C.navy};font-weight:700;text-decoration:none;padding:12px 20px;border-radius:2px;">${escapeHtml(i.cta.label)}</a></p>
       <p style="margin:0 0 16px;font-size:13px;color:${C.boneDim};word-break:break-all;">Or paste this link: ${escapeHtml(i.cta.url)}</p>`
    : '';
  const unsub = i.unsubscribeUrl
    ? `<a href="${escapeHtml(i.unsubscribeUrl)}" style="color:${C.boneDim};">Unsubscribe in one click</a>`
    : `You are not on any ${escapeHtml(SITE.name)} mailing list. <a href="${SITE.url}/settings" style="color:${C.boneDim};">Email settings</a>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(i.heading)}</title></head>
<body style="margin:0;padding:0;background:${C.navy};font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.navy};"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 0 16px;border-bottom:1px solid ${C.steel};font-weight:800;font-size:18px;color:${C.bone};">Unbeaten</td></tr>
<tr><td style="padding:24px 0 8px;">
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;color:${C.bone};">${escapeHtml(i.heading)}</h1>
${i.paragraphs.map(p).join('\n')}
${cta}
${(i.after ?? []).map(p).join('\n')}
</td></tr>
<tr><td style="padding:16px 0 0;border-top:1px solid ${C.steel};font-size:12px;line-height:1.5;color:${C.boneDim};">
<p style="margin:0 0 8px;">${escapeHtml(i.footerNote ?? `You are getting this because of an action on ${SITE.url.replace(/^https?:\/\//, '')}.`)}</p>
<p style="margin:0 0 8px;">${unsub}</p>
<p style="margin:0;">${escapeHtml(SITE.mailingAddress)}</p>
</td></tr></table></td></tr></table></body></html>`;
  const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const text = [
    i.heading, '',
    ...i.paragraphs.map(strip).flatMap((t) => [t, '']),
    ...(i.cta ? [`${i.cta.label}: ${i.cta.url}`, ''] : []),
    ...(i.after ?? []).map(strip).flatMap((t) => [t, '']),
    footerText(i.unsubscribeUrl, i.footerNote),
  ].join('\n');
  return { html, text };
}

// ---------- templates ----------

export function newsletterConfirm(confirmUrl: string, unsubscribeUrl: string): Email {
  return {
    subject: `Confirm your ${SITE.name} subscription`,
    ...layout({
      heading: 'One click to confirm',
      paragraphs: ['Someone, hopefully you, asked to get the Unbeaten newsletter at this address. Confirm and you are in.'],
      cta: { label: 'Confirm subscription', url: confirmUrl },
      after: ['The link expires in 24 hours. If you did not ask for this, ignore it and you will not hear from us again.'],
      unsubscribeUrl,
      footerNote: 'You are getting this because this address was entered in a newsletter signup form.',
    }),
  };
}

export function accountDeleted(unsubscribeUrl?: string | null): Email {
  return {
    subject: `Your ${SITE.name} account is deleted`,
    ...layout({
      heading: 'Account deleted',
      paragraphs: [
        'Your account and profile data are gone. Past game results stay on public leaderboards under an anonymous name with no link back to you.',
        'Any newsletter subscription tied to this address was removed too. This is the last email you will get about this account.',
      ],
      after: [SITE.contactEmail
        ? `If you did not do this, email ${escapeHtml(SITE.contactEmail)} right away.`
        : `If you did not do this, tell us right away: ${SITE.url}/contact?kind=privacy`],
      unsubscribeUrl,
      footerNote: 'You are getting this one-time notice because an account using this address was deleted.',
    }),
  };
}

export function registrationNotice(loginUrl: string, unsubscribeUrl?: string | null): Email {
  return {
    subject: `Someone tried to register with your email on ${SITE.name}`,
    ...layout({
      heading: 'You already have an account',
      paragraphs: [
        'Someone tried to create a new Unbeaten account with this email address. You already have one, so nothing changed.',
        'If that was you, sign in instead. If it was not, you can ignore this. Your password was not changed.',
      ],
      cta: { label: 'Sign in', url: loginUrl },
      unsubscribeUrl,
      footerNote: 'You are getting this one-time security notice because this address was entered in the signup form.',
    }),
  };
}

export function dailyPuzzle(date: string, teams: string[], unsubscribeUrl: string): Email {
  const list = teams.map((t) => escapeHtml(t)).join(', ');
  return {
    subject: `Daily 17-0 for ${date}: ${teams.length} teams, one shot`,
    ...layout({
      heading: `Daily 17-0, ${date}`,
      paragraphs: [
        `Today's board: ${list || 'six teams, revealed when you spin'}.`,
        'Same six teams for everyone. One run counts for the daily leaderboard. Draft well.',
      ],
      cta: { label: "Play today's board", url: `${SITE.url}/games/17-0?daily=1` },
      unsubscribeUrl,
      footerNote: `You are getting this because you subscribed to the ${SITE.name} newsletter.`,
    }),
  };
}
