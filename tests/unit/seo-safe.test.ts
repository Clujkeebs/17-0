import { afterEach, describe, expect, it, vi } from 'vitest';
import { orAtBuild, safe } from '@/lib/seo/safe';

const failing = () => Promise.reject(new Error('connection refused'));
const never = () => new Promise<string>(() => undefined);

describe('safe (pages that are cached for a while)', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it('returns the data when the call works', async () => {
    expect(await safe(async () => 'rows', 'empty')).toBe('rows');
    expect(await orAtBuild(Promise.resolve('rows'), 'empty')).toBe('rows');
  });

  it('gives a page its empty state during the build, when there is no database', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await safe(failing, 'empty')).toBe('empty');
    expect(await safe(never, 'empty', 10)).toBe('empty');
    expect(await orAtBuild(failing(), 'empty')).toBe('empty');
  });

  it('throws on a running server, so a failed regeneration keeps the last good page instead of caching an empty one', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-server');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(safe(failing, 'empty')).rejects.toThrow('connection refused');
    await expect(safe(never, 'empty', 10)).rejects.toThrow('timed out after 10ms');
    await expect(orAtBuild(failing(), 'empty')).rejects.toThrow('connection refused');
  });
});
