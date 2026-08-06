import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import { getHistory, clearHistoryForItem, HistoryItem, MovieItem } from '../api/kinopub'
import { MovieCard } from '../components/MovieCard'
import { VirtualGrid } from '../components/VirtualGrid'
import { LoadingState } from '../components/LoadingSpinner'
import { useKeyboardNavigation, useGridLayout, createGridNavigationHandlers } from '../hooks'
import { useI18n } from '../i18n'
import { isHistorySeriesType, splitHistoryItems } from '../utils/history'
import '../styles/category.css'

interface HistoryScreenProps {
  onSelectItem: (itemId: number, preview?: MovieItem) => void
  onNavigateToMenu: () => void
  isActive: boolean
}

type ViewMode = 'hub' | 'series' | 'movies'
type HubFocus = 'series' | 'series-all' | 'movies' | 'movies-all'

const HISTORY_PER_PAGE = 50
const HUB_MAX_PAGES = 4
const PREVIEW_ROWS = 2
/** Wide enough for TV layouts so hub fetch does not restart after measure. */
const HUB_FETCH_TARGET = PREVIEW_ROWS * 8

export function HistoryScreen({ onSelectItem, onNavigateToMenu, isActive }: HistoryScreenProps) {
  const { t } = useI18n()
  const [viewMode, setViewMode] = useState<ViewMode>('hub')
  const [hubItems, setHubItems] = useState<HistoryItem[]>([])
  const [hubApiHasMore, setHubApiHasMore] = useState(false)
  const [listItems, setListItems] = useState<HistoryItem[]>([])
  const [listPage, setListPage] = useState(0)
  const [listHasMore, setListHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hubFocus, setHubFocus] = useState<HubFocus>('series')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)
  const seenIdsRef = useRef<Set<number>>(new Set())

  const { series: hubSeriesAll, movies: hubMoviesAll } = useMemo(
    () => splitHistoryItems(hubItems),
    [hubItems]
  )

  const { itemsPerRow: seriesPerRow, cardWidth: seriesCardWidth } = useGridLayout(
    '.history-series-grid',
    240,
    [hubSeriesAll.length, viewMode]
  )
  const { itemsPerRow: moviesPerRow, cardWidth: moviesCardWidth } = useGridLayout(
    '.history-movies-grid',
    240,
    [hubMoviesAll.length, viewMode]
  )
  const { itemsPerRow: listPerRow, cardWidth: listCardWidth } = useGridLayout(
    viewMode === 'series' ? '.history-series-grid' : '.history-movies-grid',
    240,
    [listItems.length, viewMode]
  )

  const seriesPreviewCap = Math.max(seriesPerRow, 1) * PREVIEW_ROWS
  const moviesPreviewCap = Math.max(moviesPerRow, 1) * PREVIEW_ROWS
  const seriesPreview = hubSeriesAll.slice(0, seriesPreviewCap)
  const moviesPreview = hubMoviesAll.slice(0, moviesPreviewCap)
  const seriesShowAll = hubSeriesAll.length > seriesPreviewCap || hubApiHasMore
  const moviesShowAll = hubMoviesAll.length > moviesPreviewCap || hubApiHasMore

  useEffect(() => {
    let cancelled = false

    async function loadHub() {
      setLoading(true)
      try {
        let page = 1
        let raw: HistoryItem[] = []
        let apiHasMore = false

        while (page <= HUB_MAX_PAGES) {
          const response = await getHistory(page, HISTORY_PER_PAGE)
          if (cancelled) return
          raw = raw.concat(response.items)
          apiHasMore = page < response.pagination.total
          const { series, movies } = splitHistoryItems(raw)
          const seriesEnough = series.length >= HUB_FETCH_TARGET || !apiHasMore
          const moviesEnough = movies.length >= HUB_FETCH_TARGET || !apiHasMore
          if ((seriesEnough && moviesEnough) || !apiHasMore) break
          page += 1
        }

        if (cancelled) return
        setHubItems(raw)
        setHubApiHasMore(apiHasMore)
        const { series } = splitHistoryItems(raw)
        setHubFocus(series.length > 0 ? 'series' : 'movies')
        setFocusedIndex(0)
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load history:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadHub()
    return () => {
      cancelled = true
    }
  }, [])

  const openFullList = useCallback(async (mode: 'series' | 'movies') => {
    setViewMode(mode)
    setLoading(true)
    setListItems([])
    setListPage(0)
    setListHasMore(false)
    setFocusedIndex(0)
    seenIdsRef.current = new Set()
    loadingMoreRef.current = false

    try {
      let page = 1
      let collected: HistoryItem[] = []
      let hasMore = true
      const target = Math.max(listPerRow, 1) * 4

      while (hasMore && collected.length < target) {
        const response = await getHistory(page, HISTORY_PER_PAGE)
        hasMore = page < response.pagination.total
        for (const item of response.items) {
          if (mode === 'series' ? !isHistorySeriesType(item.type) : isHistorySeriesType(item.type)) continue
          if (seenIdsRef.current.has(item.id)) continue
          seenIdsRef.current.add(item.id)
          collected.push(item)
        }
        page += 1
        if (!hasMore) break
      }

      setListItems(collected)
      setListPage(page - 1)
      setListHasMore(hasMore)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to open history list:', err)
    } finally {
      setLoading(false)
    }
  }, [listPerRow])

  const loadMoreList = useCallback(async () => {
    if (viewMode === 'hub' || loadingMoreRef.current || !listHasMore) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      let page = listPage + 1
      let collected = [...listItems]
      let hasMore = true
      const before = collected.length
      while (hasMore && collected.length === before) {
        const response = await getHistory(page, HISTORY_PER_PAGE)
        hasMore = page < response.pagination.total
        for (const item of response.items) {
          if (viewMode === 'series' ? !isHistorySeriesType(item.type) : isHistorySeriesType(item.type)) continue
          if (seenIdsRef.current.has(item.id)) continue
          seenIdsRef.current.add(item.id)
          collected.push(item)
        }
        page += 1
        if (!hasMore) break
      }
      setListItems(collected)
      setListPage(page - 1)
      setListHasMore(hasMore)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load more history:', err)
      setListHasMore(false)
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [viewMode, listHasMore, listPage, listItems])

  const backToHub = useCallback(() => {
    const returnFocus: HubFocus = viewMode === 'movies' ? 'movies' : 'series'
    setViewMode('hub')
    setListItems([])
    setFocusedIndex(0)
    setHubFocus(returnFocus)
  }, [viewMode])

  const handleClearItem = useCallback(async () => {
    if (actionLoading) return
    if (viewMode === 'hub' && (hubFocus === 'series-all' || hubFocus === 'movies-all')) return

    const item = viewMode === 'hub'
      ? (hubFocus === 'series' ? seriesPreview[focusedIndex] : moviesPreview[focusedIndex])
      : listItems[focusedIndex]
    if (!item) return

    setActionLoading(true)
    try {
      await clearHistoryForItem(item.id)
      setHubItems(prev => prev.filter(i => i.id !== item.id))
      setListItems(prev => prev.filter(i => i.id !== item.id))
      seenIdsRef.current.delete(item.id)
      setFocusedIndex(prev => Math.max(0, prev - 1))
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to clear history item:', err)
    } finally {
      setActionLoading(false)
    }
  }, [
    actionLoading,
    viewMode,
    hubFocus,
    focusedIndex,
    seriesPreview,
    moviesPreview,
    listItems
  ])

  const hubHandlers = useMemo(() => {
    if (hubFocus === 'series-all') {
      return {
        onLeft: onNavigateToMenu,
        onDown: () => {
          if (seriesPreview.length > 0) {
            setHubFocus('series')
            setFocusedIndex(0)
          } else if (moviesShowAll) {
            setHubFocus('movies-all')
          } else if (moviesPreview.length > 0) {
            setHubFocus('movies')
            setFocusedIndex(0)
          }
        },
        onEnter: () => { void openFullList('series') },
        onBack: onNavigateToMenu,
      }
    }

    if (hubFocus === 'movies-all') {
      return {
        onLeft: onNavigateToMenu,
        onUp: () => {
          if (seriesPreview.length > 0) {
            const col = 0
            const lastRowStart = Math.floor((seriesPreview.length - 1) / seriesPerRow) * seriesPerRow
            setHubFocus('series')
            setFocusedIndex(Math.min(lastRowStart + col, seriesPreview.length - 1))
          } else if (seriesShowAll) {
            setHubFocus('series-all')
          }
        },
        onDown: () => {
          if (moviesPreview.length > 0) {
            setHubFocus('movies')
            setFocusedIndex(0)
          }
        },
        onEnter: () => { void openFullList('movies') },
        onBack: onNavigateToMenu,
      }
    }

    const items = hubFocus === 'series' ? seriesPreview : moviesPreview
    const perRow = hubFocus === 'series' ? seriesPerRow : moviesPerRow

    return {
      ...createGridNavigationHandlers({
        itemCount: items.length,
        itemsPerRow: perRow,
        focusedIndex,
        setFocusedIndex,
        onSelect: (index) => {
          const item = items[index]
          if (item) onSelectItem(item.id, item)
        },
        onLeftEdge: onNavigateToMenu,
        onTopEdge: () => {
          if (hubFocus === 'series') {
            if (seriesShowAll) setHubFocus('series-all')
            return
          }
          if (moviesShowAll) {
            setHubFocus('movies-all')
            return
          }
          if (seriesPreview.length > 0) {
            const col = focusedIndex % moviesPerRow
            const lastRowStart = Math.floor((seriesPreview.length - 1) / seriesPerRow) * seriesPerRow
            setHubFocus('series')
            setFocusedIndex(Math.min(lastRowStart + col, seriesPreview.length - 1))
          }
        },
        onBottomEdge: () => {
          if (hubFocus !== 'series') return
          if (moviesShowAll && moviesPreview.length === 0) {
            setHubFocus('movies-all')
            return
          }
          if (moviesPreview.length > 0) {
            const col = focusedIndex % seriesPerRow
            setHubFocus('movies')
            setFocusedIndex(Math.min(col, moviesPreview.length - 1))
          }
        }
      }),
      onRed: handleClearItem,
      onBack: onNavigateToMenu,
    }
  }, [
    hubFocus,
    seriesPreview,
    moviesPreview,
    seriesPerRow,
    moviesPerRow,
    focusedIndex,
    seriesShowAll,
    moviesShowAll,
    onNavigateToMenu,
    onSelectItem,
    openFullList,
    handleClearItem
  ])

  const listHandlers = useMemo(() => ({
    ...createGridNavigationHandlers({
      itemCount: listItems.length,
      itemsPerRow: listPerRow,
      focusedIndex,
      setFocusedIndex,
      onSelect: (index) => {
        const item = listItems[index]
        if (item) onSelectItem(item.id, item)
      },
      onLeftEdge: backToHub,
      onBottomEdge: () => {
        if (listHasMore) void loadMoreList()
      }
    }),
    onRed: handleClearItem,
    onBack: backToHub,
  }), [
    listItems,
    listPerRow,
    focusedIndex,
    onSelectItem,
    backToHub,
    listHasMore,
    loadMoreList,
    handleClearItem
  ])

  useKeyboardNavigation(
    viewMode === 'hub' ? hubHandlers : listHandlers,
    isActive && !loading
  )

  useEffect(() => {
    if (viewMode === 'hub' || !listHasMore || loadingMore) return
    const remaining = listItems.length - 1 - focusedIndex
    if (remaining <= listPerRow * 2) void loadMoreList()
  }, [viewMode, listHasMore, loadingMore, listItems.length, focusedIndex, listPerRow, loadMoreList])

  const renderSeriesItem = useCallback((item: HistoryItem, index: number, focused: boolean) => (
    <MovieCard
      movie={item}
      focused={focused}
      onHover={() => {
        if (viewMode === 'hub') setHubFocus('series')
        setFocusedIndex(index)
      }}
      onSelect={() => onSelectItem(item.id, item)}
      episodeInfo={item.episodeInfo}
    />
  ), [onSelectItem, viewMode])

  const renderMovieItem = useCallback((item: HistoryItem, index: number, focused: boolean) => (
    <MovieCard
      movie={item}
      focused={focused}
      onHover={() => {
        if (viewMode === 'hub') setHubFocus('movies')
        setFocusedIndex(index)
      }}
      onSelect={() => onSelectItem(item.id, item)}
    />
  ), [onSelectItem, viewMode])

  if (loading) {
    return (
      <div class="category-screen">
        <h1 class="category-title">
          {viewMode === 'hub'
            ? t.menuHistory
            : `${t.menuHistory} · ${viewMode === 'series' ? t.categorySeries : t.categoryMovies}`}
        </h1>
        <LoadingState />
      </div>
    )
  }

  if (viewMode !== 'hub') {
    return (
      <div class="category-screen" ref={containerRef}>
        <h1 class="category-title">
          {t.menuHistory} · {viewMode === 'series' ? t.categorySeries : t.categoryMovies}
        </h1>
        <VirtualGrid
          items={listItems}
          focusedIndex={focusedIndex}
          itemsPerRow={listPerRow}
          renderItem={viewMode === 'series' ? renderSeriesItem : renderMovieItem}
          getItemKey={(item) => item.id}
          containerClass={`category-grid ${viewMode === 'series' ? 'history-series-grid' : 'history-movies-grid'}`}
          cardWidth={listCardWidth}
          emptyMessage={t.errorNoItems}
        />
        {loadingMore && <div class="category-loading-more">{t.loadingMore}</div>}
      </div>
    )
  }

  return (
    <div class="category-screen" ref={containerRef}>
      <h1 class="category-title">{t.menuHistory}</h1>

      {seriesPreview.length > 0 && (
        <section class="history-section">
          <div class="history-section-header">
            <h2 class="history-section-title">{t.categorySeries}</h2>
            {seriesShowAll && (
              <button
                type="button"
                class={`history-see-all ${hubFocus === 'series-all' ? 'focused' : ''}`}
                onMouseEnter={() => setHubFocus('series-all')}
                onClick={() => { void openFullList('series') }}
              >
                {t.seeAll}
              </button>
            )}
          </div>
          <VirtualGrid
            items={seriesPreview}
            focusedIndex={hubFocus === 'series' ? focusedIndex : -1}
            itemsPerRow={seriesPerRow}
            renderItem={renderSeriesItem}
            getItemKey={(item) => item.id}
            containerClass="category-grid history-series-grid"
            cardWidth={seriesCardWidth}
          />
        </section>
      )}

      {moviesPreview.length > 0 && (
        <section class="history-section">
          <div class="history-section-header">
            <h2 class="history-section-title">{t.categoryMovies}</h2>
            {moviesShowAll && (
              <button
                type="button"
                class={`history-see-all ${hubFocus === 'movies-all' ? 'focused' : ''}`}
                onMouseEnter={() => setHubFocus('movies-all')}
                onClick={() => { void openFullList('movies') }}
              >
                {t.seeAll}
              </button>
            )}
          </div>
          <VirtualGrid
            items={moviesPreview}
            focusedIndex={hubFocus === 'movies' ? focusedIndex : -1}
            itemsPerRow={moviesPerRow}
            renderItem={renderMovieItem}
            getItemKey={(item) => item.id}
            containerClass="category-grid history-movies-grid"
            cardWidth={moviesCardWidth}
          />
        </section>
      )}

      {hubItems.length === 0 && (
        <div class="category-empty">{t.errorNoItems}</div>
      )}
    </div>
  )
}
