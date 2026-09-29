'use client';
import { useEffect, useRef } from 'react';

/** Non-intrusive AdSense slot. Reserves space to avoid layout shift. Renders nothing without a configured client. */
export function AdSlot({ slot, minWidth = 0, className }: { slot: string; minWidth?: number; className?: string }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const ref = useRef<HTMLModElement>(null);
  useEffect(() => {
    if (!client || window.innerWidth < minWidth) return;
    try { ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle ||= []).push({}); } catch { /* blocked */ }
  }, [client, minWidth]);
  if (!client) return null;
  return (
    <aside aria-label="Advertisement" className={className}>
      <span className="eyebrow">Advertisement</span>
      <ins ref={ref} className="adsbygoogle" style={{ display: 'block', minHeight: 250 }} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}
