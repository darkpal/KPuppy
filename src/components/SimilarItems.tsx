import { MovieItem } from '../api/kinopub'
import { useI18n } from '../i18n'

interface SimilarItemsProps {
  items: MovieItem[]
  focusedIndex: number
  isFocused: boolean
  onHoverItem?: (index: number) => void
  onSelectItem: (id: number) => void
}

export function SimilarItems({ items, focusedIndex, isFocused, onHoverItem, onSelectItem }: SimilarItemsProps) {
  const { t } = useI18n()

  if (items.length === 0) return null

  return (
    <div class={`item-similar ${isFocused ? 'active' : ''}`}>
      <h3 class="item-similar-title">{t.similar}</h3>
      <div class="item-similar-row">
        {items.slice(0, 8).map((similar, idx) => (
          <div
            key={similar.id}
            class={`item-similar-card ${isFocused && focusedIndex === idx ? 'focused' : ''}`}
            onMouseEnter={() => onHoverItem?.(idx)}
            onClick={() => onSelectItem(similar.id)}
          >
            {similar.posters?.medium || similar.posters?.small ? (
              <img
                src={similar.posters.medium || similar.posters.small}
                alt={similar.title}
                class="item-similar-poster"
              />
            ) : (
              <div class="item-similar-poster item-similar-poster-placeholder" />
            )}
            <div class="item-similar-info">
              <span class="item-similar-name">{similar.title}</span>
              <span class="item-similar-year">{similar.year}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
