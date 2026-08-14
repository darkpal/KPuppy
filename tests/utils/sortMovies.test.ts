import { describe, it, expect } from 'vitest'
import { MovieItem } from '../../src/api/kinopub'
import { sortMovieItems } from '../../src/utils/sortMovies'

function item(partial: Partial<MovieItem> & Pick<MovieItem, 'id' | 'title' | 'year'>): MovieItem {
  return {
    type: 'movie',
    posters: { small: '', medium: '', big: '', wide: '' },
    rating: 0,
    ratingPercentage: 0,
    kinopoiskRating: 0,
    imdbRating: 0,
    quality: 0,
    plot: '',
    views: 0,
    ...partial
  }
}

describe('sortMovieItems', () => {
  const items = [
    item({ id: 1, title: 'A', year: 2010, kinopoiskRating: 9, imdbRating: 7 }),
    item({ id: 2, title: 'B', year: 2020, kinopoiskRating: 5, imdbRating: 5 }),
    item({ id: 3, title: 'C', year: 2015, imdbRating: 8.5 })
  ]

  it('keeps API order for default', () => {
    expect(sortMovieItems(items, 'default').map(i => i.id)).toEqual([1, 2, 3])
  })

  it('sorts by IMDb rating descending (not Kinopoisk)', () => {
    expect(sortMovieItems(items, 'rating').map(i => i.id)).toEqual([3, 1, 2])
  })

  it('sorts by year descending', () => {
    expect(sortMovieItems(items, 'year').map(i => i.id)).toEqual([2, 3, 1])
  })
})
