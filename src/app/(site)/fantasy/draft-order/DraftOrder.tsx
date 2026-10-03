'use client';
import { useState } from 'react';

/** Paste names, shuffle with the browser's secure random numbers, copy the order. */
export function DraftOrder() {
  const [text, setText] = useState('');
  const [order, setOrder] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const names = text.split(/\n|,/).map((s) => s.trim()).filter(Boolean).slice(0, 32);
  function shuffle() {
    const a = [...names];
    for (let i = a.length - 1; i > 0; i--) {
      const r = new Uint32Array(1); crypto.getRandomValues(r);
      const j = r[0] % (i + 1); [a[i], a[j]] = [a[j], a[i]];
    }
    setOrder(a); setMsg('');
  }
  async function copy() {
    try { await navigator.clipboard.writeText(order.map((n, i) => `${i + 1}. ${n}`).join('\n')); setMsg('Copied'); } catch { setMsg('Copy blocked. Select the list and copy it.'); }
  }
  return (
    <div className="card" style={{ marginTop: 20 }}>
      <label htmlFor="do-names">Team names, one per line or separated by commas</label>
      <textarea id="do-names" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Sam\nJordan\nRiley'} />
      <div className="row" style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-primary" onClick={shuffle} disabled={names.length < 2}>Randomize {names.length >= 2 ? `${names.length} teams` : ''}</button>
        {order.length > 0 && <button type="button" className="btn" onClick={copy}>Copy order</button>}
      </div>
      {msg && <p role="status" className="accent">{msg}</p>}
      {order.length > 0 && <ol className="do-order" aria-live="polite">{order.map((n, i) => <li key={`${n}-${i}`}><span className="num">{i + 1}</span>{n}</li>)}</ol>}
    </div>
  );
}
