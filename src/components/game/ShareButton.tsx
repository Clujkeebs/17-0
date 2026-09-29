'use client';
import { useState } from 'react';
import { ShareIcon } from '../Icons';
import { track } from '@/lib/analytics';

export function ShareButton({ text, url }: { text: string; url: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const full = new URL(url, location.origin).toString();
    track('game_shared', { path: url });
    try {
      if (navigator.share) { await navigator.share({ text, url: full }); return; }
      await navigator.clipboard.writeText(`${text} ${full}`);
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    } catch { /* user cancelled */ }
  }
  return (
    <button type="button" className="btn" onClick={share}>
      <ShareIcon size={16} /> {copied ? 'Link copied' : 'Share'}
      <span className="sr-only" aria-live="polite">{copied ? 'Link copied to clipboard' : ''}</span>
    </button>
  );
}
