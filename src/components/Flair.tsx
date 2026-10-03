/** Leaderboard flair: small custom marks shown before a name. Decorative; the title carries any meaning. */
const PATHS: Record<string, { d: string; fill: string }> = {
  'flair-star': { d: 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z', fill: '#B7860B' },
  'flair-flame': { d: 'M12.5 2c.6 3.6-1.8 5.2-2.9 7.3-.6-1.2-.7-2.3-.4-3.5C6.6 8 5 10.8 5 14a7 7 0 0 0 14 0c0-3.9-2.7-6.7-4.4-8.4.1 1.7-.3 3-1.2 3.9.5-3.3-.3-5.8-.9-7.5z', fill: '#C2410C' },
  'flair-bolt': { d: 'M13.5 2 4.5 13.5h6l-1 8.5 9-11.5h-6z', fill: '#1D4ED8' },
  'flair-crown': { d: 'M3 7.5l4.5 4 4.5-7 4.5 7 4.5-4-2 11.5H5z', fill: '#8A6400' },
  'flair-diamond': { d: 'M6.5 3h11L22 9l-10 12L2 9zm1 1.6L4.7 8.4h3.6zm9 0-.8 3.8h3.6zm-7.7 3.8h6.4L12 4.6zM5 10l6 7.2-2.2-7.2zm9.2 0L12 17.2 18.9 10z', fill: '#0E7490' },
  'flair-owner': { d: 'M12 2 3.5 5.5v6c0 5.1 3.6 9.3 8.5 10.5 4.9-1.2 8.5-5.4 8.5-10.5v-6zm0 4.2 1.7 3.6 3.9.4-2.9 2.7.8 3.9L12 14.9l-3.5 1.9.8-3.9-2.9-2.7 3.9-.4z', fill: '#B91C1C' },
};

export function Flair({ k }: { k?: string | null }) {
  const p = k ? PATHS[k] : null;
  if (!p) return null;
  return <span className="nm-flair" aria-hidden="true"><svg viewBox="0 0 24 24"><path d={p.d} fill={p.fill} fillRule="evenodd" /></svg></span>;
}
