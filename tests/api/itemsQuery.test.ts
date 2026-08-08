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

  it('encodes rating conditions, quality and finished', () => {
    expect(
      buildItemsQuery({
        type: 'serial',
        quality: '4k',
        finished: 1,
        conditions: ['kinopoisk_rating>=7', 'imdb_rating>=6']
      })
    ).toBe(
      'type=serial&quality=4k&finished=1&conditions%5B0%5D=kinopoisk_rating%3E%3D7&conditions%5B1%5D=imdb_rating%3E%3D6'
    )
  })
})

describe('monthAgoUnix', () => {
  it('subtracts one calendar month and floors to local midnight', () => {
    const now = new Date(2026, 2, 15, 12, 30, 45).getTime()
    const result = monthAgoUnix(now)
    const d = new Date(result * 1000)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(1)
    expect(d.getDate()).toBe(15)
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getSeconds()).toBe(0)
  })
})
