/**
 * Run a data call with a timeout and a fallback. Public SEO pages must render (with an empty
 * state) when Postgres or Redis is unreachable, for example during `next build` without a DB.
 */
export async function safe<T>(fn: () => Promise<T>, fallback: T, ms = 8000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((resolve) => { timer = setTimeout(() => resolve(fallback), ms); }),
    ]);
  } catch (e) {
    console.error('[seo:safe]', e instanceof Error ? e.message : e);
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
