import type { NameStyle } from '@/lib/cosmetics';
import { titleLabel } from '@/lib/shop';
import { Flair } from './Flair';

/**
 * A player name in their equipped style: font, color, flair before it, and (with showTitle) the title after it.
 * The owner tag is rendered here from a server-decided flag only.
 */
export function StyledName({ name, style, className, showTitle = true }: { name: string; style?: NameStyle | null; className?: string; showTitle?: boolean }) {
  const s = style ?? { font: 'classic', color: 'ink', owner: false };
  const title = showTitle ? titleLabel(s.title) : null;
  return (
    <span className={`nm${className ? ` ${className}` : ''}`}>
      <Flair k={s.flair} />
      <span className={`nm-text nm-f-${s.font} nm-c-${s.color}`}>{name}</span>
      {s.owner && <span className="owner-tag" aria-label="Site owner">[OWNER]</span>}
      {title && <span className="nm-title">{title}</span>}
    </span>
  );
}
