export const runtime = 'nodejs';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db, schema } from '@/db';
import { errorJson, json, clientIp, hashIp } from '@/lib/server/request';
import { getStreak, getUserById, isUsernameAvailable, publicAccount } from '@/lib/server/account';
import { validateDisplayName, validateUsername, USERNAME_MESSAGES } from '@/lib/server/username';
import { canEquip } from '@/lib/cosmetics';
import { games } from '@/lib/minigames/games';
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
  // Profile picture: a small square the browser already resized, as a data URL. null removes it.
  image: z.string().max(120_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/).nullable().optional(),
  favoriteGames: z.array(z.string().max(40)).max(3).optional(),
  nameFont: z.string().max(20).optional(),
  nameColor: z.string().max(20).optional(),
}).strict();

const GAME_SLUGS = new Set(['17-0', 'build-a-player', ...games.map((g) => g.slug)]);

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
    const v = validateDisplayName(body.displayName);
    if (!v.ok) return errorJson(400, v.error, { fields: { displayName: v.error } });
    set.name = v.name;
  }
  if (body.image !== undefined) set.image = body.image;
  if (body.favoriteGames !== undefined) {
    if (!body.favoriteGames.every((g) => GAME_SLUGS.has(g))) return errorJson(400, 'Pick games from the list.');
    set.favoriteGames = [...new Set(body.favoriteGames)];
  }
  if (body.nameFont !== undefined || body.nameColor !== undefined) {
    // Unlocks are checked here against the player's own streak; the owner style is not equippable at all.
    const { longest } = await getStreak(u.id);
    if (body.nameFont !== undefined) {
      if (!canEquip('font', body.nameFont, longest)) return errorJson(403, 'That font is still locked. Keep the streak going.');
      set.nameFont = body.nameFont;
    }
    if (body.nameColor !== undefined) {
      if (!canEquip('color', body.nameColor, longest)) return errorJson(403, 'That color is still locked. Keep the streak going.');
      set.nameColor = body.nameColor;
    }
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
  if (body.newsletterOptIn !== undefined && body.newsletterOptIn !== u.newsletterOptIn && !u.email) {
    return errorJson(400, 'Add an email address first to get the newsletter.');
  }
  if (body.newsletterOptIn !== undefined && body.newsletterOptIn !== u.newsletterOptIn && u.email) {
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
