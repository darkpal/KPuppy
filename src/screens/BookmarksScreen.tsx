import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import { getBookmarkFolders, getBookmarkItems, createBookmarkFolder, deleteBookmarkFolder, removeFromBookmark, BookmarkFolder, MovieItem } from '../api/kinopub'
import { MovieCard } from '../components/MovieCard'
import { VirtualGrid } from '../components/VirtualGrid'
import { useKeyboardNavigation, useItemsPerRow } from '../hooks'
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
  const [savedFolderIndex, setSavedFolderIndex] = useState(0)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [dialogFocusIndex, setDialogFocusIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const itemsPerRow = useItemsPerRow('.category-grid', [items.length, viewMode])

  useEffect(() => {
    async function loadFolders() {
      setLoading(true)
      try {
        const data = await getBookmarkFolders()
        setFolders(data)
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load bookmarks:', err)
      } finally {
        setLoading(false)
      }
    }
    loadFolders()
  }, [])

  const loadFolderItems = useCallback(async (folder: BookmarkFolder, folderIndex: number) => {
    setLoading(true)
    setSavedFolderIndex(folderIndex)
    try {
      const data = await getBookmarkItems(folder.id)
      setItems(data)
      setSelectedFolder(folder)
      setViewMode('items')
      setFocusedIndex(0)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load bookmark items:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const goBackToFolders = useCallback(() => {
    setViewMode('folders')
    setSelectedFolder(null)
    setItems([])
    setFocusedIndex(savedFolderIndex)
  }, [savedFolderIndex])

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
      setFocusedIndex(prev => Math.max(0, prev - 1))
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
      setFocusedIndex(prev => Math.min(prev, items.length - 2))
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to remove item:', err)
    } finally {
      setActionLoading(false)
    }
  }, [selectedFolder, items, focusedIndex, actionLoading])

  const foldersHandlers = useMemo(() => {
    if (showCreateDialog) {
      return {
        onBack: () => {
          setShowCreateDialog(false)
          setDialogFocusIndex(0)
          const input = document.querySelector('.bookmarks-dialog-input') as HTMLInputElement
          if (input) input.blur()
        },
        onUp: () => {
          if (dialogFocusIndex > 0) {
            setDialogFocusIndex(prev => prev - 1)
          }
        },
        onDown: () => {
          if (dialogFocusIndex < 2) {
            setDialogFocusIndex(prev => prev + 1)
            if (dialogFocusIndex === 0) {
              const input = document.querySelector('.bookmarks-dialog-input') as HTMLInputElement
              if (input) input.blur()
            }
          }
        },
        onLeft: () => {
          if (dialogFocusIndex === 2) setDialogFocusIndex(1)
        },
        onRight: () => {
          if (dialogFocusIndex === 1) setDialogFocusIndex(2)
        },
        onEnter: () => {
          if (dialogFocusIndex === 0) {
            const input = document.querySelector('.bookmarks-dialog-input') as HTMLInputElement
            if (input) input.focus()
          } else if (dialogFocusIndex === 1) {
            setShowCreateDialog(false)
            setDialogFocusIndex(0)
          } else {
            handleCreateFolder()
          }
        }
      }
    }
    if (showDeleteConfirm) {
      return {
        onBack: () => {
          setShowDeleteConfirm(false)
          setDialogFocusIndex(0)
        },
        onLeft: () => setDialogFocusIndex(0),
        onRight: () => setDialogFocusIndex(1),
        onEnter: () => {
          if (dialogFocusIndex === 0) {
            setShowDeleteConfirm(false)
            setDialogFocusIndex(0)
          } else {
            handleDeleteFolder()
          }
        }
      }
    }
    return {
      onLeft: onNavigateToMenu,
      onUp: () => setFocusedIndex(prev => Math.max(0, prev - 1)),
      onDown: () => setFocusedIndex(prev => Math.min(folders.length, prev + 1)),
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
      onBack: goBackToFolders,
      onRed: handleRemoveItem
    }
  }, [items, focusedIndex, onNavigateToMenu, onSelectItem, itemsPerRow, goBackToFolders, handleRemoveItem])

  useKeyboardNavigation(
    viewMode === 'folders' ? foldersHandlers : itemsHandlers,
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
        <VirtualGrid
          items={items}
          focusedIndex={focusedIndex}
          itemsPerRow={itemsPerRow}
          renderItem={renderItem}
          getItemKey={(item) => item.id}
          emptyMessage={t.errorNoItems}
        />
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
            onClick={() => loadFolderItems(folder, index)}
          >
            <div class="bookmarks-folder-title">{folder.title}</div>
            <div class="bookmarks-folder-count">{folder.count}</div>
          </div>
        ))}
        <div
          class={`bookmarks-folder bookmarks-folder-create ${focusedIndex === folders.length ? 'focused' : ''}`}
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
