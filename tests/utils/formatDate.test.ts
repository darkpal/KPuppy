import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatUnixDate } from '../../src/utils/formatDate'

describe('formatUnixDate', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns Unknown for missing timestamp', () => {
    expect(formatUnixDate(0, 'ru')).toBe('Unknown')
  })

  it('formats with toLocaleDateString when available', () => {
    const ts = Date.UTC(2026, 5, 15) / 1000
    const spy = vi.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('15 июня 2026 г.')
    expect(formatUnixDate(ts, 'ru')).toBe('15 июня 2026 г.')
    expect(spy).toHaveBeenCalledWith(
      'ru-RU',
      expect.objectContaining({ timeZone: 'UTC', month: 'long' })
    )
  })

  it('falls back to numeric date when Intl throws timezone error', () => {
    vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(() => {
      throw new RangeError('Unsupported time zone specified undefined')
    })
    const ts = Date.UTC(2026, 5, 15) / 1000 // June 15, 2026 UTC
    expect(formatUnixDate(ts, 'ru')).toBe('15.06.2026')
    expect(formatUnixDate(ts, 'en')).toBe('06/15/2026')
  })
})
