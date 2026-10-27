/**
 * One line every ten minutes saying where the process's memory sits, so the Railway memory bill can be read against it:
 * the JS heap, buffers outside it (images, sockets) and the rest. Numbers only.
 */
export function startMemoryLog(name: string, everyMs = 10 * 60_000) {
  const mb = (n: number) => Math.round(n / 1_048_576);
  const timer = setInterval(() => {
    const m = process.memoryUsage();
    console.log(`[mem] ${name} rss=${mb(m.rss)}MB heap=${mb(m.heapUsed)}/${mb(m.heapTotal)}MB external=${mb(m.external)}MB buffers=${mb(m.arrayBuffers)}MB`);
  }, everyMs);
  timer.unref();
}
