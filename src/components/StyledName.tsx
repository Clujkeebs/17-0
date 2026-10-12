import type { NameStyle } from '@/lib/cosmetics';
import { titleLabel, titleRarity } from '@/lib/shop';
import { Flair } from './Flair';
import { NameEffect } from './Effect';

/**
 * A player name in their equipped style: font, color, flair before it, and (with showTitle) the title after it.
 * The font sits on the outer span and the color on the inner one, so a font's shadow or outline and a color's
 * glow or animation (both CSS filters) never fight over the same element.
 * The owner tag is rendered here from a server-decided flag only.
 */
export function StyledName({ name, style, className, showTitle = true }: { name: string; style?: NameStyle | null; className?: string; showTitle?: boolean }) {
  const s = style ?? { font: 'classic', color: 'ink', owner: false };
  const title = showTitle ? titleLabel(s.title) : null;
  return (
    <span className={`nm${className ? ` ${className}` : ''}`}>
      <NameEffect k={s.effect} />
      <Flair k={s.flair} />
      <span className={`nm-text nm-f-${s.font}`}><span className={`nm-cn nm-c-${s.color}`}>{name}</span></span>
      {s.owner && <span className="owner-tag" aria-label="Site owner">[OWNER]</span>}
      {title && <span className={`nm-title t-${titleRarity(s.title)}`}>{title}</span>}
    </span>
  );
}
