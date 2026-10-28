/** True while `next build` renders pages. The Docker build has no database, so pages get their empty state then. */
export const isBuildPhase = () => process.env.NEXT_PHASE === 'phase-production-build';

/**
 * Run a data call with a timeout and a fallback. Public SEO pages must render (with an empty state) when Postgres or
 * Redis is unreachable during `next build`. Once the server is running a failure is thrown instead: Next keeps serving the
 * last page it built when a regeneration throws, but it caches whatever a page returns, so one slow or failed query
 * would put an empty page in front of everyone, and of Google's crawler, for the whole revalidate window (a day).
 */
export async function safe<T>(fn: () => Promise<T>, fallback: T, ms = 8000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((resolve, reject) => {
        timer = setTimeout(() => (isBuildPhase() ? resolve(fallback) : reject(new Error(`timed out after ${ms}ms`))), ms);
      }),
    ]);
  } catch (e) {
    console.error('[seo:safe]', e instanceof Error ? e.message : e);
    if (isBuildPhase()) return fallback;
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** `.catch(() => fallback)` for a page that is cached for a while: the fallback applies only while `next build` has no database. */
export const orAtBuild = <T>(p: Promise<T>, fallback: T): Promise<T> =>
  p.catch((e) => {
    if (isBuildPhase()) return fallback;
    throw e;
  });
