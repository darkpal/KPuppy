import { MovieItem } from '../api/kinopub'

export type MovieSortMode = 'default' | 'rating' | 'year'

/** Best available rating for sorting (KP → IMDb → % → internal). */
export function movieSortRating(item: MovieItem): number {
  if (item.kinopoiskRating > 0) return item.kinopoiskRating
  if (item.imdbRating > 0) return item.imdbRating
  if (item.ratingPercentage > 0) return item.ratingPercentage / 10
  return item.rating || 0
}

/** Client-side sort for search / collection grids. `default` keeps API order. */
export function sortMovieItems(items: MovieItem[], mode: MovieSortMode): MovieItem[] {
  if (mode === 'default' || items.length < 2) return items

  const next = items.slice()
  if (mode === 'rating') {
    next.sort((a, b) => movieSortRating(b) - movieSortRating(a) || b.year - a.year)
    return next
  }

  // year — newest first
  next.sort((a, b) => b.year - a.year || movieSortRating(b) - movieSortRating(a))
  return next
}
