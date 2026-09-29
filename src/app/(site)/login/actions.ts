'use server';

import { AuthError } from 'next-auth';
import { signIn } from '@/auth';
import { safeNext } from './safe-next';

export interface LoginState { error?: string; email?: string }

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const redirectTo = safeNext(formData.get('next'));
  if (!email || !password) return { error: 'Enter your email and password.', email };
  try {
    await signIn('credentials', { email, password, redirectTo });
  } catch (e) {
    // signIn throws a redirect on success; only AuthError means the credentials were rejected.
    if (e instanceof AuthError) return { error: 'That email and password do not match an account.', email };
    throw e;
  }
  return {};
}

export async function googleAction(formData: FormData) {
  await signIn('google', { redirectTo: safeNext(formData.get('next'), '/settings') });
}
