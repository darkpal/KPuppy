import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import { getWatchingSerials, enrichMovieItemsMeta, WatchingItem, MovieItem } from '../api/kinopub'
import { MovieCard } from '../components/MovieCard'
import { GridScreen } from '../components/GridScreen'
import { useKeyboardNavigation, useGridLayout, createGridNavigationHandlers } from '../hooks'
import { useI18n } from '../i18n'
import '../styles/category.css'

interface NewEpisodesScreenProps {
  onSelectItem: (itemId: number) => void
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

export function NewEpisodesScreen({ onSelectItem, onNavigateToMenu, isActive }: NewEpisodesScreenProps) {
  const { t } = useI18n()
  const [items, setItems] = useState<WatchingItem[]>([])
  const [cardMeta, setCardMeta] = useState<Map<number, MovieItem>>(new Map())
  const [loading, setLoading] = useState(true)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const { itemsPerRow, cardWidth } = useGridLayout('.category-grid', 240, [items.length])

  useEffect(() => {
    async function loadNewEpisodes() {
      setLoading(true)
      try {
        const data = await getWatchingSerials()
        const withNewEpisodes = data.filter(item => item.new > 0)
        setItems(withNewEpisodes)
        const enriched = await enrichMovieItemsMeta(withNewEpisodes.map(watchingToMovieItem))
        setCardMeta(new Map(enriched.map(item => [item.id, item])))
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load new episodes:', err)
      } finally {
        setLoading(false)
      }
    }
    loadNewEpisodes()
  }, [])

  const handlers = useMemo(() => createGridNavigationHandlers({
    itemCount: items.length,
    itemsPerRow,
    focusedIndex,
    setFocusedIndex,
    onSelect: (index) => {
      const item = items[index]
      if (item) {
        onSelectItem(item.id)
      }
    },
    onLeftEdge: onNavigateToMenu
  }), [items, focusedIndex, onNavigateToMenu, onSelectItem, itemsPerRow])

  useKeyboardNavigation(handlers, isActive && !loading)

  const renderItem = useCallback((item: WatchingItem, _index: number, focused: boolean) => {
    const newEpisodes = item.new || 0
    const badge = newEpisodes > 0
      ? `${newEpisodes} ${t.newEpisodesCount}`
      : undefined
    const meta = cardMeta.get(item.id)
    return (
      <MovieCard
        movie={meta || watchingToMovieItem(item)}
        focused={focused}
        onSelect={() => onSelectItem(item.id)}
        badge={badge}
      />
    )
  }, [onSelectItem, t, cardMeta])

  return (
    <GridScreen
      title={t.menuNewEpisodes}
      loading={loading}
      items={items}
      focusedIndex={focusedIndex}
      itemsPerRow={itemsPerRow}
      renderItem={renderItem}
      getItemKey={(item) => item.id}
      emptyMessage={t.errorNoItems}
      containerRef={containerRef}
      cardWidth={cardWidth}
    />
  )
}
