import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import { getBookmarkFolders, getBookmarkItems, BookmarkFolder, MovieItem } from '../api/kinopub'
import { MovieCard } from '../components/MovieCard'
import { useKeyboardNavigation } from '../hooks'
import { useI18n } from '../i18n'
import '../styles/category.css'
import '../styles/bookmarks.css'

interface BookmarksScreenProps {
  onSelectItem: (itemId: number) => void
  onNavigateToMenu: () => void
  isActive: boolean
}

type ViewMode = 'folders' | 'items'

export function BookmarksScreen({ onSelectItem, onNavigateToMenu, isActive }: BookmarksScreenProps) {
  const { t } = useI18n()
  const [folders, setFolders] = useState<BookmarkFolder[]>([])
  const [items, setItems] = useState<MovieItem[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('folders')
  const [selectedFolder, setSelectedFolder] = useState<BookmarkFolder | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [itemsPerRow, setItemsPerRow] = useState(8)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadFolders() {
      setLoading(true)
      try {
        const data = await getBookmarkFolders()
        setFolders(data)
      } catch (err) {
        console.error('Failed to load bookmarks:', err)
      } finally {
        setLoading(false)
      }
    }
    loadFolders()
  }, [])

  const loadFolderItems = useCallback(async (folder: BookmarkFolder) => {
    setLoading(true)
    try {
      const data = await getBookmarkItems(folder.id)
      setItems(data)
      setSelectedFolder(folder)
      setViewMode('items')
      setFocusedIndex(0)
    } catch (err) {
      console.error('Failed to load bookmark items:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const goBackToFolders = useCallback(() => {
    setViewMode('folders')
    setSelectedFolder(null)
    setItems([])
    setFocusedIndex(0)
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
  }, [items.length, viewMode])

  const foldersHandlers = useMemo(() => ({
    onLeft: onNavigateToMenu,
    onUp: () => setFocusedIndex(prev => Math.max(0, prev - 1)),
    onDown: () => setFocusedIndex(prev => Math.min(folders.length - 1, prev + 1)),
    onEnter: () => {
      const folder = folders[focusedIndex]
      if (folder) {
        loadFolderItems(folder)
      }
    }
  }), [folders, focusedIndex, onNavigateToMenu, loadFolderItems])

  const itemsHandlers = useMemo(() => {
    const itemCount = items.length
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
        }
      },
      onEnter: () => {
        const item = items[focusedIndex]
        if (item) {
          onSelectItem(item.id)
        }
      },
      onBack: goBackToFolders
    }
  }, [items, focusedIndex, onNavigateToMenu, onSelectItem, itemsPerRow, goBackToFolders])

  useKeyboardNavigation(
    viewMode === 'folders' ? foldersHandlers : itemsHandlers,
    isActive && !loading
  )

  useEffect(() => {
    if (viewMode === 'items') {
      const focusedEl = document.querySelector(`[data-category-index="${focusedIndex}"]`) as HTMLElement
      const container = document.querySelector('.category-screen') as HTMLElement
      if (focusedEl && container) {
        const elTop = focusedEl.offsetTop
        const containerHeight = container.clientHeight
        const elHeight = focusedEl.clientHeight
        const targetScroll = elTop - (containerHeight / 2) + (elHeight / 2)
        container.scrollTop = Math.max(0, targetScroll)
      }
    }
  }, [focusedIndex, viewMode])

  if (loading) {
    return (
      <div class="category-screen">
        <h1 class="category-title">{t.menuBookmarks}</h1>
        <div class="category-loading">
          <div class="category-spinner" />
        </div>
      </div>
    )
  }

  if (viewMode === 'items' && selectedFolder) {
    return (
      <div class="category-screen" ref={containerRef}>
        <h1 class="category-title">{selectedFolder.title}</h1>
        <div class="category-grid">
          {items.map((item, index) => (
            <div key={item.id} data-category-index={index}>
              <MovieCard
                movie={item}
                focused={focusedIndex === index}
                onSelect={() => onSelectItem(item.id)}
              />
            </div>
          ))}
        </div>
        {items.length === 0 && (
          <div class="category-empty">{t.errorNoItems}</div>
        )}
      </div>
    )
  }

  return (
    <div class="category-screen" ref={containerRef}>
      <h1 class="category-title">{t.menuBookmarks}</h1>
      <div class="bookmarks-folders">
        {folders.map((folder, index) => (
          <div
            key={folder.id}
            class={`bookmarks-folder ${focusedIndex === index ? 'focused' : ''}`}
            onClick={() => loadFolderItems(folder)}
          >
            <div class="bookmarks-folder-title">{folder.title}</div>
            <div class="bookmarks-folder-count">{folder.count}</div>
          </div>
        ))}
      </div>
      {folders.length === 0 && (
        <div class="category-empty">{t.errorNoItems}</div>
      )}
    </div>
  )
}
