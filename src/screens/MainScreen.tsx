import { useState, useEffect, useRef, useMemo } from 'preact/hooks'
import { getItems, getWatching, MovieItem, ItemsParams } from '../api/kinopub'
import { MovieRow } from '../components/MovieRow'
import { useKeyboardNavigation } from '../hooks'
import { useI18n } from '../i18n'
import { Translations } from '../i18n/translations'
import '../styles/main.css'

interface MainScreenProps {
  onLogout: () => void
  onSelectItem: (itemId: number) => void
  onNavigateToMenu: () => void
  isActive: boolean
  initialFocusRow?: number
  initialFocusCol?: number
  onFocusChange?: (row: number, col: number) => void
}

interface ContentRow {
  id: string
  titleKey: keyof Translations
  params?: ItemsParams
  isWatching?: boolean
  items: MovieItem[]
  loading: boolean
}

interface RowConfig {
  id: string
  titleKey: keyof Translations
  params?: ItemsParams
  isWatching?: boolean
}

const ROW_CONFIGS: RowConfig[] = [
  { id: 'watching', titleKey: 'categoryContinueWatching', isWatching: true },
  { id: 'popular-movies', titleKey: 'popularMovies', params: { type: 'movie', sort: 'views', perpage: 10 } },
  { id: 'new-movies', titleKey: 'newMovies', params: { type: 'movie', sort: 'created-', perpage: 10 } },
  { id: 'popular-series', titleKey: 'popularSeries', params: { type: 'serial', sort: 'views', perpage: 10 } },
  { id: 'new-series', titleKey: 'newSeries', params: { type: 'serial', sort: 'created-', perpage: 10 } },
  { id: 'new-concerts', titleKey: 'newConcerts', params: { type: 'concert', sort: 'created-', perpage: 10 } },
  { id: 'new-3d', titleKey: 'new3D', params: { type: '3D', sort: 'created-', perpage: 10 } },
  { id: 'new-docs', titleKey: 'newDocs', params: { type: 'documovie', sort: 'created-', perpage: 10 } },
  { id: 'new-tvshows', titleKey: 'newTvShows', params: { type: 'tvshow', sort: 'created-', perpage: 10 } },
]

export function MainScreen({ onLogout, onSelectItem, onNavigateToMenu, isActive, initialFocusRow = 0, initialFocusCol = 0, onFocusChange }: MainScreenProps) {
  const { t } = useI18n()
  const [rows, setRows] = useState<ContentRow[]>(() =>
    ROW_CONFIGS.map(config => ({
      ...config,
      items: [],
      loading: true
    }))
  )
  const [focusedRow, setFocusedRow] = useState(initialFocusRow)
  const [focusedCol, setFocusedCol] = useState(initialFocusCol)
  const [error] = useState<string | null>(null)
  const onFocusChangeRef = useRef(onFocusChange)
  onFocusChangeRef.current = onFocusChange

  useEffect(() => {
    onFocusChangeRef.current?.(focusedRow, focusedCol)
  }, [focusedRow, focusedCol])

  useEffect(() => {
    if (initialFocusRow > 0) {
      const timer = setTimeout(() => {
        const rowElement = document.querySelector(`[data-row="${initialFocusRow}"]`) as HTMLElement
        const container = document.querySelector('.rows-container') as HTMLElement
        if (rowElement && container) {
          const rowTop = rowElement.offsetTop
          const containerHeight = container.clientHeight
          const rowHeight = rowElement.clientHeight
          container.scrollTop = rowTop - (containerHeight / 2) + (rowHeight / 2)
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    async function loadRow(index: number) {
      const config = ROW_CONFIGS[index]
      try {
        let items: MovieItem[]
        if (config.isWatching) {
          items = await getWatching()
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
      for (let i = 0; i < ROW_CONFIGS.length; i++) {
        await loadRow(i)
      }
    }

    loadRowsSequentially()
  }, [])

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
      onBack: onLogout
    }
  }, [focusedRow, focusedCol, rows, onLogout, onSelectItem, onNavigateToMenu])

  useKeyboardNavigation(handlers, isActive)

  useEffect(() => {
    const rowElement = document.querySelector(`[data-row="${focusedRow}"]`) as HTMLElement
    const container = document.querySelector('.rows-container') as HTMLElement
    if (rowElement && container) {
      const rowTop = rowElement.offsetTop
      const containerHeight = container.clientHeight
      const rowHeight = rowElement.clientHeight
      container.scrollTop = rowTop - (containerHeight / 2) + (rowHeight / 2)
    }
  }, [focusedRow])

  const allLoading = rows.every(row => row.loading)

  if (allLoading) {
    return (
      <div class="main-screen">
        <div class="main-loading">
          <div class="main-spinner" />
          <span style={{ color: '#b3b3b3', fontSize: '20px' }}>{t.loadingContent}</span>
        </div>
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
      <div class="rows-container">
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
            />
          </div>
        ))}
      </div>
    </div>
  )
}
