import { useRef } from 'preact/hooks'
import { Episode } from '../api/kinopub'
import { EpisodeCard } from './EpisodeCard'
import { useScrollToFocused } from '../hooks'

interface EpisodeRowProps {
  title: string
  episodes: Episode[]
  seriesPoster?: string
  focusedIndex: number | null
  /** Focus only (mouse hover / d-pad position). */
  onSelect?: (index: number) => void
  /** Open/play episode (click / Enter). Defaults to onSelect. */
  onActivate?: (index: number) => void
}

export function EpisodeRow({ title, episodes, seriesPoster, focusedIndex, onSelect, onActivate }: EpisodeRowProps) {
  const gridRef = useRef<HTMLDivElement>(null)

  useScrollToFocused({
    containerRef: gridRef,
    focusedIndex,
    itemSelector: ':scope > *',
    direction: 'horizontal',
    itemCount: episodes.length
  })

  if (episodes.length === 0) {
    return null
  }

  return (
    <div class="episode-row">
      <h2 class="row-title">{title}</h2>
      <div class="episode-grid" ref={gridRef}>
        {episodes.map((episode, index) => (
          <EpisodeCard
            key={episode.id}
            episode={episode}
            seriesPoster={seriesPoster}
            focused={index === focusedIndex}
            onHover={() => onSelect?.(index)}
            onSelect={() => (onActivate || onSelect)?.(index)}
          />
        ))}
      </div>
    </div>
  )
}
