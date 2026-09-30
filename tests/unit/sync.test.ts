import { describe, expect, it } from 'vitest';
import { parseRatings, parseHeight, parseStats } from '@/lib/server/sync/parse';
import { diffPlayers, validate } from '@/lib/server/sync/diff';
import type { ExistingPlayer, FeedPlayer } from '@/lib/server/sync/types';
import { generateAttributes } from '../../data/seed/attributes';
import { PLAYERS } from '../../data/seed/players';
import { TEAMS } from '../../data/seed/teams';
import { ATTRIBUTE_KEYS, positionGroup } from '@/lib/game/attributes';
import { ratePlayer } from '@/lib/game/formulas';

const eaPage = {
  totalItems: 3,
  items: [
    {
      id: 101, firstName: 'Patrick', lastName: 'Mahomes', overallRating: 97,
      position: { id: 'qb', shortLabel: 'QB', label: 'Quarterback' },
      team: { id: 14, label: 'Kansas City Chiefs' },
      height: `6'2"`, weight: 225, college: 'Texas Tech', age: 31, jerseyNum: 15, yearsPro: 10,
      archetype: { label: 'Field General' },
      avatarUrl: 'https://example.com/mahomes.png',
      stats: {
        throwPower: { value: 96, diff: 0 }, throwAccuracyDeep: { value: 92 }, throwAccuracyMid: { value: 94 },
        throwUnderPressure: { value: 95 }, awareness: { value: 99 }, speed: { value: 72 }, playAction: { value: 97 },
        ballCarrierVision: { value: 70 }, mediumRouteRunning: { value: 30 }, deepRouteRunning: { value: 20 },
        totallyUnknownStat: { value: 50 },
      },
    },
    { id: 102, firstName: 'Jahmyr', lastName: 'Gibbs', overallRating: '94', position: { shortLabel: 'HB' }, team: { label: 'Lions' }, stats: [{ id: 'speed', value: 97 }, { id: 'carrying', value: 90 }] },
    { id: 103, firstName: '', lastName: '', overallRating: 80, position: { shortLabel: 'WR' } }, // no name: dropped
  ],
};

describe('parseRatings', () => {
  it('normalizes EA items and maps stat ids', () => {
    const out = parseRatings(eaPage);
    expect(out).toHaveLength(2);
    const m = out[0];
    expect(m).toMatchObject({
      maddenId: 'ea-101', fullName: 'Patrick Mahomes', slug: 'patrick-mahomes', position: 'QB', teamLabel: 'Kansas City Chiefs',
      overallRating: 97, heightInches: 74, weightLbs: 225, jerseyNumber: 15, archetype: 'Field General', imageUrl: null,
    });
    expect(m.attributes.throwPower).toBe(96);
    expect(m.attributes.bcVision).toBe(70);
    expect(m.attributes.routeRunning).toBe(25);
    expect(m.attributes).not.toHaveProperty('totallyUnknownStat');
    expect(out[1].overallRating).toBe(94);
    expect(out[1].attributes).toEqual({ speed: 97, carrying: 90 });
    expect(out[1].teamLabel).toBe('Lions');
  });

  it('accepts arrays of pages and de-duplicates ids', () => {
    expect(parseRatings([eaPage, eaPage])).toHaveLength(2);
    expect(parseRatings({ nope: true })).toEqual([]);
    expect(parseRatings(null)).toEqual([]);
  });

  it('parses heights and loose stat shapes', () => {
    expect(parseHeight('6-4')).toBe(76);
    expect(parseHeight(71)).toBe(71);
    expect(parseHeight('tall')).toBeNull();
    expect(parseStats({ Throw_Power: 90, catchInTraffic: { value: '80' } })).toEqual({ throwPower: 90, catchInTraffic: 80 });
  });
});

const feed = (o: Partial<FeedPlayer>): FeedPlayer => ({
  maddenId: 'ea-1', fullName: 'Test Player', firstName: 'Test', lastName: 'Player', slug: 'test-player', position: 'WR',
  teamLabel: 'Chiefs', overallRating: 80, attributes: { speed: 90 }, archetype: null, heightInches: null, weightLbs: null,
  college: null, jerseyNumber: null, age: null, yearsPro: null, imageUrl: null, ...o,
});
const row = (o: Partial<ExistingPlayer>): ExistingPlayer => ({
  id: 'u1', maddenId: 'ea-1', slug: 'test-player', overallRating: 80, attributes: { speed: 90 }, maddenVersion: 'madden-27',
  isActive: true, isAllTimeGreat: false, ...o,
});

