export const runtime = 'nodejs';

import { z } from 'zod';
import { db, schema } from '@/db';
import { clientIp, errorJson, hashIp, json } from '@/lib/server/request';
import { limitByIp } from '@/lib/server/rate-limit';
import { escapeHtml, sendEmail } from '@/lib/server/email';
import { adminEmails } from '@/lib/server/alert';
import { CONTACT_KINDS, CONTACT_KIND_LABELS, CONTACT_SUCCESS } from '@/lib/contact';

const Body = z.object({
  kind: z.enum(CONTACT_KINDS, { message: 'Pick what this is about.' }),
  name: z.string().trim().min(1, 'Tell us your name.').max(120, 'Name is too long. 120 characters max.'),
  email: z.string().trim().toLowerCase().max(254, 'That email is too long.').email('That does not look like an email address.'),
  subject: z.string().trim().min(1, 'Add a subject.').max(200, 'Subject is too long. 200 characters max.'),
  message: z.string().trim().min(10, 'Message is too short. Give us at least 10 characters.').max(5000, 'Message is too long. 5,000 characters max.'),
  website: z.string().optional(),
});

export async function POST(req: Request) {
  const limited = await limitByIp(req, 'contact');
  if (limited) return limited;
  const raw = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? 'form');
      fields[k] ??= issue.message;
    }
    return errorJson(400, 'Some fields need attention.', { fields });
  }
  const d = parsed.data;
  // Honeypot: bots fill every field. Pretend it worked.
  if (d.website) return json({ ok: true, message: CONTACT_SUCCESS });

  let id: string;
  try {
    const [row] = await db.insert(schema.contactMessages).values({
      kind: d.kind, name: d.name, email: d.email, subject: d.subject, message: d.message, ipHash: hashIp(clientIp(req)),
    }).returning({ id: schema.contactMessages.id });
    id = row.id;
  } catch (e) {
    console.error('[contact]', (e as Error).message);
    return errorJson(500, 'That did not save. Try again in a minute.');
  }

  try {
    const text = `${CONTACT_KIND_LABELS[d.kind]}\nFrom: ${d.name} <${d.email}>\nSubject: ${d.subject}\n\n${d.message}\n\nInbox: /admin/messages (id ${id})`;
    const html = `<pre style="white-space:pre-wrap;font-family:monospace">${escapeHtml(text)}</pre>`;
    await Promise.all(adminEmails().map((to) =>
      sendEmail({ to, subject: `[Unbeaten contact: ${d.kind}] ${d.subject}`, text, html }).catch(() => null)));
  } catch (e) {
    console.error('[contact] notify failed', (e as Error).message);
  }

  return json({ ok: true, message: CONTACT_SUCCESS });
}
