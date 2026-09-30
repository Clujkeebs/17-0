'use client';
import { useState } from 'react';

/**
 * Player/coach portrait with a deterministic monogram fallback (also used if the image fails).
 * Plain <img> so any CDN host works (ESPN, R2, custom domains) without next/image config.
 * Pass `decorative` when the name is already printed next to it.
 */
export function Avatar({ name, src, color = '#0A0A0A', size = 96, decorative = false }: { name: string; src?: string | null; color?: string; size?: number; decorative?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={decorative ? '' : `${name} headshot`} width={size} height={size} loading={size > 120 ? 'eager' : 'lazy'} decoding="async"
        onError={() => setFailed(true)}
        style={{ width: size, height: size, flex: 'none', background: '#F5F4F0', objectFit: 'cover', objectPosition: 'top', borderRadius: Math.round(size * 0.12) }} />
    );
  }
  return <Monogram name={name} color={color} size={size} decorative={decorative} />;
}

/** Light, editorial monogram: warm paper tile, large initials, a thin team-color rule. */
export function Monogram({ name, color, size, decorative = false }: { name: string; color: string; size: number; decorative?: boolean }) {
  const initials = name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" role={decorative ? undefined : 'img'} aria-hidden={decorative ? true : undefined} aria-label={decorative ? undefined : `${name} monogram`} style={{ flex: 'none', borderRadius: Math.round(size * 0.12) }}>
      <rect width="96" height="96" fill="#F5F4F0" />
      <text x="48" y="59" textAnchor="middle" style={{ fontFamily: 'var(--font-ui)', letterSpacing: '-1.5px' }} fontWeight="600" fontSize="30" fill="#0A0A0A">{initials}</text>
      <rect x="40" y="72" width="16" height="2" rx="1" fill={color} />
    </svg>
  );
}
