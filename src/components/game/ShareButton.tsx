'use client';
import { useState } from 'react';
import { ShareIcon } from '../Icons';
import { track } from '@/lib/analytics';

/**
 * Share sheet for any result: native share (with the score card attached when the device allows),
 * copy link, copy text, text message, X, Facebook, and save the image.
 */
export function ShareButton({ text, url, imageUrl, fileName = 'unbeaten-result.png' }: { text: string; url: string; imageUrl?: string; fileName?: string }) {
  const [msg, setMsg] = useState('');
  const full = () => new URL(url, location.origin).toString();
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };
  const log = (via: string) => track('game_shared', { path: url, via });

  async function imageFile(): Promise<File | null> {
    if (!imageUrl) return null;
    try { const b = await (await fetch(imageUrl)).blob(); return new File([b], fileName, { type: b.type || 'image/png' }); } catch { return null; }
  }

  async function native() {
    log('native');
    const data: ShareData = { title: 'Unbeaten', text, url: full() };
    try {
      const file = await imageFile();
      if (file && navigator.canShare?.({ files: [file] })) { await navigator.share({ ...data, files: [file] }); return; }
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(`${text} ${full()}`); flash('Copied. Paste it anywhere.');
    } catch { /* cancelled */ }
  }
  async function copy(what: 'link' | 'text') {
    log(`copy-${what}`);
    try { await navigator.clipboard.writeText(what === 'link' ? full() : `${text} ${full()}`); flash(what === 'link' ? 'Link copied' : 'Text copied'); }
    catch { flash('Copy blocked. Long-press the link instead.'); }
  }
  async function save() {
    log('save');
    const file = await imageFile();
    if (!file) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file); a.download = fileName; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    flash('Image saved');
  }
  const enc = (s: string) => encodeURIComponent(s);

  return (
    <div className="share" role="group" aria-label="Share your result">
      <button type="button" className="btn btn-primary" onClick={native}><ShareIcon size={16} /> Share</button>
      <button type="button" className="btn" onClick={() => copy('link')}>Copy link</button>
      <button type="button" className="btn" onClick={() => copy('text')}>Copy text</button>
      <a className="btn" onClick={() => log('sms')} href={`sms:?&body=${enc(`${text} ${typeof location !== 'undefined' ? full() : url}`)}`}>Text</a>
      <a className="btn" onClick={() => log('x')} target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(typeof location !== 'undefined' ? full() : url)}`}>Post on X</a>
      <a className="btn" onClick={() => log('facebook')} target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${enc(typeof location !== 'undefined' ? full() : url)}`}>Facebook</a>
      {imageUrl && <button type="button" className="btn" onClick={save}>Save image</button>}
      <span className="sr-only" aria-live="polite">{msg}</span>
      {msg && <span className="share-toast" aria-hidden="true">{msg}</span>}
    </div>
  );
}
