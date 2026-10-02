import type { NameStyle } from '@/lib/cosmetics';

/** A player name in their equipped style. The owner tag is rendered here from a server-decided flag only. */
export function StyledName({ name, style, className }: { name: string; style?: NameStyle | null; className?: string }) {
  const s = style ?? { font: 'classic', color: 'ink', owner: false };
  return (
    <span className={`nm${className ? ` ${className}` : ''}`}>
      <span className={`nm-text nm-f-${s.font} nm-c-${s.color}`}>{name}</span>
      {s.owner && <span className="owner-tag" aria-label="Site owner">[OWNER]</span>}
    </span>
  );
}
