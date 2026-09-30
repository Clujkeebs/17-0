'use client';
import { TeamMark } from '@/components/game/Reel';

/** Small decorative team logo (monogram fallback) followed by the team label. */
export function TeamTag({ abbr, logoUrl, color, label, size = 16 }: { abbr: string; logoUrl?: string | null; color?: string | null; label?: string; size?: number }) {
  return (
    <span className="m-team">
      <TeamMark team={{ abbreviation: abbr, logoUrl: logoUrl ?? null, color: color ?? 'var(--muted, #667)', city: '', name: label ?? abbr }} size={size} alt="" />
      <span>{label ?? abbr}</span>
    </span>
  );
}
