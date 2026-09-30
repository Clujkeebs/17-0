'use client';

import { useState } from 'react';
import { CONTACT_KINDS, CONTACT_KIND_LABELS, type ContactKind } from '@/lib/contact';

type Key = 'kind' | 'name' | 'email' | 'subject' | 'message' | 'form';
type Fields = Partial<Record<Key, string>>;
const MAX = 5000;

export function ContactForm({ initialKind }: { initialKind: ContactKind }) {
  const [errors, setErrors] = useState<Fields>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState('');
  const [length, setLength] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      kind: String(fd.get('kind') ?? ''), name: String(fd.get('name') ?? '').trim(), email: String(fd.get('email') ?? '').trim(),
      subject: String(fd.get('subject') ?? '').trim(), message: String(fd.get('message') ?? '').trim(), website: String(fd.get('website') ?? ''),
    };
    const errs: Fields = {};
    if (!(CONTACT_KINDS as readonly string[]).includes(body.kind)) errs.kind = 'Pick what this is about.';
    if (!body.name) errs.name = 'Tell us your name.';
    if (!/^\S+@\S+\.\S+$/.test(body.email)) errs.email = 'That does not look like an email address.';
    if (!body.subject) errs.subject = 'Add a subject.';
    if (body.message.length < 10) errs.message = 'Message is too short. Give us at least 10 characters.';
    else if (body.message.length > MAX) errs.message = 'Message is too long. 5,000 characters max.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setPending(true);
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(data.fields ? data.fields : { form: res.status === 429 ? 'Too many messages from this connection. Try again in an hour.' : (data.error ?? 'That did not work. Try again.') });
        return;
      }
      setDone(data.message ?? 'Got it.');
    } catch {
      setErrors({ form: 'Network error. Check your connection and try again.' });
    } finally { setPending(false); }
  }

  if (done) return <p role="status" className="card">{done}</p>;

  const err = (k: Key) => errors[k] ? <p id={`contact-${k}-error`} className="field-error" role="alert">{errors[k]}</p> : null;
  const by = (k: Key, hint?: string) => [hint, errors[k] ? `contact-${k}-error` : null].filter(Boolean).join(' ') || undefined;

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="contact-kind">What is this about?</label>
        <select id="contact-kind" name="kind" defaultValue={initialKind} aria-invalid={!!errors.kind} aria-describedby={by('kind')}>
          {CONTACT_KINDS.map((k) => <option key={k} value={k}>{CONTACT_KIND_LABELS[k]}</option>)}
        </select>
        {err('kind')}
      </div>
      <div className="field">
        <label htmlFor="contact-name">Name</label>
        <input id="contact-name" name="name" type="text" autoComplete="name" required maxLength={120} aria-invalid={!!errors.name} aria-describedby={by('name')} />
        {err('name')}
      </div>
      <div className="field">
        <label htmlFor="contact-email">Email</label>
        <input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com"
          aria-invalid={!!errors.email} aria-describedby={by('email', 'contact-email-hint')} />
        <p id="contact-email-hint" className="hint">Only used to reply to this message.</p>
        {err('email')}
      </div>
      <div className="field">
        <label htmlFor="contact-subject">Subject</label>
        <input id="contact-subject" name="subject" type="text" required maxLength={200} aria-invalid={!!errors.subject} aria-describedby={by('subject')} />
        {err('subject')}
      </div>
      <div className="field">
        <label htmlFor="contact-message">Message</label>
        <textarea id="contact-message" name="message" required rows={8} maxLength={MAX} onChange={(e) => setLength(e.target.value.length)}
          aria-invalid={!!errors.message} aria-describedby={by('message', 'contact-message-hint')} />
        <p id="contact-message-hint" className="hint">{length.toLocaleString('en-US')} of 5,000 characters. For bugs, include the page and what you expected.</p>
        {err('message')}
      </div>
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="contact-website">Leave this empty</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {errors.form && <p role="alert" className="field-error">{errors.form}</p>}
      <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? 'Sending' : 'Send message'}</button>
    </form>
  );
}
