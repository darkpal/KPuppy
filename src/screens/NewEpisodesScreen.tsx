import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import { getWatchingSerials, WatchingItem } from '../api/kinopub'
import { MovieCard } from '../components/MovieCard'
import { VirtualGrid } from '../components/VirtualGrid'
import { useKeyboardNavigation, useItemsPerRow } from '../hooks'
import { useI18n } from '../i18n'
import '../styles/category.css'

interface NewEpisodesScreenProps {
  onSelectItem: (itemId: number) => void
  onNavigateToMenu: () => void
  isActive: boolean
}

export function NewEpisodesScreen({ onSelectItem, onNavigateToMenu, isActive }: NewEpisodesScreenProps) {
  const { t } = useI18n()
  const [items, setItems] = useState<WatchingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const itemsPerRow = useItemsPerRow('.category-grid', [items.length])

  useEffect(() => {
    async function loadNewEpisodes() {
      setLoading(true)
      try {
        const data = await getWatchingSerials()
        const withNewEpisodes = data.filter(item => item.new > 0)
        setItems(withNewEpisodes)
      } catch (err) {
        console.error('Failed to load new episodes:', err)
      } finally {
        setLoading(false)
      }
    }
    loadNewEpisodes()
  }, [])

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
      }
    }
  }, [items, focusedIndex, onNavigateToMenu, onSelectItem, itemsPerRow])

  useKeyboardNavigation(handlers, isActive && !loading)

  const renderItem = useCallback((item: WatchingItem, _index: number, focused: boolean) => {
    const newEpisodes = item.new || 0
    const badge = newEpisodes > 0
      ? `${newEpisodes} ${t.newEpisodesCount}`
      : undefined
    return (
      <MovieCard
        movie={{
          id: item.id,
          title: item.title,
          type: item.type,
          posters: item.posters,
          year: item.year,
          plot: '',
          rating: 0,
          imdbRating: 0,
          kinopoiskRating: 0,
          views: 0
        }}
        focused={focused}
        onSelect={() => onSelectItem(item.id)}
        badge={badge}
      />
    )
  }, [onSelectItem, t])

  if (loading) {
    return (
      <div class="category-screen">
        <h1 class="category-title">{t.menuNewEpisodes}</h1>
        <div class="category-loading">
          <div class="category-spinner" />
        </div>
      </div>
    )
  }

  return (
    <div class="category-screen" ref={containerRef}>
      <h1 class="category-title">{t.menuNewEpisodes}</h1>
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
