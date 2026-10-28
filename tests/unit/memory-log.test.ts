import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cgroupFields, folderSize, parseKeyed, sizeField } from '@/lib/server/memory-log';

describe('memory log', () => {
  it('reads a cgroup memory.stat (bytes) and ignores lines that are not numbers', () => {
    const k = parseKeyed('anon 471859200\nfile 943718400\nshmem 1048576\nnot a number line\n');
    expect(k).toEqual({ anon: 471859200, file: 943718400, shmem: 1048576 });
  });

  it('reads /proc/meminfo style lines (kilobytes) into bytes', () => {
    const k = parseKeyed('MemTotal:       16477352 kB\nActive(anon):         64 kB\nHugePages_Total:       0\n');
    expect(k.MemTotal).toBe(16477352 * 1024);
    expect(k['Active(anon)']).toBe(64 * 1024);
    expect(k.HugePages_Total).toBe(0);
  });

  it('says what the container counts beside the process, and leaves out what it cannot read', () => {
    const stat = parseKeyed('anon 471859200\nfile 943718400\ninactive_file 524288000\nfile_mapped 62914560\nfile_dirty 1048576\nshmem 0\nslab 20971520\nkernel 26214400\npagetables 4194304\nsock 1048576\n');
    expect(cgroupFields(1_600_000_000, stat)).toBe('cg=1526MB cg-anon=450MB cg-file=900MB cg-inactive=500MB cg-mapped=60MB cg-dirty=1MB cg-shmem=0MB cg-slab=20MB cg-kernel=25MB cg-pt=4MB cg-sock=1MB');
    expect(cgroupFields(null, {})).toBe('');
  });

  it('falls back to the older cgroup names', () => {
    expect(cgroupFields(null, parseKeyed('rss 104857600\ncache 209715200\nmapped_file 10485760\n'))).toBe('cg-anon=100MB cg-file=200MB cg-mapped=10MB');
  });

  it('adds up the files under a folder, and says 0 for a folder that is not there', () => {
    const root = mkdtempSync(join(tmpdir(), 'memlog-'));
    try {
      mkdirSync(join(root, 'a/b'), { recursive: true });
      writeFileSync(join(root, 'one.txt'), Buffer.alloc(1_048_576));
      writeFileSync(join(root, 'a/two.txt'), Buffer.alloc(2_097_152));
      writeFileSync(join(root, 'a/b/three.txt'), Buffer.alloc(10));
      expect(folderSize(root)).toEqual({ bytes: 1_048_576 + 2_097_152 + 10, files: 3 });
      expect(sizeField('pages', folderSize(root))).toBe('pages=3MB/3f');
      expect(folderSize(join(root, 'missing'))).toEqual({ bytes: 0, files: 0 });
      expect(folderSize(root, 2).files).toBeLessThanOrEqual(3);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
