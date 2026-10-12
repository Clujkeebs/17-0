import { BADGES, BADGE_GROUPS, type Badge, type BadgeTier } from '@/lib/badges';

const TIER_LABEL: Record<BadgeTier, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };
const TIER_ORDER: Record<BadgeTier, number> = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

function Tile({ b, on, mystery = false }: { b: Badge; on: boolean; mystery?: boolean }) {
  return (
    <li className={`badge t-${b.tier}${on ? ' on' : ''}${mystery ? ' secret' : ''}`}>
      <span className="badge-mark" aria-hidden="true">{on ? '★' : mystery ? '?' : '☆'}</span>
      <span>
        <strong>{mystery ? 'Hidden achievement' : b.label}</strong>
        <span className="badge-desc">{mystery ? (b.hint ?? 'Keep playing to find it.') : b.desc}</span>
        {!mystery && <span className="badge-tier">{TIER_LABEL[b.tier]}</span>}
      </span>
    </li>
  );
}

/**
 * Achievements. A public profile shows only what has been earned. On your own profile every group lists what is earned,
 * what is still to earn, and the hidden ones as mysteries (with a hint) until they are found.
 */
export function Badges({ earned, showLocked = false }: { earned: Badge[]; showLocked?: boolean }) {
  const have = new Set(earned.map((b) => b.key));
  if (!earned.length && !showLocked) return null;
  const hiddenLeft = BADGES.filter((b) => b.hidden && !have.has(b.key)).length;
  return (
    <section id="badges" aria-labelledby="badges-h" className="badges">
      <h2 id="badges-h">Achievements <span className="muted num">{earned.length} of {BADGES.length}</span></h2>
      {!showLocked ? (
        <ul>{[...earned].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]).map((b) => <Tile key={b.key} b={b} on />)}</ul>
      ) : (
        <>
          {!earned.length && <p className="muted" style={{ margin: '0 0 12px' }}>None yet. Play a game to start.</p>}
          {BADGE_GROUPS.map((group) => {
            const all = BADGES.filter((b) => b.group === group);
            const got = all.filter((b) => have.has(b.key)).sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
            const open = all.filter((b) => !have.has(b.key) && !b.hidden);
            const secret = all.filter((b) => !have.has(b.key) && b.hidden);
            const total = all.filter((b) => !b.hidden || have.has(b.key)).length + secret.length;
            return (
              <details key={group} className="badge-group" open={got.length > 0}>
                <summary><strong>{group}</strong> <span className="muted num">{got.length} of {total}</span></summary>
                <ul>
                  {got.map((b) => <Tile key={b.key} b={b} on />)}
                  {open.map((b) => <Tile key={b.key} b={b} on={false} />)}
                  {secret.map((b) => <Tile key={b.key} b={b} on={false} mystery />)}
                </ul>
              </details>
            );
          })}
          {hiddenLeft > 0 && <p className="muted badge-foot">{hiddenLeft} hidden achievement{hiddenLeft === 1 ? '' : 's'} left to find.</p>}
        </>
      )}
    </section>
  );
}
