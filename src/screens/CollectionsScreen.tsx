import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import { getCollections, getCollectionItems, Collection, MovieItem } from '../api/kinopub'
import { MovieCard } from '../components/MovieCard'
import { GridScreen } from '../components/GridScreen'
import { useKeyboardNavigation, useGridLayout, createGridNavigationHandlers, useScrollToFocused } from '../hooks'
import { LoadingState } from '../components/LoadingSpinner'
import { useI18n } from '../i18n'
import { MovieSortMode, sortMovieItems } from '../utils/sortMovies'
import '../styles/category.css'
import '../styles/collections.css'

const COLLECTIONS_PER_PAGE = 40
const COLLECTIONS_COLUMNS = 2
/** Fallback when row height is not measurable yet (~13 visible rows). */
const DEFAULT_VISIBLE_ROWS = 13

interface CollectionsScreenProps {
  onSelectItem: (itemId: number, preview?: MovieItem) => void
  onNavigateToMenu: () => void
  isActive: boolean
}

type ViewMode = 'collections' | 'items'

function shuffleInPlace<T>(items: T[]): T[] {
  const next = items.slice()
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
  }
  return next
}

/** LG Magic Remote: red=1, green=2, yellow=3, blue=4 dots (same language as player). */
function RemoteKeyDots({ count }: { count: 1 | 2 | 3 | 4 }) {
  return (
    <span class={`collections-hint-key-dots dots-${count}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} class="collections-hint-key-dot" />
      ))}
    </span>
  )
}

export function CollectionsScreen({ onSelectItem, onNavigateToMenu, isActive }: CollectionsScreenProps) {
  const { t, language } = useI18n()
  const [collections, setCollections] = useState<Collection[]>([])
  const [items, setItems] = useState<MovieItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('collections')
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [itemSortMode, setItemSortMode] = useState<MovieSortMode>('default')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [savedCollectionIndex, setSavedCollectionIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const collectionsRef = useRef(collections)
  collectionsRef.current = collections
  const hasMoreRef = useRef(hasMore)
  hasMoreRef.current = hasMore
  const currentPageRef = useRef(currentPage)
  currentPageRef.current = currentPage
  const { itemsPerRow, cardWidth } = useGridLayout('.category-grid', 240, [items.length, viewMode])

  const loadCollectionsPage = useCallback(async (page: number, append: boolean) => {
    if (page > 1) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await getCollections(page, COLLECTIONS_PER_PAGE)
      if (append) {
        setCollections(prev => {
          const seen = new Set(prev.map(c => c.id))
          return [...prev, ...response.items.filter(c => !seen.has(c.id))]
        })
      } else {
        setCollections(response.items)
      }
      setHasMore(page < response.pagination.total)
      setCurrentPage(page)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load collections:', err)
      if (!append) {
        setCollections([])
        setHasMore(false)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    loadCollectionsPage(1, false)
  }, [loadCollectionsPage])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMoreRef.current) {
      loadCollectionsPage(currentPageRef.current + 1, true)
    }
  }, [loadingMore, loadCollectionsPage])

  /** Fetch every remaining page so shuffle / A–Z operate on the full catalog. */
  const ensureAllLoaded = useCallback(async (): Promise<Collection[]> => {
    let all = collectionsRef.current.slice()
    if (!hasMoreRef.current) return all

    setLoadingMore(true)
    try {
      let page = currentPageRef.current
      let more: boolean = true
      const seen = new Set(all.map(c => c.id))
      while (more) {
        page += 1
        const response = await getCollections(page, COLLECTIONS_PER_PAGE)
        for (const item of response.items) {
          if (!seen.has(item.id)) {
            seen.add(item.id)
            all.push(item)
          }
        }
        more = page < response.pagination.total
      }
      setCollections(all)
      setCurrentPage(page)
      setHasMore(false)
      return all
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load all collections:', err)
      return all
    } finally {
      setLoadingMore(false)
    }
  }, [])

  const getPageJumpSize = useCallback(() => {
    const container = containerRef.current
    const item = container?.querySelector('.collections-item') as HTMLElement | null
    if (!container || !item) {
      return COLLECTIONS_COLUMNS * DEFAULT_VISIBLE_ROWS
    }
    const style = window.getComputedStyle(item)
    const marginY = (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0)
    const rowHeight = item.offsetHeight + marginY
    const available = Math.max(rowHeight, container.clientHeight - 16)
    const rows = Math.max(1, Math.floor(available / rowHeight))
    return rows * COLLECTIONS_COLUMNS
  }, [])

  const loadCollectionItems = useCallback(async (collection: Collection, collectionIndex: number) => {
    // Flip to items view immediately so large collections show a spinner instead of a dead list.
    setSavedCollectionIndex(collectionIndex)
    setSelectedCollection(collection)
    setItems([])
    setItemSortMode('default')
    setViewMode('items')
    setFocusedIndex(0)
    setLoading(true)
    try {
      const data = await getCollectionItems(collection.id)
      setItems(data)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load collection items:', err)
      setViewMode('collections')
      setSelectedCollection(null)
      setFocusedIndex(collectionIndex)
    } finally {
      setLoading(false)
    }
  }, [])

  const goBackToCollections = useCallback(() => {
    setViewMode('collections')
    setSelectedCollection(null)
    setItems([])
    setItemSortMode('default')
    setFocusedIndex(savedCollectionIndex)
  }, [savedCollectionIndex])

  const displayedItems = useMemo(
    () => sortMovieItems(items, itemSortMode),
    [items, itemSortMode]
  )

  const setItemsSort = useCallback((mode: MovieSortMode) => {
    setItemSortMode(prev => (prev === mode ? 'default' : mode))
    setFocusedIndex(0)
  }, [])

  const jumpByPage = useCallback(() => {
    const delta = getPageJumpSize()
    setFocusedIndex(prev => {
      const next = Math.max(0, Math.min(collectionsRef.current.length - 1, prev + delta))
      if (next >= collectionsRef.current.length - delta && hasMoreRef.current) {
        loadMore()
      }
      return next
    })
  }, [getPageJumpSize, loadMore])

  const jumpToTop = useCallback(() => {
    setFocusedIndex(0)
  }, [])

  const shuffleCollections = useCallback(async () => {
    const all = await ensureAllLoaded()
    setCollections(shuffleInPlace(all))
    setFocusedIndex(0)
  }, [ensureAllLoaded])

  const sortCollectionsAz = useCallback(async () => {
    const all = await ensureAllLoaded()
    const locale = language === 'en' ? 'en' : language
    setCollections(
      [...all].sort((a, b) => a.title.localeCompare(b.title, locale, { sensitivity: 'base' }))
    )
    setFocusedIndex(0)
  }, [ensureAllLoaded, language])

  const collectionsHandlers = useMemo(() => {
    const gridHandlers = createGridNavigationHandlers({
      itemCount: collections.length,
      itemsPerRow: COLLECTIONS_COLUMNS,
      focusedIndex,
      setFocusedIndex,
      onSelect: (index) => {
        const collection = collections[index]
        if (collection) loadCollectionItems(collection, index)
      },
      onLeftEdge: onNavigateToMenu,
      onBottomEdge: () => {
        if (hasMore) loadMore()
      }
    })

    return {
      ...gridHandlers,
      onDown: () => {
        gridHandlers.onDown?.()
        const nextRowStart = focusedIndex + COLLECTIONS_COLUMNS
        if (nextRowStart >= collections.length - getPageJumpSize() && hasMore) {
          loadMore()
        }
      },
      onRed: () => { void sortCollectionsAz() },
      onGreen: () => { void shuffleCollections() },
      onYellow: jumpByPage,
      onBlue: jumpToTop
    }
  }, [
    collections,
    focusedIndex,
    onNavigateToMenu,
    loadCollectionItems,
    hasMore,
    loadMore,
    getPageJumpSize,
    sortCollectionsAz,
    shuffleCollections,
    jumpByPage,
    jumpToTop
  ])

  const itemsHandlers = useMemo(() => ({
    ...createGridNavigationHandlers({
      itemCount: displayedItems.length,
      itemsPerRow,
      focusedIndex,
      setFocusedIndex,
      onSelect: (index) => {
        const item = displayedItems[index]
        if (item) {
          onSelectItem(item.id, item)
        }
      },
      onLeftEdge: onNavigateToMenu
    }),
    onBack: goBackToCollections,
    onYellow: () => setItemsSort('year'),
    onBlue: () => setItemsSort('rating')
  }), [displayedItems, focusedIndex, onNavigateToMenu, onSelectItem, itemsPerRow, goBackToCollections, setItemsSort])

  useKeyboardNavigation(
    viewMode === 'collections' ? collectionsHandlers : itemsHandlers,
    isActive && !loading
  )

  useScrollToFocused({
    containerRef,
    focusedIndex,
    itemSelector: '.collections-item',
    direction: 'vertical',
    center: false,
    itemCount: collections.length,
    enabled: isActive && !loading && viewMode === 'collections'
  })

  const renderItem = useCallback((item: MovieItem, index: number, focused: boolean) => (
    <MovieCard
      movie={item}
      focused={focused}
      onHover={() => setFocusedIndex(index)}
      onSelect={() => onSelectItem(item.id, item)}
    />
  ), [onSelectItem])

  if (loading && collections.length === 0 && viewMode === 'collections') {
    return (
      <div class="category-screen">
        <h1 class="category-title">{t.menuCollections}</h1>
        <LoadingState />
      </div>
    )
  }

  if (viewMode === 'items' && selectedCollection) {
    if (loading) {
      return (
        <div class="category-screen">
          <h1 class="category-title">{selectedCollection.title}</h1>
          <LoadingState />
        </div>
      )
    }

    const itemsSortTrailing = (
      <div class="collections-toolbar collections-toolbar--inline">
        <span class="collections-sort-label">{t.sort}</span>
        <button
          type="button"
          class={`collections-hint collections-hint-page ${itemSortMode === 'year' ? 'selected' : ''}`}
          onClick={() => setItemsSort('year')}
        >
          <RemoteKeyDots count={3} />
          <span class="collections-hint-label">{t.sortYear}</span>
        </button>
        <button
          type="button"
          class={`collections-hint collections-hint-top ${itemSortMode === 'rating' ? 'selected' : ''}`}
          onClick={() => setItemsSort('rating')}
        >
          <RemoteKeyDots count={4} />
          <span class="collections-hint-label">{t.sortRating}</span>
        </button>
      </div>
    )

    return (
      <GridScreen
        title={selectedCollection.title}
        loading={false}
        items={displayedItems}
        focusedIndex={focusedIndex}
        itemsPerRow={itemsPerRow}
        renderItem={renderItem}
        getItemKey={(item) => item.id}
        emptyMessage={t.errorNoItems}
        containerRef={containerRef}
        cardWidth={cardWidth}
        trailing={itemsSortTrailing}
      />
    )
  }

  return (
    <div class="collections-screen">
      <div class="collections-chrome">
        <h1 class="category-title">{t.menuCollections}</h1>
        {collections.length > 0 && (
          <div class="collections-toolbar">
            <button
              type="button"
              class="collections-hint collections-hint-sort"
              onClick={() => { void sortCollectionsAz() }}
            >
              <RemoteKeyDots count={1} />
              <span class="collections-hint-label">{t.collectionsSortAz}</span>
            </button>
            <button
              type="button"
              class="collections-hint collections-hint-shuffle"
              onClick={() => { void shuffleCollections() }}
            >
              <RemoteKeyDots count={2} />
              <span class="collections-hint-label">{t.collectionsShuffle}</span>
            </button>
            <button
              type="button"
              class="collections-hint collections-hint-page"
              onClick={jumpByPage}
            >
              <RemoteKeyDots count={3} />
              <span class="collections-hint-label">{t.collectionsPageDown}</span>
            </button>
            <button
              type="button"
              class="collections-hint collections-hint-top"
              onClick={jumpToTop}
            >
              <RemoteKeyDots count={4} />
              <span class="collections-hint-label">{t.collectionsJumpTop}</span>
            </button>
          </div>
        )}
      </div>
      <div class="collections-scroll" ref={containerRef}>
        <div class="collections-list">
          {collections.map((collection, index) => (
            <div
              key={collection.id}
              class={`collections-item ${focusedIndex === index ? 'focused' : ''}`}
              onClick={() => loadCollectionItems(collection, index)}
              onMouseEnter={() => setFocusedIndex(index)}
            >
              <div class="collections-item-title">{collection.title}</div>
              {collection.count > 0 && (
                <div class="collections-item-count">{collection.count}</div>
              )}
            </div>
          ))}
        </div>
        {loadingMore && (
          <div class="category-loading-more">
            <LoadingState />
          </div>
        )}
        {collections.length === 0 && (
          <div class="category-empty">{t.errorNoItems}</div>
        )}
      </div>
    </div>
  )
}
