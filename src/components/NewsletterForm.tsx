'use client';
import { useState } from 'react';
import { track } from '@/lib/analytics';

export function NewsletterForm({ source, label = 'Email address' }: { source: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const id = `nl-${source}`;
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') ?? '');
    setState('sending');
    track('newsletter_submitted', { source });
    try {
      const res = await fetch('/api/newsletter/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, source }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setState('error'); setMsg(data.error ?? 'That did not work. Try again in a minute.'); return; }
      setState('sent');
      setMsg('Check your inbox. Click the link in the next 24 hours to confirm.');
    } catch { setState('error'); setMsg('Network error. Check your connection and try again.'); }
  }
  if (state === 'sent') return <p role="status" className="accent">{msg}</p>;
  return (
    <form onSubmit={onSubmit} noValidate={false} aria-describedby={`${id}-help`}>
      <label htmlFor={id}>{label}</label>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <input id={id} name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        <button className="btn btn-primary" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending' : 'Subscribe'}</button>
      </div>
      <p id={`${id}-help`} className="hint">Double opt-in. We never sell or share your email.</p>
      {state === 'error' && <p role="alert" className="field-error">{msg}</p>}
    </form>
  );
}
