import { MovieItem } from '../api/kinopub'
import { useI18n } from '../i18n'
import { MovieCard } from './MovieCard'

interface SimilarItemsProps {
  items: MovieItem[]
  focusedIndex: number
  isFocused: boolean
  cardWidth?: number
  onHoverItem?: (index: number) => void
  onSelectItem: (id: number, preview?: MovieItem) => void
}

export function SimilarItems({
  items,
  focusedIndex,
  isFocused,
  cardWidth,
  onHoverItem,
  onSelectItem
}: SimilarItemsProps) {
  const { t } = useI18n()

  if (items.length === 0) return null

  return (
    <div class={`item-similar ${isFocused ? 'active' : ''}`}>
      <h3 class="item-similar-title">{t.similar}</h3>
      <div
        class="item-similar-grid"
        style={cardWidth ? { '--card-width': `${cardWidth}px` } as Record<string, string> : undefined}
      >
        {items.map((similar, idx) => (
          <div key={similar.id} data-similar-index={idx}>
            <MovieCard
              movie={similar}
              focused={isFocused && focusedIndex === idx}
              onHover={() => onHoverItem?.(idx)}
              onSelect={() => onSelectItem(similar.id, similar)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
