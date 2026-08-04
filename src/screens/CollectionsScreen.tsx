import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import { getCollections, getCollectionItems, Collection, MovieItem } from '../api/kinopub'
import { MovieCard } from '../components/MovieCard'
import { GridScreen } from '../components/GridScreen'
import { useKeyboardNavigation, useGridLayout, createGridNavigationHandlers, useScrollToFocused } from '../hooks'
import { LoadingState } from '../components/LoadingSpinner'
import { useI18n } from '../i18n'
import '../styles/category.css'
import '../styles/bookmarks.css'

const COLLECTIONS_PER_PAGE = 40

interface CollectionsScreenProps {
  onSelectItem: (itemId: number, preview?: MovieItem) => void
  onNavigateToMenu: () => void
  isActive: boolean
}

type ViewMode = 'collections' | 'items'

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

  const collectionsHandlers = useMemo(() => ({
    onLeft: onNavigateToMenu,
    onUp: () => setFocusedIndex(prev => Math.max(0, prev - 1)),
    onDown: () => {
      setFocusedIndex(prev => {
        const next = Math.min(collections.length - 1, prev + 1)
        if (next >= collections.length - 3 && hasMore) {
          loadMore()
        }
        return next
      })
    },
    onEnter: () => {
      const collection = collections[focusedIndex]
      if (collection) {
        loadCollectionItems(collection, focusedIndex)
      }
    },
    onBack: undefined
  }), [collections, focusedIndex, onNavigateToMenu, loadCollectionItems, hasMore, loadMore])

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
    itemSelector: '.bookmarks-folder',
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
      <div class="bookmarks-folders">
        {collections.map((collection, index) => (
          <div
            key={collection.id}
            class={`bookmarks-folder ${focusedIndex === index ? 'focused' : ''}`}
            onClick={() => loadCollectionItems(collection, index)}
          >
            <div class="bookmarks-folder-title">{collection.title}</div>
            {collection.count > 0 && (
              <div class="bookmarks-folder-count">{collection.count}</div>
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
