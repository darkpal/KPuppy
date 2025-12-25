import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import { getItems, getWatching, MovieItem, ItemsParams } from '../api/kinopub'
import { MovieCard } from '../components/MovieCard'
import { useKeyboardNavigation } from '../hooks'
import { useI18n } from '../i18n'
import '../styles/category.css'

interface CategoryScreenProps {
  categoryId: string
  title: string
  onSelectItem: (itemId: number) => void
  onNavigateToMenu: () => void
  isActive: boolean
  initialFocusIndex?: number
  onFocusChange?: (index: number) => void
}

const CATEGORY_PARAMS: Record<string, ItemsParams> = {
  movies: { type: 'movie', sort: 'created-' },
  series: { type: 'serial', sort: 'created-' },
  concerts: { type: 'concert', sort: 'created-' },
  '3d': { type: '3D', sort: 'created-' },
  docs: { type: 'documovie', sort: 'created-' },
  tvshows: { type: 'tvshow', sort: 'created-' },
}

const ITEMS_PER_PAGE = 48
const RENDER_BUFFER = 24

export function CategoryScreen({ categoryId, title, onSelectItem, onNavigateToMenu, isActive, initialFocusIndex = 0, onFocusChange }: CategoryScreenProps) {
  const { t } = useI18n()
  const [items, setItems] = useState<MovieItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(initialFocusIndex)
  const [itemsPerRow, setItemsPerRow] = useState(8)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevCategoryIdRef = useRef<string>(categoryId)
  const onFocusChangeRef = useRef(onFocusChange)
  onFocusChangeRef.current = onFocusChange

  useEffect(() => {
    onFocusChangeRef.current?.(focusedIndex)
  }, [focusedIndex])

  useEffect(() => {
    if (initialFocusIndex > 0) {
      const timer = setTimeout(() => {
        const focusedEl = document.querySelector(`[data-category-index="${initialFocusIndex}"]`) as HTMLElement
        const container = document.querySelector('.category-screen') as HTMLElement
        if (focusedEl && container) {
          const elTop = focusedEl.offsetTop
          const containerHeight = container.clientHeight
          const elHeight = focusedEl.clientHeight
          container.scrollTop = elTop - (containerHeight / 2) + (elHeight / 2)
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const updateItemsPerRow = () => {
      const grid = document.querySelector('.category-grid')
      if (grid && grid.children.length > 0) {
        const firstChild = grid.children[0] as HTMLElement
        const gridWidth = grid.clientWidth
        const itemWidth = firstChild.offsetWidth
        const gap = 32
        const count = Math.floor((gridWidth + gap) / (itemWidth + gap))
        setItemsPerRow(Math.max(1, count))
      }
    }
    const timer = setTimeout(updateItemsPerRow, 100)
    window.addEventListener('resize', updateItemsPerRow)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateItemsPerRow)
    }
  }, [items.length])

  const loadItems = useCallback(async (page: number, append: boolean = false) => {
    if (page > 1) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      if (categoryId === 'watching') {
        const watchingItems = await getWatching()
        setItems(watchingItems)
        setHasMore(false)
      } else {
        const params = CATEGORY_PARAMS[categoryId]
        if (params) {
          const response = await getItems({ ...params, page, perpage: ITEMS_PER_PAGE })
          if (append) {
            setItems(prev => [...prev, ...response.items])
          } else {
            setItems(response.items)
          }
          setHasMore(page < response.pagination.total)
        }
      }
    } catch (err) {
      console.error('Failed to load category:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [categoryId])

  useEffect(() => {
    const categoryChanged = prevCategoryIdRef.current !== categoryId
    prevCategoryIdRef.current = categoryId

    setItems([])
    setCurrentPage(1)
    if (categoryChanged) {
      setFocusedIndex(0)
    }
    setHasMore(true)
    loadItems(1, false)
  }, [categoryId, loadItems])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      loadItems(nextPage, true)
    }
  }, [loadingMore, hasMore, currentPage, loadItems])

  const handlers = useMemo(() => {
    const itemCount = items.length
    const currentRow = Math.floor(focusedIndex / itemsPerRow)
    const totalRows = Math.ceil(itemCount / itemsPerRow)

    return {
      onLeft: () => {
        if (focusedIndex % itemsPerRow === 0) {
          onNavigateToMenu()
        } else {
          setFocusedIndex(prev => Math.max(0, prev - 1))
        }
      },
      onRight: () => setFocusedIndex(prev => Math.min(itemCount - 1, prev + 1)),
      onUp: () => setFocusedIndex(prev => Math.max(0, prev - itemsPerRow)),
      onDown: () => {
        const newIndex = focusedIndex + itemsPerRow
        if (newIndex < itemCount) {
          setFocusedIndex(newIndex)
        } else if (hasMore) {
          loadMore()
        }
        if (currentRow >= totalRows - 2 && hasMore) {
          loadMore()
        }
      },
      onEnter: () => {
        const item = items[focusedIndex]
        if (item) {
          onSelectItem(item.id)
        }
      }
    }
  }, [items, focusedIndex, onNavigateToMenu, onSelectItem, itemsPerRow, hasMore, loadMore])

  useKeyboardNavigation(handlers, isActive)

  useEffect(() => {
    const focusedEl = document.querySelector(`[data-category-index="${focusedIndex}"]`) as HTMLElement
    const container = document.querySelector('.category-screen') as HTMLElement
    if (focusedEl && container) {
      const elTop = focusedEl.offsetTop
      const containerHeight = container.clientHeight
      const elHeight = focusedEl.clientHeight
      const targetScroll = elTop - (containerHeight / 2) + (elHeight / 2)
      container.scrollTop = Math.max(0, targetScroll)
    }
  }, [focusedIndex])

  const getVisibleRange = useCallback(() => {
    const focusedRow = Math.floor(focusedIndex / itemsPerRow)
    const bufferRows = Math.ceil(RENDER_BUFFER / itemsPerRow)
    const startRow = Math.max(0, focusedRow - bufferRows)
    const endRow = focusedRow + bufferRows + 1
    const startIndex = startRow * itemsPerRow
    const endIndex = Math.min(items.length, endRow * itemsPerRow)
    return { startIndex, endIndex, startRow }
  }, [focusedIndex, itemsPerRow, items.length])

  if (loading) {
    return (
      <div class="category-screen">
        <h1 class="category-title">{title}</h1>
        <div class="category-loading">
          <div class="category-spinner" />
        </div>
      </div>
    )
  }

  const { startIndex, endIndex, startRow } = getVisibleRange()
  const visibleItems = items.slice(startIndex, endIndex)
  const itemHeight = 300
  const totalHeight = Math.ceil(items.length / itemsPerRow) * itemHeight

  return (
    <div class="category-screen" ref={containerRef}>
      <h1 class="category-title">{title}</h1>
      <div
        class="category-grid-container"
        style={{ height: `${totalHeight}px`, position: 'relative' }}
      >
        <div
          class="category-grid"
          style={{
            position: 'absolute',
            top: `${startRow * itemHeight}px`,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index
            return (
              <div key={item.id} data-category-index={actualIndex}>
                <MovieCard
                  movie={item}
                  focused={focusedIndex === actualIndex}
                  onSelect={() => onSelectItem(item.id)}
                />
              </div>
            )
          })}
        </div>
      </div>
      {loadingMore && (
        <div class="category-loading-more">
          <div class="category-spinner-small" />
          <span>{t.loadingMore}</span>
        </div>
      )}
      {items.length === 0 && (
        <div class="category-empty">{t.errorNoItems}</div>
      )}
    </div>
  )
}
