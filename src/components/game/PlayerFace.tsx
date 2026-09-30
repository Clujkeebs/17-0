'use client';
import { useState } from 'react';

/** Round headshot with an initials fallback on the team color. Plain <img>: browser loads straight from the CDN. */
export function PlayerFace({ name, src, color, size = 44 }: { name: string; src?: string | null; color: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span className="face" style={{ width: size, height: size, ['--tc' as string]: color }}>
      {src && !failed
        ? <img src={src} alt="" width={size} height={size} loading="lazy" onError={() => setFailed(true)} />
        : <span className="face-i" style={{ fontSize: size * 0.34 }}>{initials}</span>}
    </span>
  );
}
