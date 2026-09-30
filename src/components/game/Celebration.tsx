'use client';
import { useEffect, useState } from 'react';
import { swell } from './sound';

import type { Tier } from '@/lib/game/tiers';
export type { Tier };

const COLORS = ['#E11D2E', '#0A0A0A', '#F2C94C', '#1E6FD9', '#15803D'];

/** Banner plus a one-time confetti burst for top tiers. Pure CSS, skipped for reduced motion. */
export function Celebration({ tier }: { tier: Tier }) {
  const [burst, setBurst] = useState(false);
  useEffect(() => {
    if (!tier.confetti || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setBurst(true); swell();
    const t = setTimeout(() => setBurst(false), 4200);
    return () => clearTimeout(t);
  }, [tier.confetti]);
  return (
    <div className={`celebrate celebrate-${tier.key}`} role="status">
      <strong>{tier.title}</strong> <span>{tier.line}</span>
      {burst && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 90 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 37) % 100}%`, background: COLORS[i % COLORS.length], animationDelay: `${(i % 18) * 0.06}s`, animationDuration: `${2.4 + ((i * 7) % 10) / 6}s`, transform: `rotate(${(i * 47) % 360}deg)` }} />
          ))}
        </div>
      )}
    </div>
  );
}