describe('validate', () => {
  it('rejects out-of-range OVR, duplicates, and empty feeds', () => {
    expect(validate([]).ok).toBe(false);
    const v = validate([feed({ overallRating: 104 }), feed({ maddenId: 'ea-1', overallRating: -1 })]);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes('OVR out of range'))).toBe(true);
    expect(v.errors.some((e) => e.includes('Duplicate'))).toBe(true);
  });

  it('flags big drops and small teams as warnings only', () => {
    const v = validate([feed({ overallRating: 60 })], [row({ overallRating: 80 })]);
    expect(v.ok).toBe(true);
    expect(v.flaggedDrops).toEqual([{ maddenId: 'ea-1', fullName: 'Test Player', from: 80, to: 60 }]);
    expect(v.warnings.some((w) => w.includes('under 53'))).toBe(true);
  });

  it('refuses a feed less than half the size of the active league', () => {
    const prev = Array.from({ length: 300 }, (_, i) => row({ id: `u${i}`, maddenId: `ea-${i}`, slug: `p${i}` }));
    expect(validate([feed({})], prev).ok).toBe(false);
  });
});

describe('diffPlayers', () => {
  it('buckets added, changed, unchanged, missing and claims seed rows by slug', () => {
    const existing = [
      row({ id: 'a', maddenId: 'ea-1', slug: 'same' }),
      row({ id: 'b', maddenId: 'ea-2', slug: 'moved', overallRating: 70 }),
      row({ id: 'c', maddenId: 'seed-rookie', slug: 'rookie', maddenVersion: 'seed-2027' }),
      row({ id: 'd', maddenId: 'ea-9', slug: 'retired' }),
      row({ id: 'e', maddenId: 'seed-legend', slug: 'legend', isAllTimeGreat: true, maddenVersion: 'seed-2027' }),
    ];
    const incoming = [
      feed({ maddenId: 'ea-1', slug: 'same' }),
      feed({ maddenId: 'ea-2', slug: 'moved', overallRating: 75 }),
      feed({ maddenId: 'ea-3', slug: 'rookie' }),
      feed({ maddenId: 'ea-4', slug: 'brand-new' }),
    ];
    const d = diffPlayers(existing, incoming);
    expect(d.unchanged.map((u) => u.existing.id)).toEqual(['a']);
    expect(d.changed.map((c) => [c.existing.id, c.ovrDelta])).toEqual([['b', 5], ['c', 0]]);
    expect(d.added.map((a) => a.maddenId)).toEqual(['ea-4']);
    expect(d.missing.map((m) => m.id)).toEqual(['d']);
  });
});

describe('generateAttributes', () => {
  it('is deterministic and fills every key within 20..99', () => {
    const a = generateAttributes('QB', 90, 'Some Passer');
    expect(a).toEqual(generateAttributes('QB', 90, 'Some Passer'));
    for (const k of ATTRIBUTE_KEYS) {
      expect(Number.isInteger(a[k])).toBe(true);
      expect(a[k]).toBeGreaterThanOrEqual(20);
      expect(a[k]).toBeLessThanOrEqual(99);
    }
  });

  it('gives positions their shape', () => {
    const qb = generateAttributes('QB', 90, 'x');
    expect(qb.throwPower).toBeGreaterThan(qb.tackle);
    const k = generateAttributes('K', 85, 'y');
    expect(k.kickPower).toBeGreaterThan(k.speed);
    const cb = generateAttributes('CB', 88, 'z');
    expect(cb.manCoverage).toBeGreaterThan(cb.throwPower);
  });

  it('lands the position formula rating within 5 of overall for every seed player', () => {
    for (const p of PLAYERS) {
      const g = positionGroup(p.position);
      if (g === 'OL') continue; // OL use the TE formula by design; not calibrated
      const r = ratePlayer(generateAttributes(p.position, p.overall, p.fullName), g);
      expect(Math.abs(r - p.overall), `${p.fullName} ${p.overall} -> ${r}`).toBeLessThanOrEqual(5);
    }
  });
});

describe('seed data', () => {
  it('has 32 teams and at least 14 players per team', () => {
    expect(TEAMS).toHaveLength(32);
    for (const t of TEAMS) expect(PLAYERS.filter((p) => p.team === t.abbreviation).length).toBeGreaterThanOrEqual(14);
    expect(PLAYERS.filter((p) => p.isAllTimeGreat).length).toBeGreaterThanOrEqual(20);
  });
});
