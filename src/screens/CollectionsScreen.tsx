import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import { getCollections, getCollectionItems, Collection, MovieItem } from '../api/kinopub'
import { MovieCard } from '../components/MovieCard'
import { GridScreen } from '../components/GridScreen'
import { useKeyboardNavigation, useGridLayout, createGridNavigationHandlers } from '../hooks'
import { LoadingState } from '../components/LoadingSpinner'
import { useI18n } from '../i18n'
import '../styles/category.css'
import '../styles/bookmarks.css'

interface CollectionsScreenProps {
  onSelectItem: (itemId: number) => void
  onNavigateToMenu: () => void
  isActive: boolean
}

type ViewMode = 'collections' | 'items'

export function CollectionsScreen({ onSelectItem, onNavigateToMenu, isActive }: CollectionsScreenProps) {
  const { t } = useI18n()
  const [collections, setCollections] = useState<Collection[]>([])
  const [items, setItems] = useState<MovieItem[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('collections')
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [savedCollectionIndex, setSavedCollectionIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const { itemsPerRow, cardWidth } = useGridLayout('.category-grid', 240, [items.length, viewMode])

  useEffect(() => {
    async function loadCollections() {
      setLoading(true)
      try {
        const data = await getCollections()
        setCollections(data)
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load collections:', err)
      } finally {
        setLoading(false)
      }
    }
    loadCollections()
  }, [])

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

  const collectionsHandlers = useMemo(() => {
    return {
      onLeft: onNavigateToMenu,
      onUp: () => setFocusedIndex(prev => Math.max(0, prev - 1)),
      onDown: () => setFocusedIndex(prev => Math.min(collections.length - 1, prev + 1)),
      onEnter: () => {
        const collection = collections[focusedIndex]
        if (collection) {
          loadCollectionItems(collection, focusedIndex)
        }
      }
    }
  }, [collections, focusedIndex, onNavigateToMenu, loadCollectionItems])

  const itemsHandlers = useMemo(() => ({
    ...createGridNavigationHandlers({
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
    }),
    onBack: goBackToCollections
  }), [items, focusedIndex, onNavigateToMenu, onSelectItem, itemsPerRow, goBackToCollections])

  useKeyboardNavigation(
    viewMode === 'collections' ? collectionsHandlers : itemsHandlers,
    isActive && !loading
  )

  const renderItem = useCallback((item: MovieItem, _index: number, focused: boolean) => (
    <MovieCard
      movie={item}
      focused={focused}
      onSelect={() => onSelectItem(item.id)}
    />
  ), [onSelectItem])

  if (loading) {
    return (
      <div class="category-screen">
        <h1 class="category-title">{t.menuCollections}</h1>
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
          </div>
        ))}
      </div>
      {collections.length === 0 && (
        <div class="category-empty">{t.errorNoItems}</div>
      )}
    </div>
  )
}
