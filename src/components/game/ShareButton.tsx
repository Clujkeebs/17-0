'use client';
import { useEffect, useRef, useState } from 'react';
import { ShareIcon } from '../Icons';
import { track } from '@/lib/analytics';

/**
 * One Share button. It opens a sheet with every way to share. Messages get the link only: the link unfurls into
 * the score card on its own, so attaching the image as well sent a photo and a link.
 */
export function ShareButton({ text, url, imageUrl, fileName = 'unbeaten-result.png', label = 'Share' }: { text: string; url: string; imageUrl?: string; fileName?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [canNative, setCanNative] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  useEffect(() => { setCanNative(typeof navigator !== 'undefined' && !!navigator.share); }, []);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const full = () => new URL(url, location.origin).toString();
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };
  const log = (via: string) => track('game_shared', { path: url, via });
  const enc = (s: string) => encodeURIComponent(s);
  function close() { setOpen(false); opener.current?.focus(); }

  async function native() {
    log('native');
    try { await navigator.share({ url: full() }); close(); } catch { /* cancelled */ }
  }
  async function copy(what: 'link' | 'text') {
    log(`copy-${what}`);
    try { await navigator.clipboard.writeText(what === 'link' ? full() : `${text} ${full()}`); flash(what === 'link' ? 'Link copied' : 'Text copied'); }
    catch { flash('Copy blocked. Long-press the link instead.'); }
  }
  async function save() {
    log('save');
    if (!imageUrl) return;
    try {
      const b = await (await fetch(imageUrl)).blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = fileName; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      flash('Image saved');
    } catch { flash('Could not save the image.'); }
  }

  return (
    <>
      <button ref={opener} type="button" className="btn btn-primary" onClick={() => setOpen(true)} aria-haspopup="dialog"><ShareIcon size={16} /> {label}</button>
      <span className="sr-only" aria-live="polite">{msg}</span>
      {open && (
        <div className="sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="share-h">
            <div className="sheet-grip" aria-hidden="true" />
            <h2 id="share-h" className="sheet-h">Share</h2>
            <div className="share-list">
              {canNative && <button type="button" className="share-opt" onClick={native}>Share link<span>Your phone&apos;s share menu</span></button>}
              <button type="button" className="share-opt" onClick={() => copy('link')}>Copy link<span>Paste it anywhere</span></button>
              <a className="share-opt" onClick={() => log('sms')} href={`sms:?&body=${enc(typeof location !== 'undefined' ? full() : url)}`}>Text message<span>Sends the link</span></a>
              <a className="share-opt" onClick={() => log('x')} target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(typeof location !== 'undefined' ? full() : url)}`}>Post on X<span>Opens a new tab</span></a>
              <a className="share-opt" onClick={() => log('facebook')} target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${enc(typeof location !== 'undefined' ? full() : url)}`}>Facebook<span>Opens a new tab</span></a>
              {imageUrl && <button type="button" className="share-opt" onClick={save}>Save image<span>The score card as a picture</span></button>}
              <button type="button" className="share-opt" onClick={() => copy('text')}>Copy text<span>The line plus the link</span></button>
            </div>
            {msg && <p className="share-toast-in" role="status">{msg}</p>}
            <div className="sheet-actions"><button ref={closeRef} type="button" className="btn btn-lg" onClick={close}>Done</button></div>
          </div>
        </div>
      )}
    </>
  );
}
