import NextAuth, { type DefaultSession } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';

declare module 'next-auth' {
  interface Session { user: { id: string; username?: string | null; isAdmin?: boolean } & DefaultSession['user'] }
}

export const isAdminEmail = (email?: string | null) =>
  !!email && (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());

const providers = [];
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) providers.push(Google);
providers.push(Credentials({
  credentials: { email: {}, password: {} },
  async authorize(raw) {
    const parsed = z.object({ email: z.string().email(), password: z.string().min(8).max(200) }).safeParse(raw);
    if (!parsed.success) return null;
    const [u] = await db.select().from(schema.users).where(eq(schema.users.email, parsed.data.email.toLowerCase())).limit(1);
    if (!u || !u.hashedPassword || u.deletedAt) return null;
    if (!(await bcrypt.compare(parsed.data.password, u.hashedPassword))) return null;
    return { id: u.id, email: u.email, name: u.name };
  },
}));

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users, accountsTable: schema.accounts, sessionsTable: schema.sessions, verificationTokensTable: schema.verificationTokens,
  } as never),
  // JWT sessions: required for the credentials provider. Cookie is httpOnly, secure in prod, sameSite=lax.
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: { signIn: '/login' },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      if (token.sub && (user || !('username' in token))) {
        const [u] = await db.select({ username: schema.users.username, deletedAt: schema.users.deletedAt }).from(schema.users).where(eq(schema.users.id, token.sub)).limit(1);
        if (!u || u.deletedAt) return null;
        token.username = u.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.username = (token.username as string | null) ?? null;
      session.user.isAdmin = isAdminEmail(session.user.email);
      return session;
    },
  },
});

export async function requireAdmin() {
  const s = await auth();
  return s?.user?.isAdmin ? s : null;
}
