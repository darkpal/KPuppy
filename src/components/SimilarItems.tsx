import { useRef } from 'preact/hooks'
import { MovieItem } from '../api/kinopub'
import { useI18n } from '../i18n'
import { useScrollToFocused, useWheelScroll } from '../hooks'
import { MovieCard } from './MovieCard'

interface SimilarItemsProps {
  items: MovieItem[]
  focusedIndex: number
  isFocused: boolean
  /** Keyboard/D-pad: scroll row to focused card. Pointer hover should pass false. */
  scrollToFocused?: boolean
  onHoverItem?: (index: number) => void
  onSelectItem: (id: number, preview?: MovieItem) => void
}

export function SimilarItems({
  items,
  focusedIndex,
  isFocused,
  scrollToFocused = true,
  onHoverItem,
  onSelectItem
}: SimilarItemsProps) {
  const { t } = useI18n()
  const rowRef = useRef<HTMLDivElement>(null)
  const visible = items.slice(0, 8)

  useScrollToFocused({
    containerRef: rowRef,
    focusedIndex: isFocused ? focusedIndex : null,
    itemSelector: ':scope > *',
    direction: 'horizontal',
    center: false,
    itemCount: visible.length,
    enabled: isFocused && scrollToFocused
  })

  useWheelScroll({
    containerRef: rowRef,
    direction: 'horizontal'
  })

  if (visible.length === 0) return null

  return (
    <div class={`item-similar ${isFocused ? 'active' : ''}`}>
      <h3 class="item-similar-title">{t.similar}</h3>
      <div class="item-similar-row" ref={rowRef}>
        {visible.map((similar, idx) => (
          <MovieCard
            key={similar.id}
            movie={similar}
            focused={isFocused && focusedIndex === idx}
            onHover={() => onHoverItem?.(idx)}
            onSelect={() => onSelectItem(similar.id, similar)}
          />
        ))}
      </div>
    </div>
  )
}
