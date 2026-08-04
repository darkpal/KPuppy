import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import { getCollections, getCollectionItems, Collection, MovieItem } from '../api/kinopub'
import { MovieCard } from '../components/MovieCard'
import { GridScreen } from '../components/GridScreen'
import { useKeyboardNavigation, useGridLayout, createGridNavigationHandlers, useScrollToFocused } from '../hooks'
import { LoadingState } from '../components/LoadingSpinner'
import { useI18n } from '../i18n'
import '../styles/category.css'
import '../styles/collections.css'

const COLLECTIONS_PER_PAGE = 40
const COLLECTIONS_COLUMNS = 2
/** Jump ~5 visual rows at a time on the 2-column list. */
const PAGE_JUMP = COLLECTIONS_COLUMNS * 5

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

export function CollectionsScreen({ onSelectItem, onNavigateToMenu, isActive }: CollectionsScreenProps) {
  const { t } = useI18n()
  const [collections, setCollections] = useState<Collection[]>([])
  const [items, setItems] = useState<MovieItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('collections')
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [savedCollectionIndex, setSavedCollectionIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
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
    if (!loadingMore && hasMore) {
      loadCollectionsPage(currentPage + 1, true)
    }
  }, [loadingMore, hasMore, currentPage, loadCollectionsPage])

  const loadCollectionItems = useCallback(async (collection: Collection, collectionIndex: number) => {
    setLoading(true)
    setSavedCollectionIndex(collectionIndex)
    try {
      const data = await getCollectionItems(collection.id)
      setItems(data)
      setSelectedCollection(collection)
      setViewMode('items')
      setFocusedIndex(0)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load collection items:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const goBackToCollections = useCallback(() => {
    setViewMode('collections')
    setSelectedCollection(null)
    setItems([])
    setFocusedIndex(savedCollectionIndex)
  }, [savedCollectionIndex])

  const jumpBy = useCallback((delta: number) => {
    setFocusedIndex(prev => {
      const next = Math.max(0, Math.min(collections.length - 1, prev + delta))
      if (next >= collections.length - PAGE_JUMP && hasMore) {
        loadMore()
      }
      return next
    })
  }, [collections.length, hasMore, loadMore])

  const jumpToTop = useCallback(() => {
    setFocusedIndex(0)
  }, [])

  const shuffleCollections = useCallback(() => {
    setCollections(prev => shuffleInPlace(prev))
    setFocusedIndex(0)
  }, [])

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
        if (nextRowStart >= collections.length - PAGE_JUMP && hasMore) {
          loadMore()
        }
      },
      onGreen: shuffleCollections,
      onYellow: () => jumpBy(PAGE_JUMP),
      onBlue: jumpToTop
    }
  }, [
    collections,
    focusedIndex,
    onNavigateToMenu,
    loadCollectionItems,
    hasMore,
    loadMore,
    shuffleCollections,
    jumpBy,
    jumpToTop
  ])

  const itemsHandlers = useMemo(() => ({
    ...createGridNavigationHandlers({
      itemCount: items.length,
      itemsPerRow,
      focusedIndex,
      setFocusedIndex,
      onSelect: (index) => {
        const item = items[index]
        if (item) {
          onSelectItem(item.id, item)
        }
      },
      onLeftEdge: onNavigateToMenu
    }),
    onBack: goBackToCollections
  }), [items, focusedIndex, onNavigateToMenu, onSelectItem, itemsPerRow, goBackToCollections])

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

  const renderItem = useCallback((item: MovieItem, _index: number, focused: boolean) => (
    <MovieCard
      movie={item}
      focused={focused}
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

  if (loading && viewMode === 'items') {
    return (
      <div class="category-screen">
        <h1 class="category-title">{selectedCollection?.title || t.menuCollections}</h1>
        <LoadingState />
      </div>
    )
  }

  if (viewMode === 'items' && selectedCollection) {
    return (
      <GridScreen
        title={selectedCollection.title}
        loading={false}
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

  return (
    <div class="category-screen" ref={containerRef}>
      <h1 class="category-title">{t.menuCollections}</h1>
      {collections.length > 0 && (
        <div class="collections-hint">
          <span class="collections-hint-key">Green</span> — {t.collectionsShuffle}
          {' · '}
          <span class="collections-hint-key">Yellow</span> — {t.collectionsPageDown}
          {' · '}
          <span class="collections-hint-key">Blue</span> — {t.collectionsJumpTop}
        </div>
      )}
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
  )
}
