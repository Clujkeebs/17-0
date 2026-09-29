'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from './actions';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} noValidate aria-describedby={state.error ? 'login-error' : undefined}>
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="login-email">Email</label>
        <input id="login-email" name="email" type="email" autoComplete="email" required defaultValue={state.email} aria-invalid={!!state.error} />
      </div>
      <div className="field">
        <label htmlFor="login-password">Password</label>
        <input id="login-password" name="password" type="password" autoComplete="current-password" required minLength={8} aria-invalid={!!state.error} />
      </div>
      {state.error && <p id="login-error" role="alert" className="field-error">{state.error}</p>}
      <button className="btn btn-primary" type="submit" disabled={pending} style={{ width: '100%' }}>{pending ? 'Signing in' : 'Sign in'}</button>
    </form>
  );
}
