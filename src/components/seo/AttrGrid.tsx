import type { AttributeKey, Attributes } from '@/lib/game/attributes';
import { ATTRIBUTE_LABELS } from '@/lib/game/attributes';

/** Attribute list with value and a thin meter. `weights` marks formula inputs in the accent. */
export function AttrGrid({ keys, attrs, weights }: { keys: AttributeKey[]; attrs: Attributes; weights?: Partial<Record<AttributeKey, number>> }) {
  return (
    <dl className="attr-list">
      {keys.map((k) => {
        const w = weights?.[k];
        const v = attrs[k];
        return (
          <div key={k} className={`attr${w ? ' weighted' : ''}`}>
            <dt>{ATTRIBUTE_LABELS[k]}{w ? <span className="w num">{Math.round(w * 100)}%</span> : null}</dt>
            <dd className="num">{v ?? '--'}</dd>
            <span className="meter" aria-hidden="true"><span style={{ width: `${typeof v === 'number' ? Math.max(0, Math.min(99, v)) / 99 * 100 : 0}%` }} /></span>
          </div>
        );
      })}
    </dl>
  );
}
