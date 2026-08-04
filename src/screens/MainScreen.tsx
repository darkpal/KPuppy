import { useState, useEffect, useRef, useMemo, useCallback } from 'preact/hooks'
import { getItems, getFreshItems, getWatching, monthAgoUnix, MovieItem, ItemsParams } from '../api/kinopub'
import { getLocalSettings } from '../storage'
import { MovieRow } from '../components/MovieRow'
import { useKeyboardNavigation, useScrollToFocused, useWheelScroll } from '../hooks'
import { LoadingState } from '../components/LoadingSpinner'
import { useI18n } from '../i18n'
import { Translations } from '../i18n/translations'
import { CategoryFilters, DEFAULT_CATEGORY_FILTERS } from './CategoryScreen'
import '../styles/main.css'

export interface HomeShelfTarget {
  menuId: string
  filters?: CategoryFilters | null
}

interface MainScreenProps {
  onBack: () => void
  onSelectItem: (itemId: number, preview?: MovieItem) => void
  onNavigateToMenu: () => void
  onOpenShelf?: (target: HomeShelfTarget) => void
  isActive: boolean
  initialFocusRow?: number
  initialFocusCol?: number
  onFocusChange?: (row: number, col: number) => void
}

type FeedSource = 'items' | 'fresh'

interface ContentRow {
  id: string
  titleKey: keyof Translations
  params?: ItemsParams
  feed?: FeedSource
  isWatching?: boolean
  shelfTarget?: HomeShelfTarget
  items: MovieItem[]
  loading: boolean
  loadingMore: boolean
  page: number
  hasMore: boolean
}

interface RowConfig {
  id: string
  titleKey: keyof Translations
  params?: ItemsParams
  feed?: FeedSource
  isWatching?: boolean
  shelfTarget?: HomeShelfTarget
}

const HOME_PER_PAGE = 20

function createHomeRowConfigs(): RowConfig[] {
  const lastMonth = monthAgoUnix()

  return [
    { id: 'watching', titleKey: 'categoryContinueWatching', isWatching: true, shelfTarget: { menuId: 'watching' } },
    {
      id: 'popular-movies',
      titleKey: 'popularMovies',
      params: {
        type: 'movie',
        sort: 'views-',
        page: 0,
        perpage: HOME_PER_PAGE,
        conditions: [`created>=${lastMonth}`]
      },
      shelfTarget: {
        menuId: 'movies',
        filters: { ...DEFAULT_CATEGORY_FILTERS, sort: 'views-' }
      }
    },
    {
      id: 'fresh-movies',
      titleKey: 'freshMovies',
      feed: 'fresh',
      params: { type: 'movie', page: 0, perpage: HOME_PER_PAGE },
      shelfTarget: {
        menuId: 'movies',
        filters: { ...DEFAULT_CATEGORY_FILTERS, sort: 'created-' }
      }
    },
    {
      id: 'popular-series',
      titleKey: 'popularSeries',
      params: { type: 'serial', sort: 'watchers-', page: 0, perpage: HOME_PER_PAGE },
      shelfTarget: {
        menuId: 'series',
        filters: { ...DEFAULT_CATEGORY_FILTERS, sort: 'views-' }
      }
    },
    {
      id: 'fresh-series',
      titleKey: 'freshSeries',
      feed: 'fresh',
      params: { type: 'serial', page: 0, perpage: HOME_PER_PAGE },
      shelfTarget: {
        menuId: 'series',
        filters: { ...DEFAULT_CATEGORY_FILTERS, sort: 'created-' }
      }
    },
    {
      id: 'new-concerts',
      titleKey: 'newConcerts',
      params: { type: 'concert', sort: 'created-', page: 0, perpage: HOME_PER_PAGE },
      shelfTarget: { menuId: 'concerts', filters: { ...DEFAULT_CATEGORY_FILTERS } }
    },
    {
      id: 'new-docs',
      titleKey: 'newDocs',
      params: { type: 'documovie', sort: 'created-', page: 0, perpage: HOME_PER_PAGE },
      shelfTarget: { menuId: 'docs', filters: { ...DEFAULT_CATEGORY_FILTERS } }
    },
    {
      id: 'new-docuseries',
      titleKey: 'newDocuseries',
      params: { type: 'docuserial', sort: 'created-', page: 0, perpage: HOME_PER_PAGE },
      shelfTarget: { menuId: 'docs', filters: { ...DEFAULT_CATEGORY_FILTERS } }
    },
    {
      id: 'new-tvshows',
      titleKey: 'newTvShows',
      params: { type: 'tvshow', sort: 'created-', page: 0, perpage: HOME_PER_PAGE },
      shelfTarget: { menuId: 'tvshows', filters: { ...DEFAULT_CATEGORY_FILTERS } }
    },
  ]
}

