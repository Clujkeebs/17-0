/**
 * Name styles. Players unlock fonts and colors with their longest daily streak and equip one of each.
 * The owner style (neon font, moving rainbow, red [OWNER] tag) is not in either list, so nobody can unlock
 * or equip it: the server grants it only to the owner account, decided by email, never by anything a client sends.
 */
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

export interface NameStyle { font: string; color: string; owner: boolean }
/** The style a name actually renders with. A stored key that is not (or no longer) valid falls back to the default. */
export function resolveStyle(stored: { font?: string | null; color?: string | null }, owner: boolean): NameStyle {
  if (owner) return { font: OWNER_FONT, color: OWNER_COLOR, owner: true };
  const font = NAME_FONTS.some((f) => f.key === stored.font) ? stored.font! : 'classic';
  const color = NAME_COLORS.some((c) => c.key === stored.color) ? stored.color! : 'ink';
  return { font, color, owner: false };
}
