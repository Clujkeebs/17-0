import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memoAsync, memoByKey } from '@/lib/memo';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('memoAsync', () => {
  it('runs one load for callers that arrive together', async () => {
    let calls = 0;
    const get = memoAsync(1000, async () => { calls++; await Promise.resolve(); return { n: calls }; });
    const [a, b, c] = await Promise.all([get(), get(), get()]);
    expect(calls).toBe(1);
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it('shares a slow load with everyone who asks while it runs', async () => {
    let calls = 0;
    let release!: (n: number) => void;
    const get = memoAsync(1000, () => new Promise<number>((resolve) => { calls++; release = resolve; }));
    const first = get();
    vi.advanceTimersByTime(500);
    const second = get();
    release(7);
    expect(await first).toBe(7);
    expect(await second).toBe(7);
    expect(calls).toBe(1);
  });

  it('keeps the value until the time is up, then loads again', async () => {
    let calls = 0;
    const get = memoAsync(1000, async () => ++calls);
    expect(await get()).toBe(1);
    vi.advanceTimersByTime(999);
    expect(await get()).toBe(1);
    vi.advanceTimersByTime(2);
    expect(await get()).toBe(2);
    expect(calls).toBe(2);
  });

  it('counts the time from when the load finished', async () => {
    let calls = 0;
    let release!: () => void;
    const get = memoAsync(1000, () => new Promise<number>((resolve) => { release = () => resolve(++calls); }));
    const first = get();
    vi.advanceTimersByTime(900);
    release();
    expect(await first).toBe(1);
    vi.advanceTimersByTime(900);
    expect(await get()).toBe(1);
  });

  it('does not keep a failed load', async () => {
    let calls = 0;
    const get = memoAsync(1000, async () => { calls++; if (calls === 1) throw new Error('db down'); return calls; });
    const both = await Promise.allSettled([get(), get()]);
    expect(both.map((r) => r.status)).toEqual(['rejected', 'rejected']);
    expect(calls).toBe(1);
    expect(await get()).toBe(2);
    expect(await get()).toBe(2);
  });
});

describe('memoByKey', () => {
  it('keeps one value per key and loads each key once', async () => {
    const seen: string[] = [];
    const get = memoByKey(1000, async (k: string) => { seen.push(k); return k.toUpperCase(); });
    expect(await Promise.all([get('a'), get('b'), get('a')])).toEqual(['A', 'B', 'A']);
    expect([...seen].sort()).toEqual(['a', 'b']);
    vi.advanceTimersByTime(1001);
    expect(await get('a')).toBe('A');
    expect(seen.length).toBe(3);
  });
});
