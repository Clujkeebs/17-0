'use client';
import Image from 'next/image';
import { useState } from 'react';

/** Player/coach portrait with a deterministic monogram fallback (also used if the image fails). */
export function Avatar({ name, src, color = '#0A0A0A', size = 96 }: { name: string; src?: string | null; color?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) return <Image src={src} alt={`${name} headshot`} width={size} height={size} onError={() => setFailed(true)} style={{ background: '#F5F4F0', objectFit: 'cover', borderRadius: Math.round(size * 0.12) }} />;
  return <Monogram name={name} color={color} size={size} />;
}

/** Light, editorial monogram: warm paper tile, large initials, a thin team-color rule. */
export function Monogram({ name, color, size }: { name: string; color: string; size: number }) {
  const initials = name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" role="img" aria-label={`${name} monogram`} style={{ borderRadius: Math.round(size * 0.12) }}>
      <rect width="96" height="96" fill="#F5F4F0" />
      <text x="48" y="59" textAnchor="middle" style={{ fontFamily: 'var(--font-ui)', letterSpacing: '-1.5px' }} fontWeight="600" fontSize="30" fill="#0A0A0A">{initials}</text>
      <rect x="40" y="72" width="16" height="2" rx="1" fill={color} />
    </svg>
  );
}
