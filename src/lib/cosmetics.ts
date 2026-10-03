/**
 * Name styles. Players unlock fonts and colors with their longest daily streak and equip one of each.
 * The owner style (neon font, moving rainbow, red [OWNER] tag) is not in either list, so nobody can unlock
 * or equip it: the server grants it only to the owner account, decided by email, never by anything a client sends.
 */
import { SHOP_ITEMS } from './shop';

export interface StyleOption { key: string; label: string; unlock: number }

export const NAME_FONTS: StyleOption[] = [
  { key: 'classic', label: 'Classic', unlock: 0 },
  { key: 'scoreboard', label: 'Scoreboard', unlock: 2 },
  { key: 'program', label: 'Program', unlock: 5 },
  { key: 'sharpie', label: 'Sharpie', unlock: 14 },
  { key: 'stadium', label: 'Stadium', unlock: 30 },
];

/** Every color keeps at least 4.5:1 contrast on white. */
export const NAME_COLORS: StyleOption[] = [
  { key: 'ink', label: 'Ink', unlock: 0 },
  { key: 'signal', label: 'Signal red', unlock: 3 },
  { key: 'turf', label: 'Turf', unlock: 7 },
  { key: 'navy', label: 'Navy', unlock: 10 },
  { key: 'gold', label: 'Gold', unlock: 21 },
];

export const OWNER_FONT = 'neon';
export const OWNER_COLOR = 'rainbow';

const OWNER_EMAILS = (process.env.OWNER_EMAILS ?? 'clujkeebs@aol.com').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
/** Server-side only in effect: the email never reaches the client. */
export const isOwnerEmail = (email: string | null | undefined) => !!email && OWNER_EMAILS.includes(email.toLowerCase());
export const ownerEmails = () => OWNER_EMAILS;

export const unlocked = (list: StyleOption[], longestStreak: number) => list.filter((o) => longestStreak >= o.unlock).map((o) => o.key);

/** Whether this player may equip this style. Owner-only keys are never equippable; the owner gets them automatically. */
export function canEquip(kind: 'font' | 'color', key: string, longestStreak: number): boolean {
  const list = kind === 'font' ? NAME_FONTS : NAME_COLORS;
  const o = list.find((x) => x.key === key);
  return !!o && longestStreak >= o.unlock;
}

/** Shop fonts and colors are valid style keys too (ownership is checked when equipping, on the server). */
const shopKeys = (kind: 'font' | 'color') => SHOP_ITEMS.filter((i) => i.kind === kind).map((i) => i.key);
const validFont = (k: string | null | undefined) => !!k && (NAME_FONTS.some((f) => f.key === k) || shopKeys('font').includes(k));
const validColor = (k: string | null | undefined) => !!k && (NAME_COLORS.some((c) => c.key === k) || shopKeys('color').includes(k));
const validOf = (kind: string, k: string | null | undefined) => !!k && SHOP_ITEMS.some((i) => i.kind === kind && i.key === k);

export interface NameStyle { font: string; color: string; owner: boolean; title?: string | null; flair?: string | null; border?: string | null; banner?: string | null }
type Stored = { font?: string | null; color?: string | null; title?: string | null; flair?: string | null; border?: string | null; banner?: string | null };
/**
 * The style a name actually renders with. A stored key that is not (or no longer) valid falls back to the
 * default. The owner renders in the owner style unless they equipped something else from the shop.
 */
export function resolveStyle(stored: Stored, owner: boolean): NameStyle {
  const extras = {
    title: validOf('title', stored.title) ? stored.title : owner ? 'commissioner' : null,
    flair: validOf('flair', stored.flair) ? stored.flair : owner ? 'flair-owner' : null,
    border: validOf('border', stored.border) ? stored.border : owner ? 'ring-owner' : null,
    banner: validOf('banner', stored.banner) ? stored.banner : owner ? 'banner-founder' : null,
  };
  // For the owner only shop picks replace the owner style (a saved default like Classic does not).
  if (owner) return { font: shopKeys('font').includes(stored.font ?? '') ? stored.font! : OWNER_FONT, color: shopKeys('color').includes(stored.color ?? '') ? stored.color! : OWNER_COLOR, owner: true, ...extras };
  return { font: validFont(stored.font) ? stored.font! : 'classic', color: validColor(stored.color) ? stored.color! : 'ink', owner: false, ...extras };
}
