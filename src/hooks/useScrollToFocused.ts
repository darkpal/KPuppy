import { useEffect } from 'preact/hooks'
import { RefObject } from 'preact'

interface UseScrollToFocusedOptions {
  containerRef: RefObject<HTMLElement>
  focusedIndex: number | null
  itemSelector: string
  direction?: 'vertical' | 'horizontal'
  center?: boolean
  itemCount?: number
  /** When false, skip auto-scroll (e.g. Magic Remote hover must not edge-cascade). */
  enabled?: boolean
}

export function useScrollToFocused({
  containerRef,
  focusedIndex,
  itemSelector,
  direction = 'vertical',
  center = true,
  itemCount,
  enabled = true
}: UseScrollToFocusedOptions): void {
  useEffect(() => {
    if (!enabled) return

    const container = containerRef.current
    if (!container || focusedIndex === null) return

    const items = container.querySelectorAll(itemSelector)
    const focusedItem = items[focusedIndex] as HTMLElement
    if (!focusedItem) return

    const containerRect = container.getBoundingClientRect()
    const itemRect = focusedItem.getBoundingClientRect()

    if (direction === 'vertical') {
      const itemTop = itemRect.top - containerRect.top + container.scrollTop
      const itemBottom = itemTop + itemRect.height

      if (center) {
        container.scrollTop = Math.max(0, itemTop - (container.clientHeight - itemRect.height) / 2)
      } else if (itemTop < container.scrollTop) {
        container.scrollTop = itemTop
      } else if (itemBottom > container.scrollTop + container.clientHeight) {
        container.scrollTop = itemBottom - container.clientHeight
      }
    } else {
      const itemLeft = itemRect.left - containerRect.left + container.scrollLeft
      const itemRight = itemLeft + itemRect.width

      if (center) {
        container.scrollLeft = Math.max(0, itemLeft - (container.clientWidth - itemRect.width) / 2)
      } else if (itemLeft < container.scrollLeft) {
        container.scrollLeft = itemLeft
      } else if (itemRight > container.scrollLeft + container.clientWidth) {
        container.scrollLeft = itemRight - container.clientWidth
      }
    }
  }, [containerRef, focusedIndex, itemSelector, direction, center, itemCount, enabled])
}
