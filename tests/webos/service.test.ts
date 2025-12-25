import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isWebOS, platformBack } from '../../src/webos/service'

describe('webOS service', () => {
  const originalWebOS = window.webOS
  const originalPalmSystem = window.PalmSystem

  beforeEach(() => {
    delete (window as { webOS?: unknown }).webOS
    delete (window as { PalmSystem?: unknown }).PalmSystem
  })

  afterEach(() => {
    if (originalWebOS) window.webOS = originalWebOS
    if (originalPalmSystem) window.PalmSystem = originalPalmSystem
  })

  describe('isWebOS', () => {
    it('returns false when webOS not available', () => {
      expect(isWebOS()).toBe(false)
    })

    it('returns true when webOS is available', () => {
      window.webOS = { service: { request: vi.fn() } } as never
      expect(isWebOS()).toBe(true)
    })
  })

  describe('platformBack', () => {
    it('does nothing when webOS not available', () => {
      expect(() => platformBack()).not.toThrow()
    })

    it('calls webOS.platformBack when available', () => {
      const mockPlatformBack = vi.fn()
      window.webOS = {
        service: { request: vi.fn() },
        platformBack: mockPlatformBack
      } as never
      platformBack()
      expect(mockPlatformBack).toHaveBeenCalled()
    })

    it('falls back to PalmSystem.platformBack', () => {
      const mockPlatformBack = vi.fn()
      window.PalmSystem = { platformBack: mockPlatformBack }
      platformBack()
      expect(mockPlatformBack).toHaveBeenCalled()
    })
  })
})
