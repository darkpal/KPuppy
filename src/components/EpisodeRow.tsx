import { useRef, useEffect } from 'preact/hooks'
import { Episode } from '../api/kinopub'
import { EpisodeCard } from './EpisodeCard'

interface EpisodeRowProps {
  title: string
  episodes: Episode[]
  seriesPoster?: string
  focusedIndex: number | null
  onSelect?: (index: number) => void
}

export function EpisodeRow({ title, episodes, seriesPoster, focusedIndex, onSelect }: EpisodeRowProps) {
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (gridRef.current && focusedIndex !== null && episodes.length > 0) {
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
  }, [focusedIndex, episodes.length])

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
            onSelect={() => onSelect?.(index)}
          />
        ))}
      </div>
    </div>
  )
}
