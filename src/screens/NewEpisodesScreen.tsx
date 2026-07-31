import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import {
  getWatching,
  getWatchingSerials,
  enrichMovieItemsMeta,
  WatchingItem,
  MovieItem
} from '../api/kinopub'
import { MovieCard } from '../components/MovieCard'
import { GridScreen } from '../components/GridScreen'
import { useKeyboardNavigation, useGridLayout, createGridNavigationHandlers } from '../hooks'
import { useI18n } from '../i18n'
import { Translations } from '../i18n/translations'
import '../styles/category.css'

interface NewEpisodesScreenProps {
  onSelectItem: (itemId: number) => void
  onNavigateToMenu: () => void
  isActive: boolean
  /**
   * `new` — serials with unread new episodes (`/v1/watching/serials`, new > 0).
   * `watching` — continue-watching movies + serials (`/v1/watching/movies` + serials).
   */
  mode?: 'new' | 'watching'
  titleKey?: keyof Translations
  /** @deprecated use mode="new" | "watching" */
  onlyNew?: boolean
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

export function NewEpisodesScreen({
  onSelectItem,
  onNavigateToMenu,
  isActive,
  mode,
  titleKey = 'menuNewEpisodes',
  onlyNew
}: NewEpisodesScreenProps) {
  const resolvedMode: 'new' | 'watching' = mode ?? (onlyNew === false ? 'watching' : 'new')
  const { t } = useI18n()
  const [items, setItems] = useState<(WatchingItem | MovieItem)[]>([])
  const [cardMeta, setCardMeta] = useState<Map<number, MovieItem>>(new Map())
  const [loading, setLoading] = useState(true)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const { itemsPerRow, cardWidth } = useGridLayout('.category-grid', 240, [items.length])

  useEffect(() => {
    async function loadList() {
      setLoading(true)
      setFocusedIndex(0)
      try {
        if (resolvedMode === 'watching') {
          const data = await getWatching()
          setItems(data)
          setCardMeta(new Map(data.map(item => [item.id, item])))
        } else {
          const data = await getWatchingSerials()
          const list = data
            .filter(item => item.new > 0)
            .sort((a, b) => (b.new || 0) - (a.new || 0))
          setItems(list)
          const enriched = await enrichMovieItemsMeta(list.map(watchingToMovieItem))
          setCardMeta(new Map(enriched.map(item => [item.id, item])))
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load watching list:', err)
      } finally {
        setLoading(false)
      }
    }
    loadList()
  }, [resolvedMode])

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

  const renderItem = useCallback((item: WatchingItem | MovieItem, _index: number, focused: boolean) => {
    const newEpisodes = 'new' in item ? (item.new || 0) : 0
    const badge = resolvedMode === 'new' && newEpisodes > 0
      ? `${newEpisodes} ${t.newEpisodesCount}`
      : undefined
    const meta = cardMeta.get(item.id)
    const movie = meta || ('plot' in item ? item : watchingToMovieItem(item as WatchingItem))
    return (
      <MovieCard
        movie={movie}
        focused={focused}
        onSelect={() => onSelectItem(item.id)}
        badge={badge}
      />
    )
  }, [onSelectItem, t, cardMeta, resolvedMode])

  return (
    <GridScreen
      title={t[titleKey]}
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
