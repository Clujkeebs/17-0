export const runtime = 'nodejs';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db, schema } from '@/db';
import { errorJson, json, clientIp, hashIp } from '@/lib/server/request';
import { getUserById, isUsernameAvailable, publicAccount } from '@/lib/server/account';
import { validateUsername, USERNAME_MESSAGES } from '@/lib/server/username';
import { subscribe, unsubscribeByEmail } from '@/lib/server/newsletter';
import { audit } from '@/lib/server/audit';

export async function GET() {
  const s = await auth();
  if (!s?.user?.id) return errorJson(401, 'Sign in first.');
  const u = await getUserById(s.user.id);
  if (!u) return errorJson(404, 'Account not found.');
  return json({ account: publicAccount(u) });
}

const Patch = z.object({
  username: z.string().max(64).optional(),
  displayName: z.string().trim().max(50).nullable().optional(),
  newsletterOptIn: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
}).strict();

export async function PATCH(req: Request) {
  const s = await auth();
  if (!s?.user?.id) return errorJson(401, 'Sign in first.');
  const u = await getUserById(s.user.id);
  if (!u) return errorJson(404, 'Account not found.');

  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Check the form and try again.');
  const body = parsed.data;
  const set: Partial<typeof schema.users.$inferInsert> = {};

  if (body.username !== undefined && body.username.trim() !== u.username) {
    const v = validateUsername(body.username);
    if (!v.ok) return errorJson(400, v.error, { fields: { username: v.error } });
    if (!(await isUsernameAvailable(v.username, u.id))) return errorJson(409, USERNAME_MESSAGES.taken, { fields: { username: USERNAME_MESSAGES.taken } });
    set.username = v.username;
  }
  if (body.displayName !== undefined) {
    const name = body.displayName?.replace(/[\u0000-\u001f]/g, '').trim() || null;
    set.name = name;
  }
  if (body.soundEnabled !== undefined) set.soundEnabled = body.soundEnabled;

  if (Object.keys(set).length) {
    try {
      await db.update(schema.users).set(set).where(eq(schema.users.id, u.id));
    } catch (e) {
      if (String((e as { constraint_name?: string }).constraint_name ?? '').includes('username')) return errorJson(409, USERNAME_MESSAGES.taken, { fields: { username: USERNAME_MESSAGES.taken } });
      throw e;
    }
    if (set.username) {
      // Keep leaderboard names in sync with the account.
      await db.update(schema.gameResults).set({ username: set.username }).where(eq(schema.gameResults.userId, u.id));
      await audit(u.id, 'user.username_changed', 'user', u.id, { from: u.username, to: set.username });
    }
  }

  let newsletterMessage: string | undefined;
  if (body.newsletterOptIn !== undefined && body.newsletterOptIn !== u.newsletterOptIn) {
    if (body.newsletterOptIn) {
      await db.update(schema.users).set({ newsletterOptIn: true }).where(eq(schema.users.id, u.id));
      await subscribe({ email: u.email, source: 'settings', ipHash: hashIp(clientIp(req)), referrer: null });
      newsletterMessage = 'Check your inbox to confirm the newsletter.';
    } else {
      await unsubscribeByEmail(u.email);
      newsletterMessage = 'You are off the newsletter.';
    }
  }

  const fresh = await getUserById(u.id);
  return json({ ok: true, account: fresh ? publicAccount(fresh) : null, message: newsletterMessage ?? 'Saved.' });
}
