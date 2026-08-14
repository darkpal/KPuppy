import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
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
  /** Scrollable parent; falls back to .category-scroll or .category-screen */
  scrollContainerRef?: RefObject<HTMLElement>
  /** When false, skip auto-scroll (pointer hover must not edge-cascade). */
  scrollToFocused?: boolean
}

function resolveScrollContainer(
  root: HTMLElement | null,
  scrollContainerRef?: RefObject<HTMLElement>
): HTMLElement | null {
  if (!root) return null
  return (scrollContainerRef?.current
    || root.closest('.category-scroll')
    || root.closest('.category-screen')) as HTMLElement | null
}

export function VirtualGrid<T>({
  items,
  focusedIndex,
  itemsPerRow,
  itemHeight = 420,
  renderBuffer = 48,
  renderItem,
  getItemKey,
  containerClass = 'category-grid',
  emptyMessage,
  cardWidth,
  scrollContainerRef,
  scrollToFocused = true
}: VirtualGridProps<T>) {
  const [measuredRowHeight, setMeasuredRowHeight] = useState(0)
  const rowHeight = measuredRowHeight || itemHeight
  const rootRef = useRef<HTMLDivElement>(null)
  const [scrollMetrics, setScrollMetrics] = useState({ top: 0, height: 800 })

  // Stale row height after side-menu expand makes totalHeight too small → sections overlap.
  useEffect(() => {
    setMeasuredRowHeight(0)
  }, [itemsPerRow, cardWidth])

  // Virtualize from scroll position so wheel/pointer scroll works on large lists.
  useEffect(() => {
    const root = rootRef.current
    const container = resolveScrollContainer(root, scrollContainerRef)
    if (!container) return

    let frame = 0
    const sync = () => {
      frame = 0
      setScrollMetrics(prev => {
        const top = container.scrollTop
        const height = container.clientHeight || 800
        if (prev.top === top && prev.height === height) return prev
        return { top, height }
      })
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(sync)
    }

    sync()
    container.addEventListener('scroll', onScroll)
    window.addEventListener('resize', onScroll)
    window.addEventListener('kpuppy-content-resize', onScroll)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      container.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('kpuppy-content-resize', onScroll)
    }
  }, [scrollContainerRef, items.length, itemsPerRow, cardWidth])

  const getVisibleRange = useCallback(() => {
    const bufferRows = Math.ceil(renderBuffer / itemsPerRow)
    const totalRows = Math.max(1, Math.ceil(items.length / itemsPerRow))
    let startRow = Math.max(0, Math.floor(scrollMetrics.top / rowHeight) - bufferRows)
    let endRow = Math.min(
      totalRows,
      Math.ceil((scrollMetrics.top + scrollMetrics.height) / rowHeight) + bufferRows
    )
    // Keep the focused cell mounted for D-pad / scroll-into-view, without
    // expanding to the entire list when focus is far from the viewport.
    const focusedRow = Math.floor(Math.max(0, Math.min(focusedIndex, Math.max(0, items.length - 1))) / itemsPerRow)
    if (focusedRow < startRow) startRow = Math.max(0, focusedRow - bufferRows)
    if (focusedRow >= endRow) endRow = Math.min(totalRows, focusedRow + bufferRows + 1)
    const startIndex = startRow * itemsPerRow
    const endIndex = Math.min(items.length, endRow * itemsPerRow)
    return { startIndex, endIndex, startRow }
  }, [focusedIndex, itemsPerRow, items.length, renderBuffer, rowHeight, scrollMetrics.height, scrollMetrics.top])

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
  }, [focusedIndex, itemsPerRow, rowHeight, items.length, cardWidth, scrollMetrics.top])

  // Keep the same row under the viewport when measured height replaces the estimate.
  const appliedHeightRef = useRef(itemHeight)
  useLayoutEffect(() => {
    const next = measuredRowHeight || itemHeight
    const prev = appliedHeightRef.current
    if (prev > 0 && Math.abs(next - prev) > 1) {
      const container = resolveScrollContainer(rootRef.current, scrollContainerRef)
      if (container) {
        container.scrollTop = container.scrollTop * (next / prev)
      }
    }
    appliedHeightRef.current = next
  }, [measuredRowHeight, itemHeight, scrollContainerRef])

  useEffect(() => {
    if (!scrollToFocused) return
    const root = rootRef.current
    if (!root || items.length === 0) return

    const container = resolveScrollContainer(root, scrollContainerRef)
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
  }, [focusedIndex, itemsPerRow, rowHeight, items.length, cardWidth, scrollContainerRef, scrollToFocused])

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
