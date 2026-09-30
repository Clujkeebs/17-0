import { sendEmail, escapeHtml } from './email';

export const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);

/** Operational alert: always logs, then emails every ADMIN_EMAILS address. Never throws. */
export async function alertAdmins(subject: string, text: string) {
  console.warn('[alert]', subject, text);
  const to = adminEmails();
  await Promise.all(to.map((addr) =>
    sendEmail({ to: addr, subject: `[Unbeaten] ${subject}`, text, html: `<pre style="white-space:pre-wrap;font-family:monospace">${escapeHtml(text)}</pre>` })
      .catch((e) => console.error('[alert] email failed', (e as Error).message)),
  ));
}
