'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { ADSENSE_CLIENT, ADSENSE_SIDE_SLOT, SIDE_AD_MIN_WIDTH } from '@/lib/ads';

const query = `(min-width: ${SIDE_AD_MIN_WIDTH}px)`;
const subscribe = (cb: () => void) => { const m = window.matchMedia(query); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); };
const isWide = () => window.matchMedia(query).matches;

/**
 * One small, fixed-size ad (160x600) in a side rail. Never inline with content, never on narrow screens,
 * and nothing at all until an ad unit ID is configured.
 */
export function SideAd() {
  const wide = useSyncExternalStore(subscribe, isWide, () => false);
  const show = wide && !!ADSENSE_SIDE_SLOT;
  useEffect(() => {
    if (!show) return;
    try { ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle ||= []).push({}); } catch { /* blocked */ }
  }, [show]);
  if (!show) return null;
  return (
    <aside aria-label="Advertisement" className="side-ad">
      <span className="eyebrow">Advertisement</span>
      <ins className="adsbygoogle" style={{ display: 'inline-block', width: 160, height: 600 }} data-ad-client={ADSENSE_CLIENT} data-ad-slot={ADSENSE_SIDE_SLOT} />
    </aside>
  );
}
