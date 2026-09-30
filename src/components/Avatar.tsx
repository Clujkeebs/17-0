'use client';
import Image from 'next/image';
import { useState } from 'react';

/** Player/coach portrait with a deterministic monogram fallback on the team color (also used if the image fails). */
export function Avatar({ name, src, color = '#1B4332', size = 96 }: { name: string; src?: string | null; color?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) return <Image src={src} alt={`${name} headshot`} width={size} height={size} onError={() => setFailed(true)} style={{ background: color, objectFit: 'cover', borderRadius: 2 }} />;
  return <Monogram name={name} color={color} size={size} />;
}

export function Monogram({ name, color, size }: { name: string; color: string; size: number }) {
  const initials = name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" role="img" aria-label={`${name} monogram`}>
      <rect width="96" height="96" fill={color} />
      <path d="M0 96 L96 0" stroke="#0A1128" strokeOpacity=".35" strokeWidth="1" />
      <text x="48" y="58" textAnchor="middle" style={{ fontFamily: 'var(--font-num)' }} fontWeight="700" fontSize="32" fill="#F8F9FA">{initials}</text>
    </svg>
  );
}
