import Link from 'next/link';
import type { PlayerLook } from '@/lib/cosmetics';
import { Avatar } from './HeaderProfile';
import { StyledName } from './StyledName';

/**
 * A player on a board: their picture in its ring, and their name on their banner. Everyone has a banner and a ring
 * (the free plain ones until they equip something), so every row looks the same shape. Boards draw each banner's
 * still art (see cosmetics.css), which keeps a hundred rows smooth.
 */
export function PlayerPlate({ name, username, look, size = 34 }: { name: string; username?: string | null; look?: PlayerLook | null; size?: number }) {
  const s: PlayerLook = look ?? { font: 'classic', color: 'ink', owner: false };
  const cls = `plate banner ${s.banner ?? 'banner-plain'}`;
  const body = (
    <>
      <Avatar name={name} src={s.avatar ?? null} size={size} ring={s.border ?? 'ring-plain'} effect={s.effect} />
      <StyledName name={name} style={s} />
    </>
  );
  return username ? <Link href={`/u/${username}`} className={`${cls} lb-name`}>{body}</Link> : <span className={cls}>{body}</span>;
}
