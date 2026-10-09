'use client';

import { useState } from 'react';
import { signInWithPassword } from '@/lib/client-auth';

export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const id = String(fd.get('email') ?? '').trim(), password = String(fd.get('password') ?? '');
    setEmail(id);
    if (!id || !password) { setError('Enter your username (or email) and password.'); return; }
    setPending(true); setError('');
    const r = await signInWithPassword(id, password);
    if (r === 'ok') { window.location.assign(next); return; }
    setPending(false);
    setError(r === 'bad' ? 'That username or email and password do not match an account.' : 'Could not reach the server. Check your connection and try again.');
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-describedby={error ? 'login-error' : undefined}>
      <div className="field">
        <label htmlFor="login-email">Username or email</label>
        <input id="login-email" name="email" type="text" autoComplete="username" autoCapitalize="none" required defaultValue={email} aria-invalid={!!error} />
      </div>
      <div className="field">
        <label htmlFor="login-password">Password</label>
        <input id="login-password" name="password" type="password" autoComplete="current-password" required minLength={8} aria-invalid={!!error} />
      </div>
      {error && <p id="login-error" role="alert" className="field-error">{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={pending} style={{ width: '100%' }}>{pending ? 'Signing in' : 'Sign in'}</button>
    </form>
  );
}

export function GoogleButton({ next }: { next: string }) {
  return <button className="btn" type="button" style={{ width: '100%' }} onClick={() => import('@/lib/client-auth').then((m) => m.signInWithGoogle(next))}>Continue with Google</button>;
}
