import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sha256 } from 'js-sha256'

describe('hashUsername', () => {
  const DEFAULT_SALT = 'kpuppy-user-identity-v1'

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('hash format', () => {
    it('returns a 64-character hex string', async () => {
      const { hashUsername } = await import('../../src/utils/hash')
      const result = hashUsername('testuser')

      expect(result).toHaveLength(64)
      expect(result).toMatch(/^[a-f0-9]{64}$/)
    })

    it('returns lowercase hex characters only', async () => {
      const { hashUsername } = await import('../../src/utils/hash')
      const result = hashUsername('AnyUser123')

      expect(result).toBe(result.toLowerCase())
      expect(result).toMatch(/^[a-f0-9]+$/)
    })
  })

  describe('deterministic behavior', () => {
    it('returns same hash for same username', async () => {
      const { hashUsername } = await import('../../src/utils/hash')

      const hash1 = hashUsername('consistent_user')
      const hash2 = hashUsername('consistent_user')

      expect(hash1).toBe(hash2)
    })

    it('returns different hashes for different usernames', async () => {
      const { hashUsername } = await import('../../src/utils/hash')

      const hash1 = hashUsername('user_one')
      const hash2 = hashUsername('user_two')

      expect(hash1).not.toBe(hash2)
    })

    it('is case-sensitive', async () => {
      const { hashUsername } = await import('../../src/utils/hash')

      const hashLower = hashUsername('username')
      const hashUpper = hashUsername('USERNAME')
      const hashMixed = hashUsername('UserName')

      expect(hashLower).not.toBe(hashUpper)
      expect(hashLower).not.toBe(hashMixed)
      expect(hashUpper).not.toBe(hashMixed)
    })
  })

  describe('salt handling', () => {
    it('uses default salt when env variable not set', async () => {
      vi.stubEnv('VITE_IDENTITY_SALT', '')
      const { hashUsername } = await import('../../src/utils/hash')

      const result = hashUsername('testuser')
      const expected = sha256(DEFAULT_SALT + 'testuser')

      expect(result).toBe(expected)
    })

    it('uses custom salt from env variable', async () => {
      const customSalt = 'custom-salt-v2'
      vi.stubEnv('VITE_IDENTITY_SALT', customSalt)
      const { hashUsername } = await import('../../src/utils/hash')

      const result = hashUsername('testuser')
      const expected = sha256(customSalt + 'testuser')

      expect(result).toBe(expected)
    })

    it('produces different hash with different salt', async () => {
      vi.stubEnv('VITE_IDENTITY_SALT', 'salt-one')
      const { hashUsername: hash1 } = await import('../../src/utils/hash')
      const result1 = hash1('testuser')

      vi.resetModules()
      vi.stubEnv('VITE_IDENTITY_SALT', 'salt-two')
      const { hashUsername: hash2 } = await import('../../src/utils/hash')
      const result2 = hash2('testuser')

      expect(result1).not.toBe(result2)
    })
  })

  describe('edge cases', () => {
    it('handles empty username', async () => {
      const { hashUsername } = await import('../../src/utils/hash')
      const result = hashUsername('')

      expect(result).toHaveLength(64)
      expect(result).toBe(sha256(DEFAULT_SALT))
    })

    it('handles username with special characters', async () => {
      const { hashUsername } = await import('../../src/utils/hash')
      const result = hashUsername('user@domain.com!#$%')

      expect(result).toHaveLength(64)
      expect(result).toMatch(/^[a-f0-9]{64}$/)
    })

    it('handles username with unicode characters', async () => {
      const { hashUsername } = await import('../../src/utils/hash')
      const result = hashUsername('пользователь')

      expect(result).toHaveLength(64)
      expect(result).toMatch(/^[a-f0-9]{64}$/)
    })

    it('handles username with emojis', async () => {
      const { hashUsername } = await import('../../src/utils/hash')
      const result = hashUsername('user🎉test')

      expect(result).toHaveLength(64)
      expect(result).toMatch(/^[a-f0-9]{64}$/)
    })

    it('handles very long username', async () => {
      const { hashUsername } = await import('../../src/utils/hash')
      const longUsername = 'a'.repeat(1000)
      const result = hashUsername(longUsername)

      expect(result).toHaveLength(64)
      expect(result).toMatch(/^[a-f0-9]{64}$/)
    })

    it('handles whitespace in username', async () => {
      const { hashUsername } = await import('../../src/utils/hash')

      const withSpaces = hashUsername('user name')
      const withTabs = hashUsername('user\tname')
      const trimmed = hashUsername('username')

      expect(withSpaces).not.toBe(trimmed)
      expect(withTabs).not.toBe(trimmed)
      expect(withSpaces).not.toBe(withTabs)
    })
  })

  describe('known hash values', () => {
    it('produces expected hash for known input', async () => {
      const { hashUsername } = await import('../../src/utils/hash')
      const result = hashUsername('testuser')

      const expected = sha256(DEFAULT_SALT + 'testuser')
      expect(result).toBe(expected)
      expect(result).toBe('000f7ef94eafa138c49cb888fae8c8cef1e66c7d276324acf1ed4423eed4b363')
    })
  })
})
