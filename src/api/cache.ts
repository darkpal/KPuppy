interface CacheEntry<T> {
  data: T
  timestamp: number
}

const cache = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

const DEFAULT_TTL = 5 * 60 * 1000

export function getCached<T>(key: string, ttl: number = DEFAULT_TTL): T | null {
  const entry = cache.get(key)
  if (!entry) return null

  if (Date.now() - entry.timestamp > ttl) {
    cache.delete(key)
    return null
  }

  return entry.data as T
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  })
}

export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear()
    inflight.clear()
    return
  }

  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key)
    }
  }
  for (const key of inflight.keys()) {
    if (key.includes(pattern)) {
      inflight.delete(key)
    }
  }
}

export function createCacheKey(...parts: (string | number | undefined)[]): string {
  return parts.filter(p => p !== undefined).join(':')
}

/** Share one in-flight Promise per key so parallel callers do not duplicate network. */
export function withInflight<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key)
  if (existing) return existing as Promise<T>

  const promise = fetchFn().finally(() => {
    inflight.delete(key)
  })
  inflight.set(key, promise)
  return promise
}

export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = getCached<T>(key, ttl)
  if (cached) return cached

  return withInflight(key, async () => {
    const result = await fetchFn()
    setCache(key, result)
    return result
  })
}
