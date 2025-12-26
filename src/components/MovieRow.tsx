import { useRef, useEffect } from 'preact/hooks'
import { MovieItem } from '../api/kinopub'
import { MovieCard } from './MovieCard'

interface EpisodeInfo {
  season: number
  episode: number
  title: string
  thumbnail?: string
}

interface MovieWithEpisode extends MovieItem {
  episodeInfo?: EpisodeInfo
}

interface MovieRowProps {
  title: string
  movies: MovieWithEpisode[]
  loading?: boolean
  focusedIndex: number | null
  onSelect?: (index: number) => void
}

export function MovieRow({ title, movies, loading, focusedIndex, onSelect }: MovieRowProps) {
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (gridRef.current && focusedIndex !== null && movies.length > 0) {
      const card = gridRef.current.children[focusedIndex] as HTMLElement
      if (card) {
        const container = gridRef.current
        const cardRect = card.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()

        const cardCenter = cardRect.left + cardRect.width / 2
        const containerCenter = containerRect.left + containerRect.width / 2

        if (cardCenter < containerRect.left + 200 || cardCenter > containerRect.right - 200) {
          const scrollOffset = cardCenter - containerCenter
          container.scrollLeft += scrollOffset
        }
      }
    }
  }, [focusedIndex, movies.length])

  if (loading) {
    return (
      <div class="movie-row">
        <h2 class="row-title">{title}</h2>
        <div class="row-loading">
          <div class="row-spinner" />
        </div>
      </div>
    )
  }

  if (movies.length === 0) {
    return null
  }

  return (
    <div class="movie-row">
      <h2 class="row-title">{title}</h2>
      <div class="movie-grid" ref={gridRef}>
        {movies.map((movie, index) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            focused={index === focusedIndex}
            onSelect={() => onSelect?.(index)}
            episodeInfo={movie.episodeInfo}
          />
        ))}
      </div>
    </div>
  )
}
