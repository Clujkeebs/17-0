/**
 * Leaderboard flair: small custom marks shown before a name. Decorative; the title carries any meaning.
 * Each mark is a few layered shapes on a 24 grid: a base color, a darker edge and a light highlight,
 * so they read as little enamel pins rather than flat icons.
 */
type Shape = { d: string; fill: string; stroke?: string; sw?: number; even?: boolean };

const MARKS: Record<string, Shape[]> = {
  'flair-star': [
    { d: 'M12 2.2l2.95 6.1 6.7.85-4.95 4.6 1.3 6.65L12 17.1l-6 3.3 1.3-6.65-4.95-4.6 6.7-.85z', fill: '#D4A017', stroke: '#8A6400', sw: 1 },
    { d: 'M12 5.4l1.9 3.9-1.9 1.2-1.9-1.2z', fill: '#FDE68A' },
  ],
  'flair-flame': [
    { d: 'M12.5 1.8c.6 3.6-1.8 5.2-2.9 7.3-.6-1.2-.7-2.3-.4-3.5C6.6 7.8 5 10.7 5 14a7 7 0 0 0 14 0c0-3.9-2.7-6.7-4.4-8.4.1 1.7-.3 3-1.2 3.9.5-3.3-.3-5.8-.9-7.7z', fill: '#DC2626', stroke: '#991B1B', sw: .8 },
    { d: 'M12 11c-.3 1.9-2.6 2.6-2.6 5a2.6 2.6 0 0 0 5.2 0c0-1.9-1.4-3.1-2.6-5z', fill: '#FBBF24' },
  ],
  'flair-bolt': [
    { d: 'M13.5 1.8 4.3 13.6h6.1l-1 8.6 9.3-11.8h-6.2z', fill: '#2563EB', stroke: '#1E3A8A', sw: .9 },
    { d: 'M12.6 4.6 7.6 11.6h2.2z', fill: '#BFDBFE' },
  ],
  'flair-crown': [
    { d: 'M3 7.5l4.5 4 4.5-7 4.5 7 4.5-4-2 11.5H5z', fill: '#D4A017', stroke: '#8A6400', sw: .9 },
    { d: 'M5.4 16.2h13.2l-.3 1.6H5.7z', fill: '#8A6400' },
    { d: 'M12 9.6a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z', fill: '#B91C1C' },
  ],
  'flair-diamond': [
    { d: 'M6.5 3h11L22 9l-10 12L2 9z', fill: '#22D3EE', stroke: '#0E7490', sw: .9 },
    { d: 'M2 9h20L12 21z', fill: '#0891B2' },
    { d: 'M8 3.6h4L9 8.4H3.6z', fill: '#CFFAFE' },
  ],
  'flair-owner': [
    { d: 'M12 1.8 3.3 5.4v6.1c0 5.2 3.7 9.5 8.7 10.7 5-1.2 8.7-5.5 8.7-10.7V5.4z', fill: '#B91C1C', stroke: '#7F1D1D', sw: .9 },
    { d: 'M12 6.2l1.7 3.6 3.9.4-2.9 2.7.8 3.9L12 14.9l-3.5 1.9.8-3.9-2.9-2.7 3.9-.4z', fill: '#FDE68A' },
  ],
  'flair-football': [
    { d: 'M4.2 19.8C2.6 14.5 4.6 8.4 9.4 5.2c3.4-2.2 7.2-2.6 10.4-1 1.6 5.3-.4 11.4-5.2 14.6-3.4 2.2-7.2 2.6-10.4 1z', fill: '#8B4513', stroke: '#5C2E0B', sw: .9 },
    { d: 'M5.8 16.6l1.6 1.6M16.6 5.8l1.6 1.6', fill: 'none', stroke: '#F5F5F4', sw: 1.2 },
    { d: 'M9 15l6-6M10.2 11.6l2.2 2.2M11.8 10l2.2 2.2M8.6 13.2l2.2 2.2', fill: 'none', stroke: '#F5F5F4', sw: 1.1 },
  ],
  'flair-basketball': [
    { d: 'M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19z', fill: '#EA580C', stroke: '#7C2D12', sw: .9 },
    { d: 'M2.5 12h19M12 2.5v19M5.3 5.3c2.8 2.6 2.8 10.8 0 13.4M18.7 5.3c-2.8 2.6-2.8 10.8 0 13.4', fill: 'none', stroke: '#431407', sw: .9 },
  ],
  'flair-baseball': [
    { d: 'M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19z', fill: '#FAFAF9', stroke: '#78716C', sw: .9 },
    { d: 'M6.2 4.6c2.4 2.2 3.2 4.8 3.2 7.4s-.8 5.2-3.2 7.4M17.8 4.6c-2.4 2.2-3.2 4.8-3.2 7.4s.8 5.2 3.2 7.4', fill: 'none', stroke: '#DC2626', sw: 1.1 },
    { d: 'M7.6 7.4l1.6-.6M8.6 10.2l1.6-.3M8.6 13.8l1.6.3M7.6 16.6l1.6.6M16.4 7.4l-1.6-.6M15.4 10.2l-1.6-.3M15.4 13.8l-1.6.3M16.4 16.6l-1.6.6', fill: 'none', stroke: '#DC2626', sw: .8 },
  ],
  'flair-whistle': [
    { d: 'M3 10.5a5.5 5.5 0 0 1 5.5-5.5H21v4.5h-6.3a5.5 5.5 0 1 1-11.7 1z', fill: '#A1A1AA', stroke: '#3F3F46', sw: .9 },
    { d: 'M8.5 8.2a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6z', fill: '#27272A' },
    { d: 'M12 6.1h8v1.2h-8z', fill: '#E4E4E7' },
  ],
  'flair-snow': [
    { d: 'M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7', fill: 'none', stroke: '#0284C7', sw: 2 },
    { d: 'M9.5 3.8 12 6l2.5-2.2M9.5 20.2 12 18l2.5 2.2M4.2 10l3.2-1 .7-3.2M19.8 14l-3.2 1-.7 3.2M4.2 14l3.2 1 .7 3.2M19.8 10l-3.2-1-.7-3.2', fill: 'none', stroke: '#38BDF8', sw: 1.3 },
  ],
  'flair-mic': [
    { d: 'M12 2.2a4 4 0 0 1 4 4v5.6a4 4 0 0 1-8 0V6.2a4 4 0 0 1 4-4z', fill: '#3F3F46', stroke: '#18181B', sw: .9 },
    { d: 'M9.4 5.2h5.2M9.2 7.4h5.6M9.2 9.6h5.6', fill: 'none', stroke: '#A1A1AA', sw: .8 },
    { d: 'M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.8M8.5 21.8h7', fill: 'none', stroke: '#18181B', sw: 1.6 },
  ],
  'flair-trophy': [
    { d: 'M6.5 3h11v5.5a5.5 5.5 0 0 1-11 0z', fill: '#D4A017', stroke: '#8A6400', sw: .9 },
    { d: 'M6.5 4.5H3.5v1.8a3.6 3.6 0 0 0 3.4 3.6M17.5 4.5h3v1.8a3.6 3.6 0 0 1-3.4 3.6', fill: 'none', stroke: '#8A6400', sw: 1.3 },
    { d: 'M10.6 13.6h2.8v3.4h-2.8zM7.5 17h9v4h-9z', fill: '#8A6400' },
    { d: 'M8.4 4.6h1.6v4.4H8.4z', fill: '#FDE68A' },
  ],
  'flair-ring': [
    { d: 'M12 8.2a6.9 6.9 0 1 1 0 13.8 6.9 6.9 0 0 1 0-13.8zm0 2.6a4.3 4.3 0 1 0 0 8.6 4.3 4.3 0 0 0 0-8.6z', fill: '#D4A017', stroke: '#8A6400', sw: .9, even: true },
    { d: 'M8.4 2.4h7.2l2 3.4-5.6 4.6-5.6-4.6z', fill: '#38BDF8', stroke: '#0369A1', sw: .8 },
    { d: 'M9.4 3.2h2.4l-1.6 2.4H7.9z', fill: '#E0F2FE' },
  ],
  'flair-owner-key': [
    { d: 'M7.5 3a5.5 5.5 0 0 1 5.2 7.3L22 19.6V22h-3.6v-2h-2v-2h-2l-2.7-2.7A5.5 5.5 0 1 1 7.5 3zm-1 3a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z', fill: '#D4A017', stroke: '#8A6400', sw: .9, even: true },
    { d: 'M14 13.4l6.6 6.6', fill: 'none', stroke: '#B91C1C', sw: 1.2 },
  ],
};

export const FLAIR_KEYS = Object.keys(MARKS);

export function Flair({ k }: { k?: string | null }) {
  const shapes = k ? MARKS[k] : null;
  if (!shapes) return null;
  return (
    <span className={`nm-flair ${k}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        {shapes.map((s, i) => <path key={i} d={s.d} fill={s.fill} stroke={s.stroke} strokeWidth={s.sw} fillRule={s.even ? 'evenodd' : undefined} />)}
      </svg>
    </span>
  );
}
