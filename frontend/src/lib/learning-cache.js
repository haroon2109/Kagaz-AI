/**
 * Kagaz AI — offline-first learning cache.
 *
 * Caches the data a teacher needs during a lesson (classes, groups, today's
 * action, competency framework, printable assessment templates) in
 * localStorage, so the core interface stays usable on low-bandwidth
 * connections. Cached data is read-only; writes always require connectivity.
 */

const KEY_PREFIX = "kagaz_cache_";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // one week

function makeKey(key) {
  return `${KEY_PREFIX}${key}`;
}

export function cacheSet(key, data) {
  if (typeof window === "undefined") return;
  try {
    const payload = { data, cachedAt: Date.now() };
    localStorage.setItem(makeKey(key), JSON.stringify(payload));
  } catch {
    // Storage full / private mode — caching is best-effort only.
  }
}

export function cacheGet(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(makeKey(key));
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (Date.now() - payload.cachedAt > MAX_AGE_MS) {
      localStorage.removeItem(makeKey(key));
      return null;
    }
    return payload.data;
  } catch {
    return null;
  }
}

export function cacheRemove(key) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(makeKey(key));
  } catch {}
}

/**
 * Fetch-through cache: returns fresh data when online, falls back to the
 * cached copy when the network fails. Sets `fromCache` on the caller via
 * the returned { data, fromCache, error } triple.
 */
export async function cachedFetch(fetcher, key) {
  try {
    const data = await fetcher();
    cacheSet(key, data);
    return { data, fromCache: false, error: null };
  } catch (err) {
    const cached = cacheGet(key);
    if (cached !== null) {
      return { data: cached, fromCache: true, error: null };
    }
    return { data: null, fromCache: false, error: err };
  }
}
