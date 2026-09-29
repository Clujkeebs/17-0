import { describe, expect, it } from 'vitest';
import { CONFIRM_TTL_MS, confirmationExpiry, confirmOutcome, decideSubscribeAction, isTokenExpired } from '@/lib/server/newsletter';

const now = new Date('2026-09-29T12:00:00Z');
const later = (ms: number) => new Date(now.getTime() + ms);

describe('token expiry', () => {
  it('confirmation tokens last 24 hours', () => {
    expect(confirmationExpiry(now).getTime() - now.getTime()).toBe(24 * 3600 * 1000);
    expect(CONFIRM_TTL_MS).toBe(86_400_000);
  });

  it('isTokenExpired', () => {
    expect(isTokenExpired(later(1000), now)).toBe(false);
    expect(isTokenExpired(now, now)).toBe(true);
    expect(isTokenExpired(later(-1), now)).toBe(true);
    expect(isTokenExpired(null, now)).toBe(true);
    expect(isTokenExpired(undefined, now)).toBe(true);
    const exp = confirmationExpiry(now);
    expect(isTokenExpired(exp, later(CONFIRM_TTL_MS - 1))).toBe(false);
    expect(isTokenExpired(exp, later(CONFIRM_TTL_MS))).toBe(true);
  });
});

describe('decideSubscribeAction', () => {
  const base = { confirmed: false, confirmationToken: 'tok', tokenExpiresAt: later(3600_000), unsubscribedAt: null };
  it('creates when no row', () => expect(decideSubscribeAction(null, now)).toBe('create'));
  it('does nothing for confirmed subscribers', () => expect(decideSubscribeAction({ ...base, confirmed: true, confirmationToken: null, tokenExpiresAt: null }, now)).toBe('noop'));
  it('resends a live token', () => expect(decideSubscribeAction(base, now)).toBe('resend'));
  it('refreshes an expired token', () => expect(decideSubscribeAction({ ...base, tokenExpiresAt: later(-1) }, now)).toBe('refresh'));
  it('refreshes a missing token', () => expect(decideSubscribeAction({ ...base, confirmationToken: null }, now)).toBe('refresh'));
  it('resubscribes after unsubscribe, even if previously confirmed', () =>
    expect(decideSubscribeAction({ ...base, confirmed: true, unsubscribedAt: later(-86400_000) }, now)).toBe('resubscribe'));
});

describe('confirmOutcome', () => {
  const row = { confirmed: false, confirmationToken: 'tok', tokenExpiresAt: later(1000), unsubscribedAt: null };
  it('confirms a live token', () => expect(confirmOutcome(row, now)).toBe('confirmed'));
  it('expires an old token', () => expect(confirmOutcome({ ...row, tokenExpiresAt: later(-1000) }, now)).toBe('expired'));
  it('rejects unknown tokens', () => expect(confirmOutcome(null, now)).toBe('invalid'));
  it('rejects tokens on unsubscribed rows', () => expect(confirmOutcome({ ...row, unsubscribedAt: now }, now)).toBe('invalid'));
});
