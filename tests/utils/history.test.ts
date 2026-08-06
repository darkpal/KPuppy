import { describe, it, expect } from 'vitest'
import { dedupeHistoryByTitle, splitHistoryItems } from '../../src/utils/history'
import type { HistoryItem } from '../../src/api/kinopub'

function item(partial: Partial<HistoryItem> & Pick<HistoryItem, 'id' | 'type' | 'title'>): HistoryItem {
  return {
    year: 2020,
    plot: '',
    posters: { small: '', medium: '', big: '' },
    rating: 0,
    imdbRating: 0,
    kinopoiskRating: 0,
    ratingPercentage: 0,
    quality: 0,
    views: 0,
    watchedAt: 1,
    ...partial,
  }
}

describe('dedupeHistoryByTitle', () => {
  it('keeps the first (newest) entry per id', () => {
    const result = dedupeHistoryByTitle([
      item({ id: 1, type: 'serial', title: 'Silo', watchedAt: 3, episodeInfo: { season: 2, episode: 10, title: '' } }),
      item({ id: 1, type: 'serial', title: 'Silo', watchedAt: 2, episodeInfo: { season: 2, episode: 9, title: '' } }),
      item({ id: 2, type: 'movie', title: 'Click', watchedAt: 1 }),
    ])
    expect(result.map(i => `${i.id}:${i.episodeInfo?.episode ?? 'm'}`)).toEqual(['1:10', '2:m'])
  })
})

describe('splitHistoryItems', () => {
  it('splits series and movies and dedupes series', () => {
    const { series, movies } = splitHistoryItems([
      item({ id: 9, type: 'serial', title: 'Friends' }),
      item({ id: 1, type: 'serial', title: 'Silo', episodeInfo: { season: 2, episode: 10, title: '' } }),
      item({ id: 1, type: 'serial', title: 'Silo', episodeInfo: { season: 2, episode: 9, title: '' } }),
      item({ id: 5, type: 'movie', title: 'Click' }),
      item({ id: 6, type: 'documovie', title: 'Doc' }),
    ])
    expect(series.map(i => i.id)).toEqual([9, 1])
    expect(movies.map(i => i.id)).toEqual([5, 6])
  })
})
