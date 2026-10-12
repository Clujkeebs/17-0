import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/game/prng';
import { DROP_WINDOW_MS, clock, dropMinute, dropPhase, etInstant, planDrop, secondsLeft } from '@/lib/drops';

const POOL = ['a', 'b', 'c', 'd', 'e', 'f'];
const etMinutes = (d: Date) => {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).formatToParts(d);
  return Number(p.find((x) => x.type === 'hour')!.value) * 60 + Number(p.find((x) => x.type === 'minute')!.value);
};

describe('drop schedule', () => {
  it('turns an Eastern wall clock into the right instant, in summer and winter', () => {
    expect(etInstant('2026-07-04', 15 * 60).toISOString()).toBe('2026-07-04T19:00:00.000Z');   // EDT, UTC-4
    expect(etInstant('2026-01-15', 15 * 60).toISOString()).toBe('2026-01-15T20:00:00.000Z');   // EST, UTC-5
    expect(etInstant('2026-11-02', 7 * 60 + 30).toISOString()).toBe('2026-11-02T12:30:00.000Z'); // the day after the clocks go back
    expect(etInstant('2026-03-09', 22 * 60 + 30).toISOString()).toBe('2026-03-10T02:30:00.000Z'); // the day after they go forward
  });
  it('plans a drop two to four days out, in waking hours, from the pool, never the same item twice in a row', () => {
    const after = new Date('2026-10-12T16:00:00Z');
    const day = (d: Date) => Math.round((d.getTime() - after.getTime()) / 86_400_000);
    for (let i = 0; i < 300; i++) {
      const p = planDrop(after, createRng(`plan${i}`), POOL, 'c');
      expect(POOL).toContain(p.itemKey);
      expect(p.itemKey).not.toBe('c');
      expect(day(p.startsAt)).toBeGreaterThanOrEqual(1);
      expect(day(p.startsAt)).toBeLessThanOrEqual(5);
      const m = etMinutes(p.startsAt);
      expect(m).toBeGreaterThanOrEqual(7 * 60); expect(m).toBeLessThanOrEqual(22 * 60 + 30);
    }
  });
  it('the first drop comes sooner and is repeatable for a seed', () => {
    const after = new Date('2026-10-12T16:00:00Z');
    for (let i = 0; i < 100; i++) {
      const p = planDrop(after, createRng(`first${i}`), POOL, null, true);
      expect(p.startsAt.getTime() - after.getTime()).toBeLessThan(3 * 86_400_000);
    }
    expect(planDrop(after, createRng('x'), POOL).startsAt.toISOString()).toBe(planDrop(after, createRng('x'), POOL).startsAt.toISOString());
  });
  it('leans toward after school and lunch', () => {
    const rng = createRng('mix');
    const minutes = Array.from({ length: 4000 }, () => dropMinute(rng));
    const share = (a: number, b: number) => minutes.filter((m) => m >= a && m <= b).length / minutes.length;
    expect(share(15 * 60, 21 * 60)).toBeGreaterThan(0.5);
    expect(share(11 * 60, 14 * 60 + 30)).toBeGreaterThan(0.2);
    expect(Math.min(...minutes)).toBeGreaterThanOrEqual(7 * 60);
  });
  it('knows when a drop is soon, live or over, and counts the seconds left', () => {
    const d = { startsAt: new Date('2026-10-12T20:00:00Z'), endsAt: new Date(Date.parse('2026-10-12T20:00:00Z') + DROP_WINDOW_MS) };
    expect(dropPhase(d, new Date('2026-10-12T19:59:59Z'))).toBe('soon');
    expect(dropPhase(d, new Date('2026-10-12T20:00:00Z'))).toBe('live');
    expect(dropPhase(d, new Date('2026-10-12T20:09:59Z'))).toBe('live');
    expect(dropPhase(d, new Date('2026-10-12T20:10:00Z'))).toBe('over');
    expect(secondsLeft(d, new Date('2026-10-12T20:00:00Z'))).toBe(600);
    expect(secondsLeft(d, new Date('2026-10-12T20:09:59.400Z'))).toBe(1);
    expect(secondsLeft(d, new Date('2026-10-12T21:00:00Z'))).toBe(0);
    expect(clock(600)).toBe('10:00'); expect(clock(65)).toBe('1:05'); expect(clock(0)).toBe('0:00');
  });
});
