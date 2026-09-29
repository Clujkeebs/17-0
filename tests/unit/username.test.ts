import { describe, expect, it } from 'vitest';
import { isProfaneUsername, isReservedUsername, normalizeLeet, USERNAME_MESSAGES, validateUsername } from '@/lib/server/username';

describe('normalizeLeet', () => {
  it('maps common substitutions', () => {
    expect(normalizeLeet('H3LL0_W0RLD')).toBe('hello_world');
    expect(normalizeLeet('$h1t@7')).toBe('shitat');
    expect(normalizeLeet('4574')).toBe('asta');
  });
});

describe('validateUsername', () => {
  it('accepts ordinary names', () => {
    for (const n of ['TomBrady12', 'all_22_film', 'epa_per_play', 'abc', 'Dickerson29', 'BassFan', 'peacock_qb', 'classic_7', 'x'.repeat(20)]) {
      expect(validateUsername(n), n).toEqual({ ok: true, username: n });
    }
  });

  it('trims whitespace', () => {
    expect(validateUsername('  qb1  ')).toEqual({ ok: true, username: 'qb1' });
  });

  it('rejects length problems with specific messages', () => {
    expect(validateUsername('')).toMatchObject({ ok: false, code: 'required' });
    expect(validateUsername(undefined)).toMatchObject({ ok: false, code: 'required' });
    expect(validateUsername('ab')).toMatchObject({ ok: false, code: 'tooShort' });
    expect(validateUsername('a'.repeat(21))).toMatchObject({ ok: false, code: 'tooLong' });
  });

  it('rejects characters outside letters, numbers, underscore', () => {
    for (const n of ['has space', 'dash-name', 'dot.name', 'émile', 'emoji🔥', 'a$b', 'at@me']) {
      expect(validateUsername(n), n).toEqual({ ok: false, code: 'charset', error: USERNAME_MESSAGES.charset });
    }
  });

  it('rejects profanity including leetspeak and separators', () => {
    for (const n of ['fuck', 'FUCK_you', 'fuk_u_shit', 'sh1t', 'b1tch_qb', 'f_u_c_k', 'BigAss', 'ass_man', 'Wh0re', 'n1gg3r']) {
      expect(validateUsername(n), n).toMatchObject({ ok: false, code: 'profane', error: USERNAME_MESSAGES.profane });
    }
  });

  it('rejects reserved names anywhere in the string', () => {
    for (const n of ['admin', 'Admin_Bob', 'the_moderator', 'GridironLab', 'gr1d1ronl4b', 'official_qb', '4dm1n']) {
      expect(validateUsername(n), n).toMatchObject({ ok: false, code: 'reserved' });
    }
  });

  it('uses brand-voice messages', () => {
    expect(USERNAME_MESSAGES.taken).toBe("That one's taken.");
    expect(USERNAME_MESSAGES.charset).toBe('Keep it to letters, numbers, and underscores.');
    expect(USERNAME_MESSAGES.profane).toBe('Pick something your mom could read on a jumbotron.');
    for (const m of Object.values(USERNAME_MESSAGES)) expect(m).not.toMatch(/—/);
  });
});

describe('helpers', () => {
  it('isReservedUsername / isProfaneUsername agree with validate', () => {
    expect(isReservedUsername('moderator9')).toBe(true);
    expect(isReservedUsername('mod_squad')).toBe(false);
    expect(isProfaneUsername('grapes_of_wrath')).toBe(false);
    expect(isProfaneUsername('hellcat_fan')).toBe(false);
  });
});
