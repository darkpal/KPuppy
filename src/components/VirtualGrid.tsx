import { useCallback, useEffect, useState } from 'preact/hooks'
import { ComponentChildren } from 'preact'

interface VirtualGridProps<T> {
  items: T[]
  focusedIndex: number
  itemsPerRow: number
  itemHeight?: number
  renderBuffer?: number
  renderItem: (item: T, index: number, focused: boolean) => ComponentChildren
  getItemKey: (item: T, index: number) => string | number
  containerClass?: string
  emptyMessage?: string
}

export function VirtualGrid<T>({
  items,
  focusedIndex,
  itemsPerRow,
  itemHeight = 500,
  renderBuffer = 24,
  renderItem,
  getItemKey,
  containerClass = 'category-grid',
  emptyMessage
}: VirtualGridProps<T>) {
  const [, setScrollTrigger] = useState(0)

  const getVisibleRange = useCallback(() => {
    const focusedRow = Math.floor(focusedIndex / itemsPerRow)
    const bufferRows = Math.ceil(renderBuffer / itemsPerRow)
    const startRow = Math.max(0, focusedRow - bufferRows)
    const endRow = focusedRow + bufferRows + 1
    const startIndex = startRow * itemsPerRow
    const endIndex = Math.min(items.length, endRow * itemsPerRow)
    return { startIndex, endIndex, startRow }
  }, [focusedIndex, itemsPerRow, items.length, renderBuffer])

  useEffect(() => {
    const container = document.querySelector('.category-screen') as HTMLElement
    if (container && items.length > 0) {
      const focusedRow = Math.floor(focusedIndex / itemsPerRow)
      const targetScroll = focusedRow * itemHeight - container.clientHeight / 2 + itemHeight / 2
      container.scrollTop = Math.max(0, targetScroll)
    }
    setScrollTrigger(prev => prev + 1)
  }, [focusedIndex, itemsPerRow, itemHeight, items.length])

  if (items.length === 0 && emptyMessage) {
    return <div class="category-empty">{emptyMessage}</div>
  }

  const { startIndex, endIndex, startRow } = getVisibleRange()
  const visibleItems = items.slice(startIndex, endIndex)
  const totalHeight = Math.ceil(items.length / itemsPerRow) * itemHeight

  return (
    <div
      class="category-grid-container"
      style={{ height: `${totalHeight}px`, position: 'relative' }}
    >
      <div
        class={containerClass}
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
            <div key={getItemKey(item, actualIndex)} data-category-index={actualIndex}>
              {renderItem(item, actualIndex, focusedIndex === actualIndex)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
