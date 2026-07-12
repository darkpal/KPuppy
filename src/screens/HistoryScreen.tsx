import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import { getHistory, clearHistoryForItem, HistoryItem } from '../api/kinopub'
import { MovieCard } from '../components/MovieCard'
import { VirtualGrid } from '../components/VirtualGrid'
import { LoadingState } from '../components/LoadingSpinner'
import { useKeyboardNavigation, useGridLayout, createGridNavigationHandlers } from '../hooks'
import { useI18n } from '../i18n'
import '../styles/category.css'

interface HistoryScreenProps {
  onSelectItem: (itemId: number) => void
  onNavigateToMenu: () => void
  isActive: boolean
}

type HistorySection = 'series' | 'movies'

const SERIES_TYPES = ['serial', 'docuserial', 'tvshow']

export function HistoryScreen({ onSelectItem, onNavigateToMenu, isActive }: HistoryScreenProps) {
  const { t } = useI18n()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<HistorySection>('series')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const seriesItems = useMemo(() => items.filter(item => SERIES_TYPES.includes(item.type)), [items])
  const movieItems = useMemo(() => items.filter(item => !SERIES_TYPES.includes(item.type)), [items])

  const { itemsPerRow: seriesPerRow, cardWidth: seriesCardWidth } = useGridLayout('.history-series-grid', 240, [seriesItems.length])
  const { itemsPerRow: moviesPerRow, cardWidth: moviesCardWidth } = useGridLayout('.history-movies-grid', 240, [movieItems.length])

  useEffect(() => {
    async function loadHistory() {
      setLoading(true)
      try {
        const data = await getHistory()
        setItems(data)
        setActiveSection(data.some(item => SERIES_TYPES.includes(item.type)) ? 'series' : 'movies')
        setFocusedIndex(0)
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load history:', err)
      } finally {
        setLoading(false)
      }
    }
    loadHistory()
  }, [])

  const activeItems = activeSection === 'series' ? seriesItems : movieItems
  const activePerRow = activeSection === 'series' ? seriesPerRow : moviesPerRow

  const handleClearItem = useCallback(async () => {
    if (actionLoading) return
    const item = activeItems[focusedIndex]
    if (!item) return
    setActionLoading(true)
    try {
      await clearHistoryForItem(item.id)
      setItems(prev => prev.filter(i => i.id !== item.id))
      setFocusedIndex(prev => Math.max(0, Math.min(prev, activeItems.length - 2)))
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to clear history item:', err)
    } finally {
      setActionLoading(false)
    }
  }, [activeItems, focusedIndex, actionLoading])

  const handlers = useMemo(() => ({
    ...createGridNavigationHandlers({
      itemCount: activeItems.length,
      itemsPerRow: activePerRow,
      focusedIndex,
      setFocusedIndex,
      onSelect: (index) => {
        const item = activeItems[index]
        if (item) {
          onSelectItem(item.id)
        }
      },
      onLeftEdge: onNavigateToMenu,
      onTopEdge: activeSection === 'movies' && seriesItems.length > 0
        ? () => {
            const col = focusedIndex % moviesPerRow
            const lastRowStart = Math.floor((seriesItems.length - 1) / seriesPerRow) * seriesPerRow
            setActiveSection('series')
            setFocusedIndex(Math.min(lastRowStart + col, seriesItems.length - 1))
          }
        : undefined,
      onBottomEdge: activeSection === 'series' && movieItems.length > 0
        ? () => {
            const col = focusedIndex % seriesPerRow
            setActiveSection('movies')
            setFocusedIndex(Math.min(col, movieItems.length - 1))
          }
        : undefined
    }),
    onRed: handleClearItem
  }), [activeItems, activeSection, seriesItems.length, movieItems.length, focusedIndex, onNavigateToMenu, onSelectItem, activePerRow, seriesPerRow, moviesPerRow, handleClearItem])

  useKeyboardNavigation(handlers, isActive && !loading)

  const renderSeriesItem = useCallback((item: HistoryItem, _index: number, focused: boolean) => (
    <MovieCard
      movie={item}
      focused={focused}
      onSelect={() => onSelectItem(item.id)}
      episodeInfo={item.episodeInfo}
    />
  ), [onSelectItem])

  const renderMovieItem = useCallback((item: HistoryItem, _index: number, focused: boolean) => (
    <MovieCard
      movie={item}
      focused={focused}
      onSelect={() => onSelectItem(item.id)}
    />
  ), [onSelectItem])

  if (loading) {
    return (
      <div class="category-screen">
        <h1 class="category-title">{t.menuHistory}</h1>
        <LoadingState />
      </div>
    )
  }

  return (
    <div class="category-screen" ref={containerRef}>
      <h1 class="category-title">{t.menuHistory}</h1>
      {seriesItems.length > 0 && (
        <>
          <h2 class="history-section-title">{t.categorySeries}</h2>
          <VirtualGrid
            items={seriesItems}
            focusedIndex={activeSection === 'series' ? focusedIndex : -1}
            itemsPerRow={seriesPerRow}
            renderItem={renderSeriesItem}
            getItemKey={(item) => `${item.id}-${item.watchedAt}`}
            containerClass="category-grid history-series-grid"
            cardWidth={seriesCardWidth}
          />
        </>
      )}
      {movieItems.length > 0 && (
        <>
          <h2 class="history-section-title">{t.categoryMovies}</h2>
          <VirtualGrid
            items={movieItems}
            focusedIndex={activeSection === 'movies' ? focusedIndex : -1}
            itemsPerRow={moviesPerRow}
            renderItem={renderMovieItem}
            getItemKey={(item) => `${item.id}-${item.watchedAt}`}
            containerClass="category-grid history-movies-grid"
            cardWidth={moviesCardWidth}
          />
        </>
      )}
      {items.length === 0 && (
        <div class="category-empty">{t.errorNoItems}</div>
      )}
    </div>
  )
}
