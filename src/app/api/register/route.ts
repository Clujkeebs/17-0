export const runtime = 'nodejs';

import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { SITE } from '@/lib/site';
import { errorJson, clientIp, hashIp, json } from '@/lib/server/request';
import { limitByIp } from '@/lib/server/rate-limit';
import { validateUsername, USERNAME_MESSAGES } from '@/lib/server/username';
import { isUsernameAvailable } from '@/lib/server/account';
import { registrationNotice, sendEmail } from '@/lib/server/email';
import { subscribe, unsubscribeUrlForEmail } from '@/lib/server/newsletter';
import { audit } from '@/lib/server/audit';

const Body = z.object({
  email: z.string().trim().toLowerCase().max(254).email(),
  password: z.string().min(8).max(200),
  username: z.string().max(64),
  newsletter: z.boolean().optional(),
});

// Same response whether or not the email already has an account.
const OK_MESSAGE = 'Done. Sign in with the email and password you just used.';

export async function POST(req: Request) {
  const limited = await limitByIp(req, 'register');
  if (limited) return limited;

  const raw = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? 'form');
      if (fields[k]) continue;
      fields[k] = k === 'email' ? 'That does not look like an email address.'
        : k === 'password' ? 'Password needs at least 8 characters.'
        : k === 'username' ? USERNAME_MESSAGES.required : 'Check the form and try again.';
    }
    return errorJson(400, Object.values(fields)[0] ?? 'Check the form and try again.', { fields });
  }
  const { email, password, newsletter } = parsed.data;

  const u = validateUsername(parsed.data.username);
  if (!u.ok) return errorJson(400, u.error, { fields: { username: u.error } });

  // Username availability is public information (it shows on leaderboards), so it is safe to report.
  if (!(await isUsernameAvailable(u.username))) return errorJson(409, USERNAME_MESSAGES.taken, { fields: { username: USERNAME_MESSAGES.taken } });

  // Hash before the existence check so both paths take the same time.
  const hashedPassword = await bcrypt.hash(password, 12);
  const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing) {
    const mail = registrationNotice(`${SITE.url}/login`, await unsubscribeUrlForEmail(email));
    void sendEmail({ to: email, ...mail }).catch(() => undefined);
    return json({ ok: true, message: OK_MESSAGE });
  }

  try {
    const [created] = await db.insert(schema.users).values({ email, username: u.username, hashedPassword }).returning({ id: schema.users.id });
    await audit(created.id, 'user.registered', 'user', created.id);
  } catch (e) {
    // Unique violation from a race: either email (respond as success) or username.
    const msg = (e as { constraint_name?: string; message?: string });
    if (String(msg.constraint_name ?? msg.message).includes('username')) return errorJson(409, USERNAME_MESSAGES.taken, { fields: { username: USERNAME_MESSAGES.taken } });
    if (String(msg.constraint_name ?? msg.message).includes('email')) return json({ ok: true, message: OK_MESSAGE });
    console.error('[register]', msg.message);
    return errorJson(500, 'Something broke on our end. Try again in a minute.');
  }

  if (newsletter) {
    try {
      await subscribe({ email, source: 'register', ipHash: hashIp(clientIp(req)), referrer: req.headers.get('referer') });
    } catch (e) { console.error('[register:newsletter]', (e as Error).message); }
  }
  return json({ ok: true, message: OK_MESSAGE });
}
