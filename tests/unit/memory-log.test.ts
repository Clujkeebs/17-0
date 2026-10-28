import { describe, expect, it } from 'vitest';
import { parseKeyed, systemFields } from '@/lib/server/memory-log';

describe('memory log', () => {
  it('reads /proc/meminfo lines (kilobytes) into bytes', () => {
    const k = parseKeyed('MemTotal:       16477352 kB\nMemFree:        15491988 kB\nActive(anon):         64 kB\nHugePages_Total:       0\n');
    expect(k.MemTotal).toBe(16477352 * 1024);
    expect(k['Active(anon)']).toBe(64 * 1024);
    expect(k.HugePages_Total).toBe(0);
  });

  it('reads a cgroup memory.stat (bytes)', () => {
    const k = parseKeyed('anon 471859200\nfile 943718400\nshmem 1048576\nnot a number line\n');
    expect(k).toEqual({ anon: 471859200, file: 943718400, shmem: 1048576 });
  });

  it('says what the machine uses beside the process, and leaves out what it cannot read', () => {
    const meminfo = parseKeyed('MemTotal: 8388608 kB\nMemFree: 6291456 kB\nAnonPages: 460800 kB\nCached: 1024000 kB\n');
    expect(systemFields(meminfo, 1_600_000_000, {})).toBe('used=2048MB anon=450MB cached=1000MB cg=1526MB');
    expect(systemFields({}, null, {})).toBe('');
  });

  it('falls back to the older cgroup names', () => {
    expect(systemFields({}, null, parseKeyed('rss 104857600\ncache 209715200\n'))).toBe('cg-anon=100MB cg-file=200MB');
  });
});
