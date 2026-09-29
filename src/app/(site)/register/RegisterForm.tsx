'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics';

type Fields = Partial<Record<'email' | 'password' | 'username' | 'form', string>>;

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Fields>({});
  const [pending, setPending] = useState(false);
  const [started, setStarted] = useState(false);

  function onFocus() {
    if (started) return;
    setStarted(true);
    track('signup_started');
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      email: String(fd.get('email') ?? ''), password: String(fd.get('password') ?? ''),
      username: String(fd.get('username') ?? ''), newsletter: fd.get('newsletter') === 'on',
    };
    const errs: Fields = {};
    if (!/^\S+@\S+\.\S+$/.test(body.email)) errs.email = 'That does not look like an email address.';
    if (body.password.length < 8) errs.password = 'Password needs at least 8 characters.';
    if (!/^[A-Za-z0-9_]{3,20}$/.test(body.username)) errs.username = body.username.length < 3 || body.username.length > 20 ? 'Three to twenty characters.' : 'Keep it to letters, numbers, and underscores.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setPending(true);
    try {
      const res = await fetch('/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErrors({ ...(data.fields ?? {}), form: data.fields ? undefined : (data.error ?? 'That did not work. Try again.') }); return; }
      track('signup_completed');
      router.push(`/login?registered=1&next=${encodeURIComponent(next)}`);
    } catch {
      setErrors({ form: 'Network error. Check your connection and try again.' });
    } finally { setPending(false); }
  }

  const err = (k: keyof Fields) => errors[k] ? <p id={`reg-${k}-error`} className="field-error" role="alert">{errors[k]}</p> : null;
  const describedBy = (k: keyof Fields, hint?: string) => [hint, errors[k] ? `reg-${k}-error` : null].filter(Boolean).join(' ') || undefined;

  return (
    <form onSubmit={onSubmit} onFocus={onFocus} noValidate>
      <div className="field">
        <label htmlFor="reg-username">Username</label>
        <input id="reg-username" name="username" type="text" autoComplete="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+"
          aria-invalid={!!errors.username} aria-describedby={describedBy('username', 'reg-username-hint')} />
        <p id="reg-username-hint" className="hint">Shows on leaderboards. 3 to 20 letters, numbers, or underscores.</p>
        {err('username')}
      </div>
      <div className="field">
        <label htmlFor="reg-email">Email</label>
        <input id="reg-email" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} aria-describedby={describedBy('email', 'reg-email-hint')} />
        <p id="reg-email-hint" className="hint">For sign-in and account notices. Never shown publicly.</p>
        {err('email')}
      </div>
      <div className="field">
        <label htmlFor="reg-password">Password</label>
        <input id="reg-password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-invalid={!!errors.password} aria-describedby={describedBy('password', 'reg-password-hint')} />
        <p id="reg-password-hint" className="hint">At least 8 characters. Longer beats clever.</p>
        {err('password')}
      </div>
      <div className="field">
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontWeight: 400 }}>
          <input type="checkbox" name="newsletter" style={{ marginTop: 4 }} />
          <span>Send me the newsletter. We will email a confirmation link first.</span>
        </label>
      </div>
      {errors.form && <p role="alert" className="field-error">{errors.form}</p>}
      <button className="btn btn-primary" type="submit" disabled={pending} style={{ width: '100%' }}>{pending ? 'Creating account' : 'Create account'}</button>
    </form>
  );
}
