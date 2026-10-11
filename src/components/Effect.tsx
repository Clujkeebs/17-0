import './effects.css';

/**
 * Shop effects: animated pieces around an avatar (profile, shop) or a small badge beside a name (leaderboards).
 * Pure CSS on a few spans, sized from --fx-size on the wrapper, decorative only, and still for reduced motion.
 */
const ball = {
  football: (
    <svg viewBox="0 0 24 24"><path d="M4.2 19.8C2.6 14.5 4.6 8.4 9.4 5.2c3.4-2.2 7.2-2.6 10.4-1 1.6 5.3-.4 11.4-5.2 14.6-3.4 2.2-7.2 2.6-10.4 1z" fill="#8B4513" stroke="#5C2E0B" strokeWidth=".9" /><path d="M9 15l6-6M10.2 11.6l2.2 2.2M11.8 10l2.2 2.2M8.6 13.2l2.2 2.2" stroke="#F5F5F4" strokeWidth="1.1" fill="none" strokeLinecap="round" /></svg>
  ),
  basketball: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#EA580C" stroke="#7C2D12" strokeWidth="1" /><path d="M2 12h20M12 2v20M5 5c3 3 3 11 0 14M19 5c-3 3-3 11 0 14" stroke="#7C2D12" strokeWidth="1" fill="none" /></svg>
  ),
  baseball: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#FAFAF9" stroke="#A8A29E" strokeWidth="1" /><path d="M6.5 4.5c2.5 4 2.5 11 0 15M17.5 4.5c-2.5 4-2.5 11 0 15" stroke="#DC2626" strokeWidth="1.2" fill="none" strokeDasharray="1.6 1.4" /></svg>
  ),
  crown: (
    <svg viewBox="0 0 24 24"><path d="M3 7.5l4.5 4 4.5-7 4.5 7 4.5-4-2 11.5H5z" fill="#E8C547" stroke="#8A6400" strokeWidth=".9" /><circle cx="12" cy="13" r="1.6" fill="#B91C1C" /></svg>
  ),
  bee: (
    <svg viewBox="0 0 32 24">
      <ellipse className="fx-wing fx-wing-a" cx="13" cy="6" rx="5" ry="4" fill="rgba(219,234,254,.85)" stroke="#93C5FD" strokeWidth=".6" />
      <ellipse className="fx-wing fx-wing-b" cx="19" cy="6" rx="5" ry="4" fill="rgba(219,234,254,.85)" stroke="#93C5FD" strokeWidth=".6" />
      <ellipse cx="16" cy="14" rx="10" ry="7" fill="#FACC15" stroke="#1C1917" strokeWidth="1" />
      <path d="M12 7.6v12.8M16.5 7v14M21 7.8v12.4" stroke="#1C1917" strokeWidth="2.2" />
      <circle cx="25" cy="12.5" r="1.3" fill="#1C1917" /><path d="M6 14l-3 1" stroke="#1C1917" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  bolt: <svg viewBox="0 0 24 24"><path d="M13.5 1.8 4.3 13.6h6.1l-1 8.6 9.3-11.8h-6.2z" fill="#FDE047" stroke="#CA8A04" strokeWidth=".8" /></svg>,
};

const n = (count: number) => Array.from({ length: count }, (_, i) => i);

function Inner({ k }: { k: string }) {
  switch (k) {
    case 'fx-sparks':
      return <>{n(3).map((i) => <span key={i} className={`fx-orbit fx-o${i}`}><span className="fx-spark" /></span>)}</>;
    case 'fx-football':
      return <span className="fx-orbit fx-slow"><span className="fx-bit fx-spiral">{ball.football}</span></span>;
    case 'fx-basketball':
      return <span className="fx-orbit"><span className="fx-bit fx-bounce">{ball.basketball}</span></span>;
    case 'fx-baseball':
      return <span className="fx-orbit fx-fast"><span className="fx-bit fx-spin">{ball.baseball}</span><span className="fx-trail" /></span>;
    case 'fx-owner':
      return <span className="fx-orbit fx-slow"><span className="fx-bit fx-glint">{ball.crown}</span></span>;
    case 'fx-bee':
      return <span className="fx-bee-path"><span className="fx-bit fx-bee">{ball.bee}</span></span>;
    case 'fx-comet':
      return <span className="fx-comet" />;
    case 'fx-halo':
      return <span className="fx-halo" />;
    case 'fx-snow':
      return <>{n(9).map((i) => <span key={i} className="fx-flake" style={{ ['--i' as string]: i }} />)}</>;
    case 'fx-confetti':
      return <>{n(14).map((i) => <span key={i} className="fx-conf" style={{ ['--i' as string]: i }} />)}</>;
    case 'fx-lightning':
      return <>{n(3).map((i) => <span key={i} className={`fx-zap fx-z${i}`}>{ball.bolt}</span>)}<span className="fx-flash" /></>;
    case 'fx-flames':
    case 'fx-ringfire':
      return <span className="fx-fire">{n(k === 'fx-flames' ? 16 : 10).map((i) => <span key={i} className="fx-tongue" style={{ ['--i' as string]: i }} />)}</span>;
    default:
      return null;
  }
}

export function Effect({ k }: { k?: string | null }) {
  if (!k) return null;
  return <span className={`fx ${k}`} aria-hidden="true"><Inner k={k} /></span>;
}

/** The leaderboard version: a small animated badge before the name. */
export function NameEffect({ k }: { k?: string | null }) {
  if (!k) return null;
  return (
    <span className="nm-fx fx-wrap" style={{ ['--fx-size' as string]: '1em' }} aria-hidden="true">
      <span className="nm-fx-core" />
      <Effect k={k} />
    </span>
  );
}
