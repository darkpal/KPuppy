import { useState, useEffect, useRef, useMemo } from 'preact/hooks'
import { getItems, getHotItems, getWatching, MovieItem, ItemsParams } from '../api/kinopub'
import { getLocalSettings } from '../storage'
import { MovieRow } from '../components/MovieRow'
import { useKeyboardNavigation, useScrollToFocused, useWheelScroll } from '../hooks'
import { LoadingState } from '../components/LoadingSpinner'
import { useI18n } from '../i18n'
import { Translations } from '../i18n/translations'
import '../styles/main.css'

interface MainScreenProps {
  onBack: () => void
  onSelectItem: (itemId: number) => void
  onNavigateToMenu: () => void
  isActive: boolean
  initialFocusRow?: number
  initialFocusCol?: number
  onFocusChange?: (row: number, col: number) => void
}

type FeedSource = 'items' | 'hot'

interface ContentRow {
  id: string
  titleKey: keyof Translations
  params?: ItemsParams
  feed?: FeedSource
  isWatching?: boolean
  items: MovieItem[]
  loading: boolean
}

interface RowConfig {
  id: string
  titleKey: keyof Translations
  params?: ItemsParams
  feed?: FeedSource
  isWatching?: boolean
}

function createHomeRowConfigs(): RowConfig[] {
  // Same shortcut as leoru/kinopub-apple-client default: /v1/items/hot
  return [
    { id: 'watching', titleKey: 'categoryContinueWatching', isWatching: true },
    {
      id: 'popular-movies',
      titleKey: 'popularMovies',
      feed: 'hot',
      params: { type: 'movie', page: 0, perpage: 20 }
    },
    {
      id: 'new-movies',
      titleKey: 'newMovies',
      params: { type: 'movie', sort: 'created-', page: 0, perpage: 20 }
    },
    {
      id: 'popular-series',
      titleKey: 'popularSeries',
      feed: 'hot',
      params: { type: 'serial', page: 0, perpage: 20 }
    },
    {
      id: 'new-series',
      titleKey: 'newSeries',
      params: { type: 'serial', sort: 'created-', page: 0, perpage: 20 }
    },
    {
      id: 'new-concerts',
      titleKey: 'newConcerts',
      params: { type: 'concert', sort: 'created-', page: 0, perpage: 20 }
    },
    {
      id: 'new-docs',
      titleKey: 'newDocs',
      params: { type: 'documovie', sort: 'created-', page: 0, perpage: 20 }
    },
    {
      id: 'new-docuseries',
      titleKey: 'newDocuseries',
      params: { type: 'docuserial', sort: 'created-', page: 0, perpage: 20 }
    },
    {
      id: 'new-tvshows',
      titleKey: 'newTvShows',
      params: { type: 'tvshow', sort: 'created-', page: 0, perpage: 20 }
    },
  ]
}

export function MainScreen({ onBack, onSelectItem, onNavigateToMenu, isActive, initialFocusRow = 0, initialFocusCol = 0, onFocusChange }: MainScreenProps) {
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
      loading: true
    }))
  )
  const [focusedRow, setFocusedRow] = useState(initialFocusRow)
  const [focusedCol, setFocusedCol] = useState(initialFocusCol)
  const [error] = useState<string | null>(null)
  const rowsContainerRef = useRef<HTMLDivElement>(null)
  const onFocusChangeRef = useRef(onFocusChange)
  onFocusChangeRef.current = onFocusChange

  useEffect(() => {
    onFocusChangeRef.current?.(focusedRow, focusedCol)
  }, [focusedRow, focusedCol])

  useEffect(() => {
    async function loadRow(index: number) {
      const config = rowConfigs[index]
      try {
        let items: MovieItem[]
        if (config.isWatching) {
          items = await getWatching()
        } else if (config.feed === 'hot') {
          const response = await getHotItems(config.params?.type, config.params?.perpage ?? 20)
          items = response.items
        } else {
          const response = await getItems(config.params!)
          items = response.items
        }
        setRows(prev => prev.map((row, i) =>
          i === index ? { ...row, items, loading: false } : row
        ))
      } catch (err) {
        if (import.meta.env.DEV) console.error(`Failed to load ${config.titleKey}:`, err)
        setRows(prev => prev.map((row, i) =>
          i === index ? { ...row, loading: false } : row
        ))
      }
    }

    async function loadRowsSequentially() {
      for (let i = 0; i < rowConfigs.length; i++) {
        await loadRow(i)
      }
    }

    loadRowsSequentially()
  }, [rowConfigs])

  const handlers = useMemo(() => {
    const currentRow = rows[focusedRow]
    const itemCount = currentRow?.items.length || 0

    return {
      onLeft: () => {
        if (focusedCol > 0) {
          setFocusedCol(prev => prev - 1)
        } else {
          onNavigateToMenu()
        }
      },
      onRight: () => {
        if (focusedCol < itemCount - 1) {
          setFocusedCol(prev => prev + 1)
        }
      },
      onUp: () => {
        if (focusedRow > 0) {
          const newRow = focusedRow - 1
          const newRowItemCount = rows[newRow]?.items.length || 0
          setFocusedRow(newRow)
          setFocusedCol(prev => Math.min(prev, newRowItemCount - 1))
        }
      },
      onDown: () => {
        if (focusedRow < rows.length - 1) {
          const newRow = focusedRow + 1
          const newRowItemCount = rows[newRow]?.items.length || 0
          setFocusedRow(newRow)
          setFocusedCol(prev => Math.min(prev, Math.max(0, newRowItemCount - 1)))
        }
      },
      onEnter: () => {
        const movie = currentRow?.items[focusedCol]
        if (movie) {
          onSelectItem(movie.id)
        }
      },
      onBack
    }
  }, [focusedRow, focusedCol, rows, onBack, onSelectItem, onNavigateToMenu])

  useKeyboardNavigation(handlers, isActive)

  const allLoading = rows.every(row => row.loading)

  useScrollToFocused({
    containerRef: rowsContainerRef,
    focusedIndex: focusedRow,
    itemSelector: '[data-row]',
    itemCount: allLoading ? 0 : rows.length
  })

  useWheelScroll({
    containerRef: rowsContainerRef,
    direction: 'vertical',
    enabled: !allLoading
  })

  if (allLoading) {
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
        {rows.map((row, rowIndex) => (
          <div key={row.id} data-row={rowIndex}>
            <MovieRow
              title={t[row.titleKey]}
              movies={row.items}
              loading={row.loading}
              focusedIndex={rowIndex === focusedRow ? focusedCol : null}
              onSelect={(colIndex) => {
                setFocusedRow(rowIndex)
                setFocusedCol(colIndex)
              }}
              onActivate={(colIndex) => {
                setFocusedRow(rowIndex)
                setFocusedCol(colIndex)
                const movie = row.items[colIndex]
                if (movie) onSelectItem(movie.id)
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
