'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

const LABELS = ['Bad', 'Meh', 'Fine', 'Good', 'Great'];

/** The footer questionnaire. A rating is required, the note is optional. */
export function FeedbackForm() {
  const path = usePathname() ?? '/';
  const [rating, setRating] = useState(0);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!rating) { setState('error'); setMsg('Pick a rating first.'); return; }
    setState('sending');
    try {
      const res = await fetch('/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rating, message: String(f.get('message') ?? ''), page: path, website: String(f.get('website') ?? '') }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setState('error'); setMsg(data.error ?? 'That did not send. Try again in a minute.'); return; }
      setState('sent');
    } catch { setState('error'); setMsg('Network error. Check your connection and try again.'); }
  }
  if (state === 'sent') return <p role="status" className="accent">Got it. Thanks. Suggestions get read every hour.</p>;
  return (
    <form onSubmit={onSubmit} className="fb-form">
      <fieldset className="fb-rate">
        <legend>How is Unbeaten?</legend>
        <div className="fb-scale">
          {LABELS.map((l, i) => (
            <label key={l} className={rating === i + 1 ? 'on' : undefined}>
              <input type="radio" name="rating" value={i + 1} checked={rating === i + 1} onChange={() => setRating(i + 1)} />
              <span className="num">{i + 1}</span><small>{l}</small>
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor="fb-message">What would you change? <span className="muted">(optional)</span></label>
      <textarea id="fb-message" name="message" rows={3} maxLength={1000} placeholder="A game you want, a bug, a player on the wrong team" />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="fb-hp" />
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending' : 'Send feedback'}</button>
      </div>
      {state === 'error' && <p role="alert" className="field-error">{msg}</p>}
    </form>
  );
}
