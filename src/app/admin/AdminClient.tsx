'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data: data as Record<string, unknown> & { error?: string } };
}

export function RunSyncButton() {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  async function run() {
    setState('running'); setMsg('');
    const r = await call('/api/admin/madden/sync', 'POST').catch(() => null);
    if (!r || !r.ok) { setState('error'); setMsg(r?.data.error ?? 'Sync request failed.'); return; }
    setState('done'); setMsg('Sync started. Refresh in a minute for the new snapshot.');
    router.refresh();
  }
  return (
    <div className="row">
      <button className="btn btn-primary" type="button" onClick={run} disabled={state === 'running'}>{state === 'running' ? 'Starting sync' : 'Run sync now'}</button>
      {msg && <span role={state === 'error' ? 'alert' : 'status'} className={state === 'error' ? 'danger' : 'accent'}>{msg}</span>}
    </div>
  );
}

/** Pure-ish validation shared by the editor: every leaf must be a number in 0..1. */
function validateWeights(value: unknown, depth: number): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return 'Expected a JSON object.';
  for (const [k, v] of Object.entries(value)) {
    if (depth > 1) {
      const inner = validateWeights(v, depth - 1);
      if (inner) return `${k}: ${inner}`;
    } else if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) {
      return `${k} must be a number from 0 to 1.`;
    }
  }
  return null;
}

export function ConfigEditor({ gameType, configKey, label, initial, depth }: { gameType: string; configKey: string; label: string; initial: unknown; depth: 1 | 2 }) {
  const router = useRouter();
  const [text, setText] = useState(JSON.stringify(initial, null, 2));
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState(false);
  const id = `cfg-${gameType}-${configKey}`.replace(/[^a-z0-9-]/gi, '-');

  function parse(): unknown {
    let v: unknown;
    try { v = JSON.parse(text); } catch (e) { setError(`Invalid JSON: ${(e as Error).message}`); return undefined; }
    const bad = validateWeights(v, depth);
    if (bad) { setError(bad); return undefined; }
    setError('');
    return v;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const value = parse();
    if (value === undefined) return;
    setPending(true);
    const r = await call('/api/admin/config', 'PATCH', { gameType, configKey, value }).catch(() => null);
    setPending(false);
    if (!r || !r.ok) { setError(r?.data.error ?? 'Save failed.'); return; }
    setMsg(`Saved as version ${String(r.data.version)}.`);
    router.refresh();
  }

  return (
    <form onSubmit={save} noValidate>
      <label htmlFor={id}>{label}</label>
      <textarea id={id} value={text} onChange={(e) => { setText(e.target.value); setError(''); }} onBlur={() => parse()} rows={depth === 2 ? 24 : 10} spellCheck={false}
        className="num" style={{ fontSize: '.85rem' }} aria-invalid={!!error} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`} />
      <p id={`${id}-hint`} className="hint">Every weight is a number from 0 to 1. Saving creates a new version; old versions stay in history.</p>
      {error && <p id={`${id}-error`} role="alert" className="field-error">{error}</p>}
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={pending || !!error}>{pending ? 'Saving' : 'Save new version'}</button>
        {msg && <span role="status" className="accent">{msg}</span>}
      </div>
    </form>
  );
}

export function RateOverrideForm() {
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>, method: 'POST' | 'DELETE') {
    e.preventDefault();
    const form = (e.currentTarget.closest('form') ?? e.currentTarget) as HTMLFormElement;
    const fd = new FormData(form);
    const body = { kind: String(fd.get('kind')), value: String(fd.get('value') ?? '').trim(), hours: Number(fd.get('hours')) };
    if (!body.value) { setError('Enter an IP address or user id.'); return; }
    setPending(true); setError(''); setMsg('');
    const r = await call('/api/admin/rate-limit', method, body).catch(() => null);
    setPending(false);
    if (!r || !r.ok) { setError(r?.data.error ?? 'Request failed.'); return; }
    setMsg(method === 'POST' ? `Override set for ${body.hours}h (key ${String(r.data.id)}).` : `Override cleared (key ${String(r.data.id)}).`);
  }

  return (
    <form onSubmit={(e) => submit(e, 'POST')} noValidate>
      <div className="field">
        <label htmlFor="ro-kind">Identifier type</label>
        <select id="ro-kind" name="kind" defaultValue="ip">
          <option value="ip">IP address (hashed before storing)</option>
          <option value="user">User id</option>
          <option value="raw">Raw limiter id (already hashed)</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="ro-value">Value</label>
        <input id="ro-value" name="value" type="text" required autoComplete="off" spellCheck={false} />
      </div>
      <div className="field">
        <label htmlFor="ro-hours">Hours</label>
        <input id="ro-hours" name="hours" type="number" min={1} max={720} defaultValue={24} required
          style={{ width: 120, minHeight: 44, background: 'var(--navy)', color: 'var(--bone)', border: '1px solid var(--steel)', padding: '10px 12px' }} />
      </div>
      {error && <p role="alert" className="field-error">{error}</p>}
      <div className="row">
        <button className="btn btn-primary" type="submit" disabled={pending}>Set override</button>
        <button className="btn" type="button" disabled={pending}
          onClick={(e) => submit(e as unknown as React.FormEvent<HTMLFormElement>, 'DELETE')}>Clear override</button>
        {msg && <span role="status" className="accent">{msg}</span>}
      </div>
    </form>
  );
}

export function ResultActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function act(action: 'unflag' | 'delete') {
    if (action === 'delete' && !window.confirm('Delete this result permanently?')) return;
    setPending(true); setError('');
    const r = await call('/api/admin/results', 'POST', { id, action }).catch(() => null);
    setPending(false);
    if (!r || !r.ok) { setError(r?.data.error ?? 'Failed.'); return; }
    router.refresh();
  }
  return (
    <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
      <button className="btn btn-sm" type="button" disabled={pending} onClick={() => act('unflag')}>Unflag</button>
      <button className="btn btn-sm" type="button" disabled={pending} onClick={() => act('delete')} style={{ borderColor: 'var(--danger)' }}>Delete</button>
      {error && <span role="alert" className="field-error">{error}</span>}
    </div>
  );
}
