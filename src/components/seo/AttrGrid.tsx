import type { AttributeKey, Attributes } from '@/lib/game/attributes';
import { ATTRIBUTE_LABELS } from '@/lib/game/attributes';

/** Grid of large mono attribute numbers. `weights` marks formula inputs. */
export function AttrGrid({ keys, attrs, weights }: { keys: AttributeKey[]; attrs: Attributes; weights?: Partial<Record<AttributeKey, number>> }) {
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, margin: 0 }}>
      {keys.map((k) => {
        const w = weights?.[k];
        return (
          <div key={k} style={{ background: 'var(--surface)', border: '1px solid var(--steel)', borderRadius: 2, padding: '16px 14px', display: 'flex', flexDirection: 'column-reverse', gap: 6 }}>
            <dt style={{ fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--bone-dim)' }}>
              {ATTRIBUTE_LABELS[k]}{w ? <span className="accent"> {Math.round(w * 100)}%</span> : null}
            </dt>
            <dd className="num" style={{ margin: 0, fontSize: '2.4rem', fontWeight: 700, lineHeight: 1 }}>{attrs[k] ?? '--'}</dd>
          </div>
        );
      })}
    </dl>
  );
}
