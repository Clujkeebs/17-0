import { describe, expect, it } from 'vitest';
import { canEquip, isOwnerAccount, isOwnerEmail, NAME_COLORS, NAME_FONTS, OWNER_COLOR, OWNER_FONT, resolveStyle, unlocked } from '@/lib/cosmetics';
import { validateDisplayName, validateUsername } from '@/lib/server/username';

describe('name styles', () => {
  it('unlock with the longest streak', () => {
    expect(unlocked(NAME_FONTS, 0)).toEqual(['classic']);
    expect(unlocked(NAME_COLORS, 7)).toEqual(['ink', 'signal', 'turf']);
    expect(canEquip('font', 'stadium', 29)).toBe(false);
    expect(canEquip('font', 'stadium', 30)).toBe(true);
  });
  it('never let anyone equip the owner style, at any streak', () => {
    expect(canEquip('font', OWNER_FONT, 10_000)).toBe(false);
    expect(canEquip('color', OWNER_COLOR, 10_000)).toBe(false);
    expect(NAME_FONTS.some((f) => f.key === OWNER_FONT) || NAME_COLORS.some((c) => c.key === OWNER_COLOR)).toBe(false);
  });
  it("marks feedback from the owner's other account (Bot) as the owner's, and nothing else", () => {
    expect(isOwnerAccount(null, 'Bot')).toBe(true);
    expect(isOwnerAccount(null, 'bot')).toBe(true);
    expect(isOwnerAccount('clujkeebs@aol.com', null)).toBe(true);
    expect(isOwnerAccount('someone@example.com', 'Robot')).toBe(false);
    expect(isOwnerAccount(null, null)).toBe(false);
    // The owner style and the shop still follow the email alone: Bot gets no exclusives from this.
    expect(isOwnerEmail('bot@example.com')).toBe(false);
  });
  it('grant the owner style from the account email only', () => {
    expect(isOwnerEmail('clujkeebs@aol.com')).toBe(true);
    expect(isOwnerEmail('CLUJKEEBS@AOL.COM')).toBe(true);
    expect(isOwnerEmail('clujkeebs@aol.co')).toBe(false);
    expect(isOwnerEmail(null)).toBe(false);
    // Streak styles never replace the owner style; owner exclusives are on by default.
    expect(resolveStyle({ font: 'stadium', color: 'gold' }, true)).toEqual({ font: OWNER_FONT, color: OWNER_COLOR, owner: true, title: 'commissioner', flair: 'flair-owner', border: 'ring-owner', banner: 'banner-founder', effect: 'fx-owner' });
    // A shop item the owner equips does.
    expect(resolveStyle({ color: 'founders', title: 'day-one' }, true)).toMatchObject({ font: OWNER_FONT, color: 'founders', title: 'day-one' });
    // A stored owner key (say, written by hand) still renders as the default for everyone else.
    // Nothing equipped means the free basics: the plain ring and the plain banner.
    expect(resolveStyle({ font: OWNER_FONT, color: OWNER_COLOR }, false)).toEqual({ font: 'classic', color: 'ink', owner: false, title: null, flair: null, border: 'ring-plain', banner: 'banner-plain', effect: null });
    // Shop keys are valid styles for anyone (ownership is checked when equipping).
    expect(resolveStyle({ font: 'varsity', color: 'aurora', flair: 'flair-star' }, false)).toMatchObject({ font: 'varsity', color: 'aurora', flair: 'flair-star' });
  });
});

describe('names cannot impersonate the owner', () => {
  it('rejects owner-ish usernames and display names, and brackets', () => {
    for (const u of ['owner', 'TheOwner', '0wner_1', 'site_owner']) expect(validateUsername(u).ok).toBe(false);
    for (const n of ['[OWNER]', 'Real Owner', '0wner', 'Joe [VIP]', 'Admin Joe']) expect(validateDisplayName(n).ok).toBe(false);
    expect(validateDisplayName('Joe Burrow Fan')).toEqual({ ok: true, name: 'Joe Burrow Fan' });
    expect(validateDisplayName('   ')).toEqual({ ok: true, name: null });
  });
});
