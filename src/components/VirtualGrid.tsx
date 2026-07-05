import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
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
  cardWidth?: number
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
  emptyMessage,
  cardWidth
}: VirtualGridProps<T>) {
  const [measuredRowHeight, setMeasuredRowHeight] = useState(0)
  const rowHeight = measuredRowHeight || itemHeight
  const rootRef = useRef<HTMLDivElement>(null)

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
    const root = rootRef.current
    if (!container || !root || items.length === 0) return

    const cells = root.querySelectorAll('[data-category-index]')
    if (cells.length > itemsPerRow) {
      const firstRowTop = cells[0].getBoundingClientRect().top
      const secondRowTop = cells[itemsPerRow].getBoundingClientRect().top
      const measured = secondRowTop - firstRowTop
      if (measured > 0 && Math.abs(measured - rowHeight) > 1) {
        setMeasuredRowHeight(measured)
        return
      }
    } else if (cells.length > 0) {
      const measured = cells[0].getBoundingClientRect().height + 32
      if (measured > 32 && Math.abs(measured - rowHeight) > 1) {
        setMeasuredRowHeight(measured)
        return
      }
    }

    const focusedCell = root.querySelector(`[data-category-index="${focusedIndex}"]`) as HTMLElement
    if (focusedCell) {
      const containerTop = container.getBoundingClientRect().top
      const cellRect = focusedCell.getBoundingClientRect()
      const cellTop = cellRect.top - containerTop + container.scrollTop
      container.scrollTop = Math.max(0, cellTop - container.clientHeight / 2 + cellRect.height / 2)
    }
  }, [focusedIndex, itemsPerRow, rowHeight, items.length, cardWidth])

  if (items.length === 0 && emptyMessage) {
    return <div class="category-empty">{emptyMessage}</div>
  }

  const { startIndex, endIndex, startRow } = getVisibleRange()
  const visibleItems = items.slice(startIndex, endIndex)
  const totalHeight = Math.ceil(items.length / itemsPerRow) * rowHeight

  return (
    <div
      class="category-grid-container"
      ref={rootRef}
      style={{ height: `${totalHeight}px`, position: 'relative' }}
    >
      <div
        class={containerClass}
        style={{
          position: 'absolute',
          top: `${startRow * rowHeight}px`,
          left: 0,
          right: 0,
          ...(cardWidth ? { '--card-width': `${cardWidth}px` } : {})
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
