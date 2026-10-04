import { BADGES, type Badge } from '@/lib/badges';

function Item({ b, on }: { b: Badge; on: boolean }) {
  return (
    <li className={on ? 'badge on' : 'badge'}>
      <span className="badge-mark" aria-hidden="true">{on ? '★' : '☆'}</span>
      <span><strong>{b.label}</strong><span className="badge-desc">{b.desc}</span></span>
    </li>
  );
}

/** Earned badges as a row of marks. On your own profile, the ones still to earn fold away underneath. */
export function Badges({ earned, showLocked = false }: { earned: Badge[]; showLocked?: boolean }) {
  const have = new Set(earned.map((b) => b.key));
  const locked = BADGES.filter((b) => !have.has(b.key));
  if (!earned.length && !showLocked) return null;
  return (
    <section aria-labelledby="badges-h" className="badges">
      <h2 id="badges-h">Badges <span className="muted num">{earned.length} of {BADGES.length}</span></h2>
      {earned.length > 0 ? <ul>{earned.map((b) => <Item key={b.key} b={b} on />)}</ul> : <p className="muted" style={{ margin: 0 }}>None yet. Play a ranked game to start.</p>}
      {showLocked && locked.length > 0 && (
        <details className="badges-more">
          <summary>{locked.length} still to earn</summary>
          <ul>{locked.map((b) => <Item key={b.key} b={b} on={false} />)}</ul>
        </details>
      )}
    </section>
  );
}
