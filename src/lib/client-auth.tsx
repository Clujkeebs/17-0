'use client';
import { signIn, signOut } from 'next-auth/react';

/**
 * Credentials sign-in from the browser through NextAuth's /api/auth routes. This replaces a server action:
 * a server action ID changes on every deploy, so a sign-in form left open across a deploy failed with
 * "Failed to find Server Action". The API route does not have that problem.
 */
export async function signInWithPassword(email: string, password: string): Promise<'ok' | 'bad' | 'error'> {
  try {
    const r = await signIn('credentials', { email: email.trim().toLowerCase(), password, redirect: false });
    if (r?.ok && !r.error) return 'ok';
    return r?.error ? 'bad' : 'error';
  } catch { return 'error'; }
}

export function signInWithGoogle(next: string) {
  void signIn('google', { redirectTo: next });
}

/** Sign out through NextAuth's own route (not a server action, whose id changes on every deploy). */
export function SignOutButton({ className = 'btn' }: { className?: string }) {
  return <button className={className} type="button" onClick={() => void signOut({ redirectTo: '/' })}>Sign out</button>;
}
