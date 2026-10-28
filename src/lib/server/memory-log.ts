import { readFileSync } from 'node:fs';

const mb = (n: number) => Math.round(n / 1_048_576);

/**
 * Reads "Key:  123 kB" (/proc/meminfo, kilobytes) and "key 123" (a cgroup's memory.stat, bytes) into bytes by key.
 * Anything else on a line is ignored, so a runtime that words these files differently gives fewer keys, not an error.
 */
export function parseKeyed(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Za-z_()]+):?\s+(\d+)(\s*kB)?\s*$/);
    if (m) out[m[1]] = Number(m[2]) * (m[3] ? 1024 : 1);
  }
  return out;
}

/** What the machine says it is using: the number a host bills by can include page cache and kernel memory that a process's resident size leaves out. */
export function systemFields(meminfo: Record<string, number>, cgroupCurrent: number | null, cgroupStat: Record<string, number>): string {
  const parts: string[] = [];
  const put = (label: string, bytes: number | undefined) => { if (bytes !== undefined && Number.isFinite(bytes)) parts.push(`${label}=${mb(bytes)}MB`); };
  if (meminfo.MemTotal !== undefined && meminfo.MemFree !== undefined) put('used', meminfo.MemTotal - meminfo.MemFree);
  put('anon', meminfo.AnonPages);
  put('cached', meminfo.Cached);
  put('shmem', meminfo.Shmem);
  put('mapped', meminfo.Mapped);
  put('slab', meminfo.Slab);
  if (cgroupCurrent !== null) put('cg', cgroupCurrent);
  put('cg-anon', cgroupStat.anon ?? cgroupStat.rss);
  put('cg-file', cgroupStat.file ?? cgroupStat.cache);
  put('cg-shmem', cgroupStat.shmem);
  return parts.join(' ');
}

const readText = (path: string): string | null => { try { return readFileSync(path, 'utf8'); } catch { return null; } };

function systemLine(): string {
  const meminfo = parseKeyed(readText('/proc/meminfo') ?? '');
  const v2 = readText('/sys/fs/cgroup/memory.current');
  const v1 = v2 === null ? readText('/sys/fs/cgroup/memory/memory.usage_in_bytes') : null;
  const current = Number((v2 ?? v1 ?? '').trim());
  const stat = parseKeyed(readText(v2 !== null ? '/sys/fs/cgroup/memory.stat' : '/sys/fs/cgroup/memory/memory.stat') ?? '');
  return systemFields(meminfo, (v2 ?? v1) !== null && Number.isFinite(current) ? current : null, stat);
}

/**
 * One line every ten minutes saying where the process's memory sits, so the Railway memory bill can be read against it:
 * the JS heap, buffers outside it (images, sockets), the highest the process has been, and what the machine reports
 * (the part of the bill the process does not own). Numbers only. A first line comes thirty seconds after boot.
 */
export function startMemoryLog(name: string, everyMs = 10 * 60_000) {
  const line = () => {
    const m = process.memoryUsage();
    const peak = process.resourceUsage().maxRSS * 1024;
    console.log(`[mem] ${name} rss=${mb(m.rss)}MB peak=${mb(peak)}MB heap=${mb(m.heapUsed)}/${mb(m.heapTotal)}MB external=${mb(m.external)}MB buffers=${mb(m.arrayBuffers)}MB sys ${systemLine()}`.trimEnd());
  };
  setTimeout(line, 30_000).unref();
  setInterval(line, everyMs).unref();
}
