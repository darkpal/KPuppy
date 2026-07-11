import { describe, it, expect, beforeEach } from 'vitest'
import { saveTokens, getTokens, clearTokens, isAuthenticated, Tokens } from '../src/storage'

describe('storage', () => {
  beforeEach(() => {
    localStorage.removeItem('kpuppy_tokens')
    localStorage.removeItem('kpuppy_settings')
  })

  describe('getLocalSettings defaults', () => {
    it('defaults to builtin player, auto quality, continue watching on', async () => {
      const { getLocalSettings } = await import('../src/storage')
      expect(getLocalSettings()).toEqual({
        defaultQuality: 'auto',
        playerType: 'builtin',
        showContinueWatching: true
      })
    })
  })

  describe('saveTokens', () => {
    it('stores tokens to localStorage', () => {
      const tokens: Tokens = {
        access: 'test-access-token',
        refresh: 'test-refresh-token',
        expiresAt: Date.now() + 3600000
      }

      saveTokens(tokens)

      const stored = localStorage.getItem('kpuppy_tokens')
      expect(stored).not.toBeNull()
      expect(JSON.parse(stored!)).toEqual(tokens)
    })
  })

  describe('getTokens', () => {
    it('retrieves stored tokens', () => {
      const tokens: Tokens = {
        access: 'test-access-token',
        refresh: 'test-refresh-token',
        expiresAt: Date.now() + 3600000
      }

      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))

      const result = getTokens()
      expect(result).toEqual(tokens)
    })

    it('returns null when storage is empty', () => {
      const result = getTokens()
      expect(result).toBeNull()
    })

    it('returns null for invalid JSON', () => {
      localStorage.setItem('kpuppy_tokens', 'invalid-json')

      const result = getTokens()
      expect(result).toBeNull()
    })
  })

  describe('clearTokens', () => {
    it('removes all tokens from storage', () => {
      const tokens: Tokens = {
        access: 'test-access-token',
        refresh: 'test-refresh-token',
        expiresAt: Date.now() + 3600000
      }

      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
      clearTokens()

      expect(localStorage.getItem('kpuppy_tokens')).toBeNull()
    })
  })

  describe('isAuthenticated', () => {
    it('returns false when no tokens exist', () => {
      expect(isAuthenticated()).toBe(false)
    })

    it('returns false when token is expired', () => {
      const tokens: Tokens = {
        access: 'test-access-token',
        refresh: 'test-refresh-token',
        expiresAt: Date.now() - 1000
      }

      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))

      expect(isAuthenticated()).toBe(false)
    })

    it('returns true when token is valid', () => {
      const tokens: Tokens = {
        access: 'test-access-token',
        refresh: 'test-refresh-token',
        expiresAt: Date.now() + 3600000
      }

      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))

      expect(isAuthenticated()).toBe(true)
    })
  })
})
