'use client';
import { readableOn } from '@/lib/color';
import { useState } from 'react';

/** Team logo with a team-color monogram fallback. Decorative (alt="") unless `alt` is given. */
export function TeamLogo({ abbr, src, color, size = 20, alt = '' }: { abbr: string; src?: string | null; color?: string | null; size?: number; alt?: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
     
    return <img src={src} alt={alt} width={size} height={size} loading="lazy" decoding="async" onError={() => setFailed(true)} style={{ width: size, height: size, flex: 'none', objectFit: 'contain', verticalAlign: 'middle' }} />;
  }
  return (
    <span role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}
      style={{ width: size, height: size, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: color ?? '#0A0A0A', color: readableOn(color ?? '#0A0A0A'), fontWeight: 700, fontSize: Math.max(7, size * 0.32), lineHeight: 1, verticalAlign: 'middle', overflow: 'hidden' }}>
      {abbr}
    </span>
  );
}
