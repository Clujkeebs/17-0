'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Note = { id: string; body: string; page: string | null; createdAt: string; reply: { status: 'done' | 'working' | 'needs-you'; reply: string } | null };
const STATUS = { done: 'Done', working: 'Working on it', 'needs-you': 'Needs you' } as const;
const COMMANDS = [
  { cmd: 'sync', label: 'Sync ratings', hint: 'Madden ratings, rosters, coaches' },
  { cmd: 'fantasy', label: 'Refresh fantasy', hint: 'Sleeper points and the win line' },
  { cmd: 'nba', label: 'Refresh NBA', hint: 'ESPN history and 82-0 win line' },
  { cmd: 'legends', label: 'Rebuild legends', hint: 'All-time legends and win lines' },
  { cmd: 'cache', label: 'Clear caches', hint: 'Leaderboards show changes now' },
] as const;

export function OwnerInbox({ notes }: { notes: Note[] }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [page, setPage] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy('send'); setErr(''); setMsg('');
    try {
      const r = await fetch('/api/owner/notes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body, page }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? 'That did not send.');
      setBody(''); setPage(''); setMsg('Sent. It gets read within the hour.'); router.refresh();
    } catch (e2) { setErr((e2 as Error).message); } finally { setBusy(''); }
  }
  async function run(cmd: string) {
    setBusy(cmd); setErr(''); setMsg('');
    try {
      const r = await fetch('/api/owner/command', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cmd }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? 'That did not run.');
      setMsg(d.message);
    } catch (e2) { setErr((e2 as Error).message); } finally { setBusy(''); }
  }

  return (
    <>
      <form onSubmit={send} className="card" style={{ marginTop: 24 }}>
        <label htmlFor="on-body">What should change?</label>
        <textarea id="on-body" rows={5} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="A bug, a wrong team, an idea" required />
        <label htmlFor="on-page" style={{ marginTop: 12 }}>Page <span className="muted">(optional)</span></label>
        <input id="on-page" type="text" maxLength={300} value={page} onChange={(e) => setPage(e.target.value)} placeholder="/games/17-0" />
        <div className="row" style={{ marginTop: 12 }}><button className="btn btn-primary" type="submit" disabled={!!busy || !body.trim()}>{busy === 'send' ? 'Sending' : 'Send note'}</button></div>
      </form>

      <h2 style={{ marginTop: 40 }}>Commands</h2>
      <div className="owner-cmds">
        {COMMANDS.map((c) => (
          <button key={c.cmd} type="button" className="share-opt" onClick={() => run(c.cmd)} disabled={!!busy}>
            {busy === c.cmd ? 'Running' : c.label}<span>{c.hint}</span>
          </button>
        ))}
      </div>
      {msg && <p role="status" className="accent">{msg}</p>}
      {err && <p role="alert" className="field-error">{err}</p>}

      <h2 style={{ marginTop: 40 }}>Your notes</h2>
      {notes.length === 0 ? <p className="muted">No notes yet.</p> : (
        <ol className="owner-notes">
          {notes.map((n) => (
            <li key={n.id} className="card">
              <p className="hint" style={{ margin: 0 }}>{new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}{n.page ? ` · ${n.page}` : ''} · <span className="mono">#{n.id.slice(0, 8)}</span></p>
              <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{n.body}</p>
              <p className={`owner-reply ${n.reply ? n.reply.status : 'waiting'}`}><strong>{n.reply ? STATUS[n.reply.status] : 'Waiting'}</strong>{n.reply ? ` · ${n.reply.reply}` : ' · Read within the hour.'}</p>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
