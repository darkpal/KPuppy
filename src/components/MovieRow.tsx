import { useRef } from 'preact/hooks'
import { MovieItem } from '../api/kinopub'
import { MovieCard } from './MovieCard'
import { useScrollToFocused, useWheelScroll } from '../hooks'

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
  /** Auto-scroll row to focused card (keyboard/D-pad only; not pointer hover). */
  scrollToFocused?: boolean
  seeAllLabel?: string
  seeAllFocused?: boolean
  onTitleActivate?: () => void
  onSeeAll?: () => void
  onSelect?: (index: number) => void
  onActivate?: (index: number) => void
}

export function MovieRow({
  title,
  movies,
  loading,
  focusedIndex,
  scrollToFocused = true,
  seeAllLabel,
  seeAllFocused = false,
  onTitleActivate,
  onSeeAll,
  onSelect,
  onActivate
}: MovieRowProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const focusSlot = seeAllFocused ? movies.length : focusedIndex

  useScrollToFocused({
    containerRef: gridRef,
    focusedIndex: focusSlot,
    itemSelector: ':scope > *',
    direction: 'horizontal',
    itemCount: movies.length + (seeAllLabel ? 1 : 0),
    enabled: scrollToFocused
  })

  useWheelScroll({
    containerRef: gridRef,
    direction: 'horizontal'
  })

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
      <h2
        class={`row-title${onTitleActivate ? ' row-title-action' : ''}`}
        onClick={onTitleActivate}
      >
        {title}
        {onTitleActivate && <span class="row-title-chevron" aria-hidden="true">›</span>}
      </h2>
      <div class="movie-grid" ref={gridRef}>
        {movies.map((movie, index) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            focused={index === focusedIndex}
            onHover={() => onSelect?.(index)}
            onSelect={() => (onActivate || onSelect)?.(index)}
            episodeInfo={movie.episodeInfo}
          />
        ))}
        {seeAllLabel && (
          <button
            type="button"
            class={`row-see-all${seeAllFocused ? ' focused' : ''}`}
            onMouseEnter={() => onSelect?.(movies.length)}
            onClick={() => onSeeAll?.()}
          >
            <span class="row-see-all-label">{seeAllLabel}</span>
          </button>
        )}
      </div>
    </div>
  )
}
