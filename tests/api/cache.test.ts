import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { getCached, setCache, invalidateCache, createCacheKey } from '../../src/api/cache'

describe('cache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    invalidateCache()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getCached/setCache', () => {
    it('returns null for missing key', () => {
      expect(getCached('missing')).toBeNull()
    })

    it('stores and retrieves value', () => {
      setCache('test', { foo: 'bar' })
      expect(getCached('test')).toEqual({ foo: 'bar' })
    })

    it('returns null after TTL expires', () => {
      setCache('test', { foo: 'bar' })

      vi.advanceTimersByTime(4 * 60 * 1000)
      expect(getCached('test')).toEqual({ foo: 'bar' })

      vi.advanceTimersByTime(2 * 60 * 1000)
      expect(getCached('test')).toBeNull()
    })

    it('uses custom TTL', () => {
      setCache('test', { foo: 'bar' })

      vi.advanceTimersByTime(30 * 1000)
      expect(getCached('test', 60 * 1000)).toEqual({ foo: 'bar' })

      vi.advanceTimersByTime(31 * 1000)
      expect(getCached('test', 60 * 1000)).toBeNull()
    })
  })

  describe('invalidateCache', () => {
    it('clears all cache when called without pattern', () => {
      setCache('key1', 'value1')
      setCache('key2', 'value2')

      invalidateCache()

      expect(getCached('key1')).toBeNull()
      expect(getCached('key2')).toBeNull()
    })

    it('clears only matching keys when called with pattern', () => {
      setCache('items:movie:1', 'movie1')
      setCache('items:movie:2', 'movie2')
      setCache('user', 'userData')

      invalidateCache('items')

      expect(getCached('items:movie:1')).toBeNull()
      expect(getCached('items:movie:2')).toBeNull()
      expect(getCached('user')).toEqual('userData')
    })
  })

  describe('createCacheKey', () => {
    it('joins parts with colon', () => {
      expect(createCacheKey('items', 'movie', 1)).toBe('items:movie:1')
    })

    it('filters out undefined values', () => {
      expect(createCacheKey('items', undefined, 'movie', undefined)).toBe('items:movie')
    })

    it('handles single part', () => {
      expect(createCacheKey('user')).toBe('user')
    })
  })
})
