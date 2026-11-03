import "server-only";
import { unstable_cache } from "next/cache";

/**
 * Wraps a data-fetching function with Next.js unstable_cache so that:
 *  - The first visit after a cold start returns cached data instantly.
 *  - Subsequent requests within `revalidate` seconds serve stale data
 *    immediately and revalidate in the background (stale-while-revalidate).
 *  - Each user gets their own cache bucket (keyed by userId) so no data
 *    ever leaks between accounts.
 *
 * @param fn       The async data fetcher to cache.
 * @param userId   The authenticated user's UUID — scopes the cache entry.
 * @param key      A short, stable string identifying this data type
 *                 (e.g. "home", "calendar", "churches").
 * @param tags     Optional cache tags for targeted revalidation via
 *                 revalidateTag() in Server Actions.
 * @param revalidate Seconds before a background revalidation is triggered.
 *                   Default 30 — fresh enough for a church calendar.
 */
export function cachedFetch<T>(
  fn: () => Promise<T>,
  userId: string,
  key: string,
  tags: string[] = [],
  revalidate = 30
): Promise<T> {
  return unstable_cache(fn, [`west-mis:${key}:${userId}`], {
    tags: [`west-mis:${key}:${userId}`, ...tags],
    revalidate,
  })();
}
