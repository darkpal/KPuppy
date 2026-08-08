import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import { getWatchingSerials, enrichMovieItemsMeta, WatchingItem, MovieItem } from '../api/kinopub'
import { MovieCard } from '../components/MovieCard'
import { GridScreen } from '../components/GridScreen'
import { useKeyboardNavigation, useGridLayout, createGridNavigationHandlers } from '../hooks'
import { useI18n } from '../i18n'
import '../styles/category.css'

interface NewEpisodesScreenProps {
  onSelectItem: (itemId: number, preview?: MovieItem) => void
  onNavigateToMenu: () => void
  isActive: boolean
}

function watchingToMovieItem(item: WatchingItem): MovieItem {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    posters: item.posters,
    year: item.year,
    plot: '',
    rating: 0,
    imdbRating: 0,
    kinopoiskRating: 0,
    ratingPercentage: 0,
    quality: 0,
    views: 0
  }
}

/** «Я смотрю» — serials with new/unwatched episodes from /v1/watching/serials */
export function NewEpisodesScreen({ onSelectItem, onNavigateToMenu, isActive }: NewEpisodesScreenProps) {
  const { t } = useI18n()
  const [items, setItems] = useState<WatchingItem[]>([])
  const [cardMeta, setCardMeta] = useState<Map<number, MovieItem>>(new Map())
  const [loading, setLoading] = useState(true)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [scrollWithFocus, setScrollWithFocus] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const { itemsPerRow, cardWidth } = useGridLayout('.category-grid', 240, [items.length])

  useEffect(() => {
    let cancelled = false
    async function loadWatching() {
      setLoading(true)
      try {
        const data = await getWatchingSerials()
        if (cancelled) return
        const list = data.filter(item => item.new > 0)
        setItems(list)
        void enrichMovieItemsMeta(list.map(watchingToMovieItem), 3)
          .then(enriched => {
            if (!cancelled) setCardMeta(new Map(enriched.map(item => [item.id, item])))
          })
          .catch(err => {
            if (import.meta.env.DEV) console.error('Failed to enrich watching list:', err)
          })
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load watching list:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadWatching()
    return () => {
      cancelled = true
    }
  }, [])

  const handlers = useMemo(() => createGridNavigationHandlers({
    itemCount: items.length,
    itemsPerRow,
    focusedIndex,
    setFocusedIndex: (index) => {
      setScrollWithFocus(true)
      setFocusedIndex(index)
    },
    onSelect: (index) => {
      const item = items[index]
      if (item) {
        onSelectItem(item.id, cardMeta.get(item.id) || watchingToMovieItem(item))
      }
    },
    onLeftEdge: onNavigateToMenu
  }), [items, focusedIndex, onNavigateToMenu, onSelectItem, itemsPerRow, cardMeta])

  useKeyboardNavigation(handlers, isActive && !loading)

  const renderItem = useCallback((item: WatchingItem, index: number, focused: boolean) => {
    const newEpisodes = item.new || 0
    const badge = newEpisodes > 0
      ? `${newEpisodes} ${t.newEpisodesCount}`
      : undefined
    const meta = cardMeta.get(item.id)
    const movie = meta || watchingToMovieItem(item)
    return (
      <MovieCard
        movie={movie}
        focused={focused}
        onHover={() => {
          setScrollWithFocus(false)
          setFocusedIndex(index)
        }}
        onSelect={() => onSelectItem(item.id, movie)}
        badge={badge}
      />
    )
  }, [onSelectItem, t, cardMeta])

  return (
    <GridScreen
      title={t.menuWatching}
      loading={loading}
      items={items}
      focusedIndex={focusedIndex}
      itemsPerRow={itemsPerRow}
      scrollToFocused={scrollWithFocus}
      renderItem={renderItem}
      getItemKey={(item) => item.id}
      emptyMessage={t.errorNoItems}
      containerRef={containerRef}
      cardWidth={cardWidth}
    />
  )
}
