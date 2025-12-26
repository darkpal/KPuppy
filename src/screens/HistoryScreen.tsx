import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import { getHistory, clearHistoryForItem, HistoryItem } from '../api/kinopub'
import { MovieCard } from '../components/MovieCard'
import { VirtualGrid } from '../components/VirtualGrid'
import { useKeyboardNavigation, useItemsPerRow } from '../hooks'
import { useI18n } from '../i18n'
import '../styles/category.css'

interface HistoryScreenProps {
  onSelectItem: (itemId: number) => void
  onNavigateToMenu: () => void
  isActive: boolean
}

export function HistoryScreen({ onSelectItem, onNavigateToMenu, isActive }: HistoryScreenProps) {
  const { t } = useI18n()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const itemsPerRow = useItemsPerRow('.category-grid', [items.length])

  useEffect(() => {
    async function loadHistory() {
      setLoading(true)
      try {
        const data = await getHistory()
        setItems(data)
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load history:', err)
      } finally {
        setLoading(false)
      }
    }
    loadHistory()
  }, [])

  const handleClearItem = useCallback(async () => {
    if (actionLoading || items.length === 0) return
    const item = items[focusedIndex]
    if (!item) return
    setActionLoading(true)
    try {
      await clearHistoryForItem(item.id)
      setItems(prev => prev.filter(i => i.id !== item.id))
      setFocusedIndex(prev => Math.min(prev, items.length - 2))
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to clear history item:', err)
    } finally {
      setActionLoading(false)
    }
  }, [items, focusedIndex, actionLoading])

  const handlers = useMemo(() => {
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
      onRed: handleClearItem
    }
  }, [items, focusedIndex, onNavigateToMenu, onSelectItem, itemsPerRow, handleClearItem])

  useKeyboardNavigation(handlers, isActive && !loading)

  const renderItem = useCallback((item: HistoryItem, _index: number, focused: boolean) => {
    const isSeriesType = ['serial', 'docuserial', 'tvshow'].includes(item.type)
    return (
      <MovieCard
        movie={item}
        focused={focused}
        onSelect={() => onSelectItem(item.id)}
        episodeInfo={isSeriesType ? item.episodeInfo : undefined}
      />
    )
  }, [onSelectItem])

  if (loading) {
    return (
      <div class="category-screen">
        <h1 class="category-title">{t.menuHistory}</h1>
        <div class="category-loading">
          <div class="category-spinner" />
        </div>
      </div>
    )
  }

  return (
    <div class="category-screen" ref={containerRef}>
      <h1 class="category-title">{t.menuHistory}</h1>
      <VirtualGrid
        items={items}
        focusedIndex={focusedIndex}
        itemsPerRow={itemsPerRow}
        renderItem={renderItem}
        getItemKey={(item) => `${item.id}-${item.watchedAt}`}
        emptyMessage={t.errorNoItems}
      />
    </div>
  )
}
