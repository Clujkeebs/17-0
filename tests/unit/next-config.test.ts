import { describe, expect, it } from 'vitest';
import config from '../../next.config';

// A page Next makes on demand is written to .next/server/app as seven or eight files, and the container counts them as memory.
// A crawler walking /compare pairs added a gigabyte that way. These two settings keep those pages in a capped in-memory cache.
describe('next.config page cache', () => {
  it('does not write pages made on demand to disk', () => {
    expect(config.experimental?.isrFlushToDisk).toBe(false);
  });

  it('keeps the in-memory page cache on and capped', () => {
    // 0 turns the cache off, and then every request renders again.
    expect(config.cacheMaxMemorySize).toBeGreaterThan(0);
    expect(config.cacheMaxMemorySize).toBeLessThanOrEqual(128 * 1024 * 1024);
  });
});
