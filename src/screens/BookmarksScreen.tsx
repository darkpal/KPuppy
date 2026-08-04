import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import { getBookmarkFolders, getBookmarkItems, createBookmarkFolder, deleteBookmarkFolder, removeFromBookmark, BookmarkFolder, MovieItem } from '../api/kinopub'
import { MovieCard } from '../components/MovieCard'
import { GridScreen } from '../components/GridScreen'
import { useKeyboardNavigation, useGridLayout, createGridNavigationHandlers, useScrollToFocused } from '../hooks'
import { LoadingState } from '../components/LoadingSpinner'
import { useI18n } from '../i18n'
import '../styles/category.css'
import '../styles/bookmarks.css'

const BOOKMARKS_PER_PAGE = 50

interface BookmarksScreenProps {
  onSelectItem: (itemId: number, preview?: MovieItem) => void
  onNavigateToMenu: () => void
  isActive: boolean
  initialFolderId?: number | null
  initialFolderIndex?: number
  initialItemIndex?: number
  onStateChange?: (state: {
    folderId: number | null
    folderIndex: number
    itemIndex: number
  }) => void
}

type ViewMode = 'folders' | 'items'

export function BookmarksScreen({
  onSelectItem,
  onNavigateToMenu,
  isActive,
  initialFolderId = null,
  initialFolderIndex = 0,
  initialItemIndex = 0,
  onStateChange
}: BookmarksScreenProps) {
  const { t } = useI18n()
  const [folders, setFolders] = useState<BookmarkFolder[]>([])
  const [items, setItems] = useState<MovieItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(initialFolderId != null ? 'items' : 'folders')
  const [selectedFolder, setSelectedFolder] = useState<BookmarkFolder | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(
    initialFolderId != null ? initialItemIndex : initialFolderIndex
  )
  const [scrollWithFocus, setScrollWithFocus] = useState(true)
  const [savedFolderIndex, setSavedFolderIndex] = useState(initialFolderIndex)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [dialogFocusIndex, setDialogFocusIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const onStateChangeRef = useRef(onStateChange)
  onStateChangeRef.current = onStateChange
  const restoredFolderRef = useRef(false)
  const initialItemIndexRef = useRef(initialItemIndex)
  const { itemsPerRow, cardWidth } = useGridLayout('.category-grid', 240, [items.length, viewMode])

  const emitState = useCallback((folderId: number | null, folderIndex: number, itemIndex: number) => {
    onStateChangeRef.current?.({ folderId, folderIndex, itemIndex })
  }, [])

  const loadFolderItemsPage = useCallback(async (
    folder: BookmarkFolder,
    folderIndex: number,
    page: number,
    append: boolean,
    focusIndex?: number
  ) => {
    if (page > 1) {
      setLoadingMore(true)
    } else if (!append) {
      setLoading(true)
    }
    setSavedFolderIndex(folderIndex)
    try {
      const response = await getBookmarkItems(folder.id, page, BOOKMARKS_PER_PAGE)
      setItems(prev => {
        if (!append) return response.items
        const seen = new Set(prev.map(i => i.id))
        return [...prev, ...response.items.filter(i => !seen.has(i.id))]
      })
      setHasMore(page < response.pagination.total)
      setCurrentPage(page)
      setSelectedFolder(folder)
      setViewMode('items')
      if (!append) {
        const safeFocus = Math.min(
          Math.max(0, focusIndex ?? 0),
          Math.max(0, response.items.length - 1)
        )
        setFocusedIndex(safeFocus)
        emitState(folder.id, folderIndex, safeFocus)
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load bookmark items:', err)
      if (!append) {
        setItems([])
        setHasMore(false)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [emitState])

  // Load folders once on mount. Do NOT re-run when parent echoes focus via
  // onStateChange — that was causing a full-page spinner from ~row 3.
  useEffect(() => {
    let cancelled = false
    async function loadFolders() {
      setLoading(true)
      try {
        const data = await getBookmarkFolders()
        if (cancelled) return
        setFolders(data)

        if (!restoredFolderRef.current && initialFolderId != null) {
          restoredFolderRef.current = true
          const folder = data.find(f => f.id === initialFolderId) || null
          const folderIndex = folder
            ? Math.max(0, data.findIndex(f => f.id === initialFolderId))
            : initialFolderIndex
          if (folder) {
            await loadFolderItemsPage(
              folder,
              folderIndex,
              1,
              false,
              initialItemIndexRef.current
            )
            return
          }
          setViewMode('folders')
          setFocusedIndex(folderIndex)
          emitState(null, folderIndex, 0)
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load bookmarks:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadFolders()
    return () => {
      cancelled = true
    }
    // intentionally mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (viewMode === 'folders') {
      emitState(null, focusedIndex, 0)
    } else if (selectedFolder) {
      emitState(selectedFolder.id, savedFolderIndex, focusedIndex)
    }
  }, [viewMode, focusedIndex, selectedFolder, savedFolderIndex, emitState])

  const loadFolderItems = useCallback((folder: BookmarkFolder, folderIndex: number) => {
    return loadFolderItemsPage(folder, folderIndex, 1, false, 0)
  }, [loadFolderItemsPage])

  const loadMore = useCallback(() => {
    if (!selectedFolder || loadingMore || !hasMore) return
    loadFolderItemsPage(selectedFolder, savedFolderIndex, currentPage + 1, true)
  }, [selectedFolder, loadingMore, hasMore, savedFolderIndex, currentPage, loadFolderItemsPage])

  const goBackToFolders = useCallback(() => {
    setViewMode('folders')
    setSelectedFolder(null)
    setItems([])
    setHasMore(false)
    setCurrentPage(1)
    setFocusedIndex(savedFolderIndex)
    emitState(null, savedFolderIndex, 0)
  }, [savedFolderIndex, emitState])

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim() || actionLoading) return
    setActionLoading(true)
    try {
      const folder = await createBookmarkFolder(newFolderName.trim())
      setFolders(prev => [...prev, folder])
      setNewFolderName('')
      setShowCreateDialog(false)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to create folder:', err)
    } finally {
      setActionLoading(false)
    }
  }, [newFolderName, actionLoading])

  const handleDeleteFolder = useCallback(async () => {
    const folder = folders[focusedIndex]
    if (!folder || actionLoading) return
    setActionLoading(true)
    try {
      await deleteBookmarkFolder(folder.id)
      setFolders(prev => prev.filter(f => f.id !== folder.id))
      setShowDeleteConfirm(false)
      setFocusedIndex(prev => Math.max(0, Math.min(prev, folders.length - 2)))
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to delete folder:', err)
    } finally {
      setActionLoading(false)
    }
  }, [folders, focusedIndex, actionLoading])

  const handleRemoveItem = useCallback(async () => {
    if (!selectedFolder || actionLoading) return
    const item = items[focusedIndex]
    if (!item) return
    setActionLoading(true)
    try {
      await removeFromBookmark(item.id, selectedFolder.id)
      setItems(prev => prev.filter(i => i.id !== item.id))
      setFocusedIndex(prev => Math.max(0, Math.min(prev, items.length - 2)))
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to remove bookmark item:', err)
    } finally {
      setActionLoading(false)
    }
  }, [selectedFolder, items, focusedIndex, actionLoading])

  const foldersHandlers = useMemo(() => {
    if (showCreateDialog || showDeleteConfirm) {
      return {
        onLeft: () => setDialogFocusIndex(prev => Math.max(0, prev - 1)),
        onRight: () => setDialogFocusIndex(prev => Math.min(2, prev + 1)),
        onEnter: () => {
          if (showCreateDialog) {
            if (dialogFocusIndex <= 1) setShowCreateDialog(false)
            else handleCreateFolder()
          } else if (showDeleteConfirm) {
            if (dialogFocusIndex === 0) setShowDeleteConfirm(false)
            else handleDeleteFolder()
          }
        },
        onBack: () => {
          setShowCreateDialog(false)
          setShowDeleteConfirm(false)
        }
      }
    }

    return {
      onLeft: onNavigateToMenu,
      onUp: () => {
        setScrollWithFocus(true)
        setFocusedIndex(prev => Math.max(0, prev - 1))
      },
      onDown: () => {
        setScrollWithFocus(true)
        setFocusedIndex(prev => Math.min(folders.length, prev + 1))
      },
      onEnter: () => {
        if (focusedIndex === folders.length) {
          setShowCreateDialog(true)
          setNewFolderName(t.newFolderName)
          setDialogFocusIndex(0)
        } else {
          const folder = folders[focusedIndex]
          if (folder) {
            loadFolderItems(folder, focusedIndex)
          }
        }
      },
      onRed: () => {
        if (folders[focusedIndex]) {
          setShowDeleteConfirm(true)
          setDialogFocusIndex(1)
        }
      }
    }
  }, [folders, focusedIndex, onNavigateToMenu, loadFolderItems, showCreateDialog, showDeleteConfirm, handleCreateFolder, handleDeleteFolder, t, dialogFocusIndex])

  const itemsHandlers = useMemo(() => {
    const currentRow = Math.floor(focusedIndex / itemsPerRow)
    const totalRows = Math.ceil(items.length / itemsPerRow)
    const gridHandlers = createGridNavigationHandlers({
      itemCount: items.length,
      itemsPerRow,
      focusedIndex,
      setFocusedIndex: (index) => {
        setScrollWithFocus(true)
        setFocusedIndex(index)
      },
      onSelect: (index) => {
        const item = items[index]
        if (item) {
          onSelectItem(item.id, item)
        }
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
        if (currentRow >= totalRows - 2 && hasMore) {
          loadMore()
        }
      },
      onBack: goBackToFolders,
      onRed: handleRemoveItem
    }
  }, [items, focusedIndex, onNavigateToMenu, onSelectItem, itemsPerRow, goBackToFolders, handleRemoveItem, hasMore, loadMore])

  useKeyboardNavigation(
    viewMode === 'folders' ? foldersHandlers : itemsHandlers,
    isActive && !loading
  )

  useScrollToFocused({
    containerRef,
    focusedIndex,
    itemSelector: '.bookmarks-folder',
    direction: 'vertical',
    center: false,
    itemCount: folders.length + 1,
    enabled: isActive && !loading && viewMode === 'folders' && scrollWithFocus
  })

  const renderItem = useCallback((item: MovieItem, index: number, focused: boolean) => (
    <MovieCard
      movie={item}
      focused={focused}
      onHover={() => {
        setScrollWithFocus(false)
        setFocusedIndex(index)
      }}
      onSelect={() => onSelectItem(item.id, item)}
    />
  ), [onSelectItem])

  if (loading && viewMode === 'folders') {
    return (
      <div class="category-screen">
        <h1 class="category-title">{t.menuBookmarks}</h1>
        <LoadingState />
      </div>
    )
  }

  if (loading && viewMode === 'items') {
    return (
      <div class="category-screen">
        <h1 class="category-title">{selectedFolder?.title || t.menuBookmarks}</h1>
        <LoadingState />
      </div>
    )
  }

  if (viewMode === 'items' && selectedFolder) {
    return (
      <GridScreen
        title={selectedFolder.title}
        loading={false}
        items={items}
        focusedIndex={focusedIndex}
        itemsPerRow={itemsPerRow}
        scrollToFocused={scrollWithFocus}
        renderItem={renderItem}
        getItemKey={(item) => item.id}
        emptyMessage={t.errorNoItems}
        containerRef={containerRef}
        cardWidth={cardWidth}
        footer={loadingMore ? (
          <div class="category-loading-more">
            <LoadingState />
          </div>
        ) : null}
      />
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
            onMouseEnter={() => {
              setScrollWithFocus(false)
              setFocusedIndex(index)
            }}
            onClick={() => loadFolderItems(folder, index)}
          >
            <div class="bookmarks-folder-title">{folder.title}</div>
            <div class="bookmarks-folder-count">{folder.count}</div>
          </div>
        ))}
        <div
          class={`bookmarks-folder bookmarks-folder-create ${focusedIndex === folders.length ? 'focused' : ''}`}
          onMouseEnter={() => {
            setScrollWithFocus(false)
            setFocusedIndex(folders.length)
          }}
          onClick={() => {
            setShowCreateDialog(true)
            setNewFolderName(t.newFolderName)
          }}
        >
          <div class="bookmarks-folder-title">+ {t.createFolder}</div>
        </div>
      </div>
      {folders.length > 0 && (
        <div class="bookmarks-hint">{t.deleteFolder}: Red</div>
      )}

      {showCreateDialog && (
        <div class="bookmarks-dialog-overlay">
          <div class="bookmarks-dialog">
            <h2>{t.createFolder}</h2>
            <input
              type="text"
              class={`bookmarks-dialog-input ${dialogFocusIndex === 0 ? 'focused' : ''}`}
              value={newFolderName}
              onInput={(e) => setNewFolderName((e.target as HTMLInputElement).value)}
            />
            <div class="bookmarks-dialog-buttons">
              <button
                class={`bookmarks-dialog-button ${dialogFocusIndex === 1 ? 'focused' : ''}`}
                onClick={() => setShowCreateDialog(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                class={`bookmarks-dialog-button bookmarks-dialog-button-primary ${dialogFocusIndex === 2 ? 'focused' : ''}`}
                onClick={handleCreateFolder}
                disabled={actionLoading || !newFolderName.trim()}
              >
                {actionLoading ? '...' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div class="bookmarks-dialog-overlay">
          <div class="bookmarks-dialog">
            <h2>{t.deleteFolder}</h2>
            <p>{t.confirmDelete}</p>
            <p class="bookmarks-dialog-folder-name">{folders[focusedIndex]?.title}</p>
            <div class="bookmarks-dialog-buttons">
              <button
                class={`bookmarks-dialog-button ${dialogFocusIndex === 0 ? 'focused' : ''}`}
                onClick={() => setShowDeleteConfirm(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                class={`bookmarks-dialog-button bookmarks-dialog-button-danger ${dialogFocusIndex === 1 ? 'focused' : ''}`}
                onClick={handleDeleteFolder}
                disabled={actionLoading}
              >
                {actionLoading ? '...' : t.deleteFolder}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
