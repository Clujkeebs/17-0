/**
 * Leaderboard flair: small custom marks shown before a name. Decorative; the title carries any meaning.
 * Each mark is a few layered shapes on a 24 grid: a base color, a darker edge and a light highlight,
 * so they read as little enamel pins rather than flat icons.
 */
type Shape = { d: string; fill: string; stroke?: string; sw?: number; even?: boolean; t?: string; dash?: string };

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
  'flair-rocket': [
    { d: 'M14.5 2.5c3.6.4 6.6 3.4 7 7l-7.6 7.6-6.9-6.9z', fill: '#E5E7EB', stroke: '#6B7280', sw: .8 },
    { d: 'M14.5 2.5c1.8.2 3.5 1 4.8 2.3L21.5 9.5c-.2-1.8-1-3.5-2.3-4.8a7.8 7.8 0 0 0-4.7-2.2z', fill: '#DC2626' },
    { d: 'M15.4 8.6a1.7 1.7 0 1 1 0 .01z', fill: '#38BDF8', stroke: '#0369A1', sw: .8 },
    { d: 'M7 10.2 3.4 11l3 3M13.8 17 13 20.6l-3-3', fill: '#DC2626', stroke: '#991B1B', sw: .8 },
    { d: 'M7.4 16.6c-1.6.2-3 1.6-3.4 4.4 2.8-.4 4.2-1.8 4.4-3.4z', fill: '#F97316', stroke: '#C2410C', sw: .6 },
  ],
  'flair-target': [
    { d: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20z', fill: '#DC2626', stroke: '#991B1B', sw: .8 },
    { d: 'M12 5.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z', fill: '#FAFAF9' },
    { d: 'M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z', fill: '#DC2626' },
    { d: 'M12 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2z', fill: '#FAFAF9' },
  ],
  'flair-goat': [
    { d: 'M6.5 4.5C4.6 3 3 3.4 2.4 4.6c1.4.1 2.6.8 3.2 2M17.5 4.5C19.4 3 21 3.4 21.6 4.6c-1.4.1-2.6.8-3.2 2', fill: 'none', stroke: '#78716C', sw: 1.4 },
    { d: 'M7 7.5c0-2 2.2-3.2 5-3.2s5 1.2 5 3.2v4.6c0 3.2-2.2 6.2-5 7.4-2.8-1.2-5-4.2-5-7.4z', fill: '#F5F5F4', stroke: '#78716C', sw: .9 },
    { d: 'M10.4 18.6 12 22.5l1.6-3.9', fill: '#E7E5E4', stroke: '#78716C', sw: .8 },
    { d: 'M9.6 10.2h.01M14.4 10.2h.01', fill: 'none', stroke: '#1C1917', sw: 1.8 },
    { d: 'M5 12.5l6.2-4.2 1.6 1 6.2-4.2', fill: 'none', stroke: '#D4A017', sw: 1.3 },
  ],
  'flair-bee': [
    { d: 'M9 6.5a3.4 2.6 0 1 1 0 .01zM15 6.5a3.4 2.6 0 1 1 0 .01z', fill: '#DBEAFE', stroke: '#93C5FD', sw: .6 },
    { d: 'M12 8a7 5 0 1 1 0 10 7 5 0 0 1 0-10z', fill: '#FACC15', stroke: '#1C1917', sw: .9 },
    { d: 'M9.4 8.6v8.8M12.4 8v10M15.4 8.6v8.8', fill: 'none', stroke: '#1C1917', sw: 1.5 },
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
    { d: 'M12 2.2a4 4 0 0 1 4 4v5.6a4 4 0 0 1-8 0V6.2a4 4 0 0 1 4-4z', fill: '#71717A', stroke: '#27272A', sw: .9 },
    { d: 'M9.4 5.2h5.2M9.2 7.4h5.6M9.2 9.6h5.6', fill: 'none', stroke: '#E4E4E7', sw: .8 },
    { d: 'M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.8M8.5 21.8h7', fill: 'none', stroke: '#52525B', sw: 1.6 },
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
  'flair-helmet': [
    { d: 'M3.4 13.6C3.4 7.8 7.5 4 12.6 4c4.2 0 7.3 2.6 8 6.4l.3 3.6h-4.2l-.7 2.4H12.3v3.4H7.9L6.4 17.9C4.6 16.9 3.4 15.5 3.4 13.6z', fill: '#1D4ED8', stroke: '#1E3A8A', sw: .9 },
    { d: 'M6.6 8.4C8.6 5.9 12 5.2 15.4 6.2', fill: 'none', stroke: '#F8FAFC', sw: 1.7 },
    { d: 'M9 6.4c1.2-.6 2.6-.9 4-.8', fill: 'none', stroke: '#93C5FD', sw: .9 },
    { d: 'M10.2 11.9a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6z', fill: '#1E3A8A' },
    { d: 'M17 11.2h4.2M17 14.2h4.2M17.2 11v7.4', fill: 'none', stroke: '#D4D4D8', sw: 1.2 },
  ],
  'flair-glove': [
    { d: 'M4.4 14.2c-.1-4.2 2.1-9.6 5-10.6 1.2-.4 2 .3 2.2 1.4.6-1.3 1.9-1.6 2.7-.8.4.4.5 1 .4 1.6 1-.7 2.1-.3 2.4.7.2.7 0 1.4-.4 2 1.3-.4 2.2.5 2.2 1.6 0 3.9-1.8 8.2-5.1 10.2-3.2 1.9-7.6 1.1-9.1-1.4-.7-1.1-.9-2.4-.6-4.7z', fill: '#B45309', stroke: '#78350F', sw: .9 },
    { d: 'M8 11.4c1.7 1.2 3.7 1.4 5.8.8', fill: 'none', stroke: '#78350F', sw: 1.1 },
    { d: 'M9 17.2c2 .9 4.1.7 5.8-.4', fill: 'none', stroke: '#FDE68A', sw: .9, dash: '1.2 1.2' },
    { d: 'M8.4 6.6c.4-1 1-1.6 1.6-1.9', fill: 'none', stroke: '#F59E0B', sw: 1.2 },
  ],
  'flair-soccer': [
    { d: 'M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19z', fill: '#FAFAF9', stroke: '#3F3F46', sw: .9 },
    { d: 'M12 8l3.3 2.4-1.3 3.9h-4l-1.3-3.9z', fill: '#1C1917' },
    { d: 'M12 8V3M15.3 10.4l4.7-1.6M14 14.3l2.9 4M10 14.3l-2.9 4M8.7 10.4L4 8.8', fill: 'none', stroke: '#1C1917', sw: 1 },
  ],
  'flair-hockey': [
    { d: 'M4.2 3.4l10.8 13.9', fill: 'none', stroke: '#92400E', sw: 2.2 },
    { d: 'M14.6 17.4h6', fill: 'none', stroke: '#92400E', sw: 2.8 },
    { d: 'M16.4 17.4h3.6', fill: 'none', stroke: '#E5E7EB', sw: 1.4 },
    { d: 'M13 7.6v-2.1a3.9 1.7 0 0 1 7.8 0v2.1a3.9 1.7 0 0 1-7.8 0z', fill: '#27272A', stroke: '#09090B', sw: .8 },
    { d: 'M16.9 3.8a3.9 1.7 0 1 1 0 3.4 3.9 1.7 0 0 1 0-3.4z', fill: '#52525B' },
  ],
  'flair-jersey': [
    { d: 'M8.5 3.2L3 6l1.8 4.3 2.3-.9v11.1h9.8V9.4l2.3.9L21 6l-5.5-2.8c-.5 1.4-1.9 2.3-3.5 2.3s-3-.9-3.5-2.3z', fill: '#DC2626', stroke: '#7F1D1D', sw: .9 },
    { d: 'M8.5 3.2c.5 1.4 1.9 2.3 3.5 2.3s3-.9 3.5-2.3', fill: 'none', stroke: '#7F1D1D', sw: 1 },
    { d: 'M10.6 11.4l1.8-1v7.6', fill: 'none', stroke: '#FAFAF9', sw: 1.9 },
    { d: 'M4.3 8.6l2.8-1.1M19.7 8.6l-2.8-1.1', fill: 'none', stroke: '#FAFAF9', sw: 1.2 },
  ],
  'flair-megaphone': [
    { d: 'M3.6 9.2h3.8l8.8-5v15.6l-8.8-5H3.6z', fill: '#F59E0B', stroke: '#B45309', sw: .9 },
    { d: 'M7.6 14.8l1.2 5.2h2.7l-1.1-4.6z', fill: '#78350F' },
    { d: 'M5.2 10.6h2.2v3H5.2z', fill: '#FDE68A' },
    { d: 'M18.7 8.4c1.5 1.1 2.3 2.6 2.3 4.4s-.8 3.3-2.3 4.4', fill: 'none', stroke: '#B45309', sw: 1.5 },
    { d: 'M19.2 10.9c.6.5.9 1.1.9 1.9s-.3 1.4-.9 1.9', fill: 'none', stroke: '#F59E0B', sw: 1.2 },
  ],
  'flair-medal': [
    { d: 'M6.6 2.4h3.6l1.8 6.4L13.8 2.4h3.6l-3.9 9.6h-3z', fill: '#DC2626', stroke: '#991B1B', sw: .7 },
    { d: 'M10.2 2.4h3.6L12 8.8z', fill: '#1D4ED8' },
    { d: 'M12 10.3a6.1 6.1 0 1 1 0 12.2 6.1 6.1 0 0 1 0-12.2z', fill: '#D4A017', stroke: '#8A6400', sw: .9 },
    { d: 'M12 12.6a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6z', fill: 'none', stroke: '#8A6400', sw: .8 },
    { d: 'M12 13.9l.95 1.95 2.15.3-1.55 1.5.37 2.1-1.92-1-1.92 1 .37-2.1-1.55-1.5 2.15-.3z', fill: '#FDE68A' },
  ],
  'flair-clover': [
    { d: 'M12 11.2C8.6 9.4 8.6 4.6 12 3.2c3.4 1.4 3.4 6.2 0 8z', fill: '#22C55E', stroke: '#166534', sw: .8 },
    { d: 'M12 11.2C8.6 9.4 8.6 4.6 12 3.2c3.4 1.4 3.4 6.2 0 8z', fill: '#22C55E', stroke: '#166534', sw: .8, t: 'rotate(90 12 12)' },
    { d: 'M12 11.2C8.6 9.4 8.6 4.6 12 3.2c3.4 1.4 3.4 6.2 0 8z', fill: '#22C55E', stroke: '#166534', sw: .8, t: 'rotate(180 12 12)' },
    { d: 'M12 11.2C8.6 9.4 8.6 4.6 12 3.2c3.4 1.4 3.4 6.2 0 8z', fill: '#22C55E', stroke: '#166534', sw: .8, t: 'rotate(270 12 12)' },
    { d: 'M12 5.4v5.4M5.4 12h5.4M12 13.2v5.4M13.2 12h5.4', fill: 'none', stroke: '#86EFAC', sw: .7, t: 'rotate(0 12 12)' },
    { d: 'M12.6 13.4c.5 3 1.6 5 3.4 6.8', fill: 'none', stroke: '#166534', sw: 1.5 },
  ],
  'flair-heart': [
    { d: 'M12 21.2C5.2 16.5 2.6 12.6 2.6 9.2a4.9 4.9 0 0 1 9.4-2 4.9 4.9 0 0 1 9.4 2c0 3.4-2.6 7.3-9.4 12z', fill: '#E11D48', stroke: '#9F1239', sw: .9 },
    { d: 'M5.9 8.6c.2-1.4 1.2-2.3 2.6-2.5', fill: 'none', stroke: '#FDA4AF', sw: 1.7 },
  ],
  'flair-scoreboard': [
    { d: 'M2.6 4.6h18.8a.9.9 0 0 1 .9.9v10a.9.9 0 0 1-.9.9H2.6a.9.9 0 0 1-.9-.9v-10a.9.9 0 0 1 .9-.9z', fill: '#1F2937', stroke: '#030712', sw: .9 },
    { d: 'M6.2 7.8v5.6M9.6 7.8h3.6l-1.7 5.6', fill: 'none', stroke: '#FBBF24', sw: 1.7 },
    { d: 'M15 10.6h1.8', fill: 'none', stroke: '#FBBF24', sw: 1.4 },
    { d: 'M18.2 7.8h2.4v5.6h-2.4z', fill: 'none', stroke: '#FBBF24', sw: 1.5 },
    { d: 'M6.4 16.4v4.8M17.6 16.4v4.8', fill: 'none', stroke: '#6B7280', sw: 2 },
  ],
  'flair-laurel': [
    { d: 'M8.4 20.4C4.4 17.8 3.2 12.4 5.4 7', fill: 'none', stroke: '#8A6400', sw: 1.2 },
    { d: 'M15.6 20.4c4-2.6 5.2-8 3-13.4', fill: 'none', stroke: '#8A6400', sw: 1.2 },
    { d: 'M0 0c1.7-1 2.7-3 2.5-4.9-2 .5-3.4 2.3-2.5 4.9z', fill: '#D4A017', stroke: '#8A6400', sw: .5, t: 'translate(5.6 7.4) rotate(-25)' },
    { d: 'M0 0c1.7-1 2.7-3 2.5-4.9-2 .5-3.4 2.3-2.5 4.9z', fill: '#E8C547', stroke: '#8A6400', sw: .5, t: 'translate(4.5 11.6) rotate(-62)' },
    { d: 'M0 0c1.7-1 2.7-3 2.5-4.9-2 .5-3.4 2.3-2.5 4.9z', fill: '#D4A017', stroke: '#8A6400', sw: .5, t: 'translate(5.4 15.6) rotate(-95)' },
    { d: 'M0 0c1.7-1 2.7-3 2.5-4.9-2 .5-3.4 2.3-2.5 4.9z', fill: '#E8C547', stroke: '#8A6400', sw: .5, t: 'translate(8.2 19) rotate(-125)' },
    { d: 'M0 0c-1.7-1-2.7-3-2.5-4.9 2 .5 3.4 2.3 2.5 4.9z', fill: '#D4A017', stroke: '#8A6400', sw: .5, t: 'translate(18.4 7.4) rotate(25)' },
    { d: 'M0 0c-1.7-1-2.7-3-2.5-4.9 2 .5 3.4 2.3 2.5 4.9z', fill: '#E8C547', stroke: '#8A6400', sw: .5, t: 'translate(19.5 11.6) rotate(62)' },
    { d: 'M0 0c-1.7-1-2.7-3-2.5-4.9 2 .5 3.4 2.3 2.5 4.9z', fill: '#D4A017', stroke: '#8A6400', sw: .5, t: 'translate(18.6 15.6) rotate(95)' },
    { d: 'M0 0c-1.7-1-2.7-3-2.5-4.9 2 .5 3.4 2.3 2.5 4.9z', fill: '#E8C547', stroke: '#8A6400', sw: .5, t: 'translate(15.8 19) rotate(125)' },
    { d: 'M10.2 20.8l1.8-1.2 1.8 1.2-.6 1.6h-2.4z', fill: '#B91C1C' },
  ],
  'flair-comet': [
    { d: 'M17.4 7.2L3 20.6c6.4-.6 12.6-5.2 14.8-11.2z', fill: '#FB923C', stroke: '#C2410C', sw: .6 },
    { d: 'M17.2 7.6L7.6 17.4c4.4-1.4 8.4-4.8 9.8-10.2z', fill: '#FDE68A' },
    { d: 'M17.6 4.2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z', fill: '#FEF3C7', stroke: '#F59E0B', sw: .9 },
    { d: 'M16.4 5.8a1.4 1.4 0 0 1 1.6-.4', fill: 'none', stroke: '#fff', sw: 1.1 },
  ],
};

export const FLAIR_KEYS = Object.keys(MARKS);

export function Flair({ k }: { k?: string | null }) {
  const shapes = k ? MARKS[k] : null;
  if (!shapes) return null;
  return (
    <span className={`nm-flair ${k}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        {shapes.map((s, i) => <path key={i} d={s.d} fill={s.fill} stroke={s.stroke} strokeWidth={s.sw} fillRule={s.even ? 'evenodd' : undefined} transform={s.t} strokeDasharray={s.dash} />)}
      </svg>
    </span>
  );
}
