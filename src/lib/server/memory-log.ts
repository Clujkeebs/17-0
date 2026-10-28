import { readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const mb = (n: number) => Math.round(n / 1_048_576);

/**
 * Reads a cgroup's memory.stat ("key 123", bytes) into bytes by key. Anything else on a line is ignored, so a
 * runtime that words the file differently gives fewer keys, not an error.
 */
export function parseKeyed(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Za-z_()]+):?\s+(\d+)(\s*kB)?\s*$/);
    if (m) out[m[1]] = Number(m[2]) * (m[3] ? 1024 : 1);
  }
  return out;
}

/**
 * What the container's own counter says it holds. Railway's graph is this number, and it counts more than the process's
 * resident size: page cache (files read or written), kernel memory and shared memory. v2 names first, then v1's.
 */
export function cgroupFields(current: number | null, stat: Record<string, number>): string {
  const parts: string[] = [];
  const put = (label: string, bytes: number | undefined) => { if (bytes !== undefined && Number.isFinite(bytes)) parts.push(`${label}=${mb(bytes)}MB`); };
  if (current !== null) put('cg', current);
  put('cg-anon', stat.anon ?? stat.rss);
  put('cg-file', stat.file ?? stat.cache);
  put('cg-inactive', stat.inactive_file ?? stat.total_inactive_file);
  put('cg-mapped', stat.file_mapped ?? stat.mapped_file);
  put('cg-dirty', stat.file_dirty ?? stat.dirty);
  put('cg-shmem', stat.shmem);
  put('cg-slab', stat.slab);
  put('cg-kernel', stat.kernel);
  put('cg-pt', stat.pagetables);
  put('cg-sock', stat.sock);
  return parts.join(' ');
}

/** Bytes and file count under a folder, stopping at a cap so a runaway cache cannot stall the log. */
export function folderSize(dir: string, maxFiles = 50_000): { bytes: number; files: number } {
  let bytes = 0, files = 0;
  const stack = [dir];
  while (stack.length && files < maxFiles) {
    const d = stack.pop()!;
    let entries: import('node:fs').Dirent[];
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else { try { bytes += statSync(p).size; files++; } catch { /* gone while reading */ } }
    }
  }
  return { bytes, files };
}

export const sizeField = (label: string, s: { bytes: number; files: number }) => `${label}=${mb(s.bytes)}MB/${s.files}f`;

const readText = (path: string): string | null => { try { return readFileSync(path, 'utf8'); } catch { return null; } };

function cgroupLine(): string {
  const v2 = readText('/sys/fs/cgroup/memory.current');
  const v1 = v2 === null ? readText('/sys/fs/cgroup/memory/memory.usage_in_bytes') : null;
  const current = Number((v2 ?? v1 ?? '').trim());
  const stat = parseKeyed(readText(v2 !== null ? '/sys/fs/cgroup/memory.stat' : '/sys/fs/cgroup/memory/memory.stat') ?? '');
  return cgroupFields((v2 ?? v1) !== null && Number.isFinite(current) ? current : null, stat);
}

/** Files the server writes while it runs (rendered pages, caches, temp files): written files sit in page cache, which the container counts. */
function diskLine(): string {
  const root = process.cwd();
  return ['disk', sizeField('cache', folderSize(join(root, '.next/cache'))), sizeField('pages', folderSize(join(root, '.next/server/app'))), sizeField('tmp', folderSize(tmpdir()))].join(' ');
}

/**
 * One line every ten minutes saying where the process's memory sits, so the Railway memory bill can be read against it:
 * the JS heap, buffers outside it (images, sockets), the highest the process has been, what the container counts beside the
 * process, and the size of what the server writes to disk. Numbers only. A first line comes thirty seconds after boot.
 */
export function startMemoryLog(name: string, everyMs = 10 * 60_000) {
  const line = () => {
    const m = process.memoryUsage();
    const peak = process.resourceUsage().maxRSS * 1024;
    console.log(`[mem] ${name} rss=${mb(m.rss)}MB peak=${mb(peak)}MB heap=${mb(m.heapUsed)}/${mb(m.heapTotal)}MB external=${mb(m.external)}MB buffers=${mb(m.arrayBuffers)}MB ${cgroupLine()} ${diskLine()}`.replace(/\s+/g, ' ').trimEnd());
  };
  setTimeout(line, 30_000).unref();
  setInterval(line, everyMs).unref();
}