export function MainScreen({
  onBack,
  onSelectItem,
  onNavigateToMenu,
  onOpenShelf,
  isActive,
  initialFocusRow = 0,
  initialFocusCol = 0,
  onFocusChange
}: MainScreenProps) {
  const { t } = useI18n()
  const [rowConfigs] = useState<RowConfig[]>(() => {
    const configs = createHomeRowConfigs()
    return getLocalSettings().showContinueWatching
      ? configs
      : configs.filter(config => !config.isWatching)
  })
  const [rows, setRows] = useState<ContentRow[]>(() =>
    rowConfigs.map(config => ({
      ...config,
      items: [],
      loading: true,
      loadingMore: false,
      page: config.params?.page ?? 0,
      hasMore: !config.isWatching
    }))
  )
  const [focusedRow, setFocusedRow] = useState(initialFocusRow)
  const [focusedCol, setFocusedCol] = useState(initialFocusCol)
  /** Pointer hover must not auto-scroll (webOS edge cascade); keyboard/D-pad may. */
  const [scrollWithFocus, setScrollWithFocus] = useState(true)
  const [error] = useState<string | null>(null)
  const rowsContainerRef = useRef<HTMLDivElement>(null)
  /** Last focused column per row, so Up/Down returns to where the user was in that row. */
  const rowColMemory = useRef<Record<number, number>>({ [initialFocusRow]: initialFocusCol })
  const onFocusChangeRef = useRef(onFocusChange)
  onFocusChangeRef.current = onFocusChange
  const loadingMoreRef = useRef<Record<string, boolean>>({})

  useEffect(() => {
    rowColMemory.current[focusedRow] = focusedCol
  }, [focusedRow, focusedCol])

  useEffect(() => {
    onFocusChangeRef.current?.(focusedRow, focusedCol)
  }, [focusedRow, focusedCol])

  useEffect(() => {
    let cancelled = false

    async function loadRow(index: number) {
      const config = rowConfigs[index]
      try {
        let items: MovieItem[]
        let hasMore = false
        if (config.isWatching) {
          items = await getWatching()
          hasMore = false
        } else if (config.feed === 'fresh') {
          const page = config.params?.page ?? 0
          const response = await getFreshItems(config.params?.type, config.params?.perpage ?? HOME_PER_PAGE, page)
          items = response.items
          hasMore = page + 1 < response.pagination.total
        } else {
          const response = await getItems(config.params!)
          items = response.items
          const page = config.params?.page ?? 0
          hasMore = page + 1 < response.pagination.total
        }
        if (cancelled) return
        setRows(prev => prev.map((row, i) =>
          i === index ? { ...row, items, loading: false, hasMore, page: config.params?.page ?? 0 } : row
        ))
      } catch (err) {
        if (import.meta.env.DEV) console.error(`Failed to load ${config.titleKey}:`, err)
        if (cancelled) return
        setRows(prev => prev.map((row, i) =>
          i === index ? { ...row, loading: false, hasMore: false } : row
        ))
      }
    }

    async function loadRowsWithConcurrency(limit = 3) {
      let next = 0
      async function worker() {
        while (next < rowConfigs.length) {
          const index = next
          next += 1
          await loadRow(index)
        }
      }
      const workers = Array.from({ length: Math.min(limit, rowConfigs.length) }, () => worker())
      await Promise.all(workers)
    }

    loadRowsWithConcurrency()
    return () => {
      cancelled = true
    }
  }, [rowConfigs])

  const loadMoreForRow = useCallback(async (rowIndex: number) => {
    const row = rows[rowIndex]
    if (!row || row.isWatching || !row.hasMore || row.loadingMore) return
    if (loadingMoreRef.current[row.id]) return
    loadingMoreRef.current[row.id] = true

    const nextPage = row.page + 1
    setRows(prev => prev.map((r, i) => i === rowIndex ? { ...r, loadingMore: true } : r))

    try {
      let response
      if (row.feed === 'fresh') {
        response = await getFreshItems(row.params?.type, row.params?.perpage ?? HOME_PER_PAGE, nextPage)
      } else {
        response = await getItems({ ...row.params!, page: nextPage })
      }
      setRows(prev => prev.map((r, i) => {
        if (i !== rowIndex) return r
        const seen = new Set(r.items.map(item => item.id))
        const appended = response.items.filter(item => !seen.has(item.id))
        return {
          ...r,
          items: [...r.items, ...appended],
          page: nextPage,
          hasMore: nextPage + 1 < response.pagination.total,
          loadingMore: false
        }
      }))
    } catch (err) {
      if (import.meta.env.DEV) console.error(`Failed to load more ${row.titleKey}:`, err)
      setRows(prev => prev.map((r, i) => i === rowIndex ? { ...r, loadingMore: false, hasMore: false } : r))
    } finally {
      loadingMoreRef.current[row.id] = false
    }
  }, [rows])

  const openShelf = useCallback((rowIndex: number) => {
    const target = rows[rowIndex]?.shelfTarget
    if (target && onOpenShelf) onOpenShelf(target)
  }, [rows, onOpenShelf])

  const focusByKeyboard = useCallback((update: () => void) => {
    setScrollWithFocus(true)
    update()
  }, [])

  const handlers = useMemo(() => {
    const currentRow = rows[focusedRow]
    const itemCount = currentRow?.items.length || 0
    const hasSeeAll = Boolean(currentRow?.shelfTarget && onOpenShelf)
    // See-all is an extra focusable slot after the last poster.
    const maxCol = hasSeeAll ? itemCount : Math.max(0, itemCount - 1)

    return {
      onLeft: () => {
        if (focusedCol > 0) {
          focusByKeyboard(() => setFocusedCol(prev => prev - 1))
        } else {
          onNavigateToMenu()
        }
      },
      onRight: () => {
        if (focusedCol < maxCol) {
          focusByKeyboard(() => setFocusedCol(prev => prev + 1))
          if (currentRow?.hasMore && focusedCol >= itemCount - 3) {
            loadMoreForRow(focusedRow)
          }
        } else if (currentRow?.hasMore) {
          loadMoreForRow(focusedRow)
        }
      },
      onUp: () => {
        if (focusedRow > 0) {
          focusByKeyboard(() => {
            const newRow = focusedRow - 1
            const newRowItemCount = rows[newRow]?.items.length || 0
            const newHasSeeAll = Boolean(rows[newRow]?.shelfTarget && onOpenShelf)
            const newMax = newHasSeeAll ? newRowItemCount : Math.max(0, newRowItemCount - 1)
            const rememberedCol = rowColMemory.current[newRow] ?? 0
            setFocusedRow(newRow)
            setFocusedCol(Math.min(rememberedCol, newMax))
          })
        }
      },
      onDown: () => {
        if (focusedRow < rows.length - 1) {
          focusByKeyboard(() => {
            const newRow = focusedRow + 1
            const newRowItemCount = rows[newRow]?.items.length || 0
            const newHasSeeAll = Boolean(rows[newRow]?.shelfTarget && onOpenShelf)
            const newMax = newHasSeeAll ? newRowItemCount : Math.max(0, newRowItemCount - 1)
            const rememberedCol = rowColMemory.current[newRow] ?? 0
            setFocusedRow(newRow)
            setFocusedCol(Math.min(rememberedCol, newMax))
          })
        }
      },
      onEnter: () => {
        if (hasSeeAll && focusedCol >= itemCount) {
          openShelf(focusedRow)
          return
        }
        const movie = currentRow?.items[focusedCol]
        if (movie) {
          onSelectItem(movie.id, movie)
        }
      },
      onBack
    }
  }, [focusedRow, focusedCol, rows, onBack, onSelectItem, onNavigateToMenu, onOpenShelf, focusByKeyboard, loadMoreForRow, openShelf])

  useKeyboardNavigation(handlers, isActive)

  const anyReady = rows.some(row => !row.loading)

  useScrollToFocused({
    containerRef: rowsContainerRef,
    focusedIndex: focusedRow,
    itemSelector: '[data-row]',
    itemCount: anyReady ? rows.length : 0,
    enabled: scrollWithFocus && anyReady
  })

  useWheelScroll({
    containerRef: rowsContainerRef,
    direction: 'vertical',
    enabled: anyReady
  })

  if (!anyReady) {
    return (
      <div class="main-screen">
        <LoadingState message={t.loadingContent} />
      </div>
    )
  }

  if (error) {
    return (
      <div class="main-screen">
        <div class="main-error">
          <span class="main-error-text">{error}</span>
          <span>Press Back to logout</span>
        </div>
      </div>
    )
  }

  return (
    <div class="main-screen">
      <div class="rows-container" ref={rowsContainerRef}>
        {rows.map((row, rowIndex) => {
          const hasSeeAll = Boolean(row.shelfTarget && onOpenShelf)
          const seeAllFocused = rowIndex === focusedRow && focusedCol >= row.items.length
          return (
            <div key={row.id} data-row={rowIndex}>
              <MovieRow
                title={t[row.titleKey]}
                movies={row.items}
                loading={row.loading}
                focusedIndex={rowIndex === focusedRow ? focusedCol : null}
                scrollToFocused={scrollWithFocus && rowIndex === focusedRow}
                seeAllLabel={hasSeeAll ? t.seeAll : undefined}
                seeAllFocused={seeAllFocused}
                onTitleActivate={hasSeeAll ? () => openShelf(rowIndex) : undefined}
                onSeeAll={hasSeeAll ? () => openShelf(rowIndex) : undefined}
                onSelect={(colIndex) => {
                  setScrollWithFocus(false)
                  setFocusedRow(rowIndex)
                  setFocusedCol(colIndex)
                }}
                onActivate={(colIndex) => {
                  setScrollWithFocus(false)
                  setFocusedRow(rowIndex)
                  setFocusedCol(colIndex)
                  const movie = row.items[colIndex]
                  if (movie) onSelectItem(movie.id, movie)
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
