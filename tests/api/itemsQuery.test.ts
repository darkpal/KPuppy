import { describe, it, expect } from 'vitest'
import { buildItemsQuery, monthAgoUnix } from '../../src/api/kinopub'

describe('buildItemsQuery', () => {
  it('encodes conditions array keys like ValeraGin', () => {
    expect(
      buildItemsQuery({
        type: 'movie',
        sort: 'views-',
        page: 0,
        perpage: 20,
        conditions: ['created>=1710000000']
      })
    ).toBe(
      'type=movie&sort=views-&page=0&perpage=20&conditions%5B0%5D=created%3E%3D1710000000'
    )
  })
})

describe('monthAgoUnix', () => {
  it('subtracts one calendar month', () => {
    // 15 Mar 2026 → 15 Feb 2026
    const now = Date.UTC(2026, 2, 15, 12, 0, 0)
    const result = monthAgoUnix(now)
    const d = new Date(result * 1000)
    expect(d.getUTCFullYear()).toBe(2026)
    expect(d.getUTCMonth()).toBe(1)
    expect(d.getUTCDate()).toBe(15)
  })
})
