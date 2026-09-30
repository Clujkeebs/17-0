'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { onSoundChange, setSound, soundOn } from '@/components/game/sound';

async function patch(body: Record<string, unknown>) {
  const res = await fetch('/api/user/profile', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data } as { ok: boolean; data: { error?: string; message?: string; fields?: Record<string, string> } };
}

export function IdentityForm({ username, displayName, prompt }: { username: string | null; displayName: string | null; prompt: boolean }) {
  const router = useRouter();
  const [err, setErr] = useState<{ username?: string; displayName?: string; form?: string }>({});
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const u = String(fd.get('username') ?? '').trim();
    const d = String(fd.get('displayName') ?? '').trim();
    setMsg('');
    if (!/^[A-Za-z0-9_]{3,20}$/.test(u)) {
      setErr({ username: u.length < 3 || u.length > 20 ? 'Three to twenty characters.' : 'Keep it to letters, numbers, and underscores.' });
      return;
    }
    setPending(true);
    const r = await patch({ username: u, displayName: d || null }).catch(() => null);
    setPending(false);
    if (!r) { setErr({ form: 'Network error. Try again.' }); return; }
    if (!r.ok) { setErr({ ...(r.data.fields ?? {}), form: r.data.fields ? undefined : r.data.error }); return; }
    setErr({});
    setMsg('Saved.');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {prompt && <p role="status" className="accent">Pick a username so your scores can show on leaderboards.</p>}
      <div className="field">
        <label htmlFor="set-username">Username</label>
        <input id="set-username" name="username" type="text" defaultValue={username ?? ''} required minLength={3} maxLength={20} autoComplete="username"
          aria-invalid={!!err.username} aria-describedby={`set-username-hint${err.username ? ' set-username-error' : ''}`} autoFocus={prompt} />
        <p id="set-username-hint" className="hint">Public. 3 to 20 letters, numbers, or underscores.</p>
        {err.username && <p id="set-username-error" role="alert" className="field-error">{err.username}</p>}
      </div>
      <div className="field">
        <label htmlFor="set-display">Display name <span className="muted">(optional)</span></label>
        <input id="set-display" name="displayName" type="text" defaultValue={displayName ?? ''} maxLength={50} autoComplete="nickname"
          aria-invalid={!!err.displayName} aria-describedby={err.displayName ? 'set-display-error' : undefined} />
        {err.displayName && <p id="set-display-error" role="alert" className="field-error">{err.displayName}</p>}
      </div>
      {err.form && <p role="alert" className="field-error">{err.form}</p>}
      <div className="row">
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? 'Saving' : 'Save'}</button>
        {msg && <span role="status" className="accent">{msg}</span>}
      </div>
    </form>
  );
}

export function Toggle({ field, label, hint, initial }: { field: 'newsletterOptIn' | 'soundEnabled'; label: string; hint: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const id = `toggle-${field}`;
  const isSound = field === 'soundEnabled';

  // Game sounds live in localStorage; the account mirror is so the preference follows the
  // user across devices. Apply the local change immediately instead of only on save.
  useEffect(() => {
    if (!isSound) return;
    setOn(soundOn());
    return onSoundChange(setOn);
  }, [isSound]);

  async function onChange(next: boolean) {
    if (isSound) setSound(next);
    setPending(true); setMsg(''); setError('');
    const r = await patch({ [field]: next }).catch(() => null);
    setPending(false);
    if (!r || !r.ok) { setError(r?.data.error ?? 'Could not save. Try again.'); return; }
    setOn(next);
    setMsg(r.data.message ?? 'Saved.');
  }

  return (
    <div className="field">
      <label htmlFor={id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <input id={id} type="checkbox" checked={on} disabled={pending} onChange={(e) => onChange(e.target.checked)} aria-describedby={`${id}-hint`} style={{ marginTop: 4, width: 18, height: 18 }} />
        <span>{label}</span>
      </label>
      <p id={`${id}-hint`} className="hint">{hint}</p>
      {msg && <p role="status" className="hint accent">{msg}</p>}
      {error && <p role="alert" className="field-error">{error}</p>}
    </div>
  );
}

export function DeleteAccountForm() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (value !== 'DELETE') { setError('Type DELETE, in capitals, to confirm.'); return; }
    setPending(true); setError('');
    try {
      const res = await fetch('/api/user/delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: value }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? 'Delete failed. Try again.'); setPending(false); return; }
      await signOut({ redirectTo: '/?deleted=1' });
    } catch {
      setError('Network error. Nothing was deleted.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="delete-confirm">Type DELETE to confirm</label>
        <input id="delete-confirm" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={value}
          onChange={(e) => setValue(e.target.value)} aria-invalid={!!error} aria-describedby={`delete-hint${error ? ' delete-error' : ''}`} />
        <p id="delete-hint" className="hint">Removes your account, sign-in methods, and newsletter subscription. Your past scores stay on leaderboards under an anonymous name. This cannot be undone.</p>
        {error && <p id="delete-error" role="alert" className="field-error">{error}</p>}
      </div>
      <button className="btn" type="submit" disabled={pending || value !== 'DELETE'} style={{ borderColor: 'var(--danger)' }}>
        {pending ? 'Deleting' : 'Delete my account'}
      </button>
    </form>
  );
}
