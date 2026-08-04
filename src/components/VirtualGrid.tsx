import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { ComponentChildren, RefObject } from 'preact'

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
  /** Scrollable parent; falls back to closest .category-screen */
  scrollContainerRef?: RefObject<HTMLElement>
}

export function VirtualGrid<T>({
  items,
  focusedIndex,
  itemsPerRow,
  itemHeight = 360,
  renderBuffer = 48,
  renderItem,
  getItemKey,
  containerClass = 'category-grid',
  emptyMessage,
  cardWidth,
  scrollContainerRef
}: VirtualGridProps<T>) {
  const [measuredRowHeight, setMeasuredRowHeight] = useState(0)
  const rowHeight = measuredRowHeight || itemHeight
  const rootRef = useRef<HTMLDivElement>(null)

  // Stale row height after side-menu expand makes totalHeight too small → sections overlap.
  useEffect(() => {
    setMeasuredRowHeight(0)
  }, [itemsPerRow, cardWidth])

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
    const root = rootRef.current
    if (!root || items.length === 0) return

    const cells = root.querySelectorAll('[data-category-index]')
    if (cells.length > itemsPerRow) {
      const firstRowTop = cells[0].getBoundingClientRect().top
      const secondRowTop = cells[itemsPerRow].getBoundingClientRect().top
      const measured = secondRowTop - firstRowTop
      if (measured > 0 && Math.abs(measured - rowHeight) > 1) {
        setMeasuredRowHeight(measured)
      }
    } else if (cells.length > 0) {
      const measured = cells[0].getBoundingClientRect().height + 32
      if (measured > 32 && Math.abs(measured - rowHeight) > 1) {
        setMeasuredRowHeight(measured)
      }
    }
  }, [focusedIndex, itemsPerRow, rowHeight, items.length, cardWidth])

  useEffect(() => {
    const root = rootRef.current
    if (!root || items.length === 0) return

    const container = (scrollContainerRef?.current
      || root.closest('.category-screen')) as HTMLElement | null
    if (!container) return

    const focusedCell = root.querySelector(`[data-category-index="${focusedIndex}"]`) as HTMLElement
    if (!focusedCell) return

    const containerTop = container.getBoundingClientRect().top
    const cellRect = focusedCell.getBoundingClientRect()
    const cellTop = cellRect.top - containerTop + container.scrollTop
    const cellBottom = cellTop + cellRect.height
    const viewTop = container.scrollTop
    const viewBottom = viewTop + container.clientHeight
    const pad = 24

    if (cellTop < viewTop + pad) {
      container.scrollTop = Math.max(0, cellTop - pad)
    } else if (cellBottom > viewBottom - pad) {
      container.scrollTop = cellBottom - container.clientHeight + pad
    }
  }, [focusedIndex, itemsPerRow, rowHeight, items.length, cardWidth, scrollContainerRef])

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
