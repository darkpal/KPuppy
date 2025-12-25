import { useEffect } from 'preact/hooks'
import { RefObject } from 'preact'

interface UseScrollToFocusedOptions {
  containerRef: RefObject<HTMLElement>
  focusedIndex: number
  itemSelector: string
  direction?: 'vertical' | 'horizontal'
  center?: boolean
}

export function useScrollToFocused({
  containerRef,
  focusedIndex,
  itemSelector,
  direction = 'vertical',
  center = true
}: UseScrollToFocusedOptions): void {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const items = container.querySelectorAll(itemSelector)
    const focusedItem = items[focusedIndex] as HTMLElement
    if (!focusedItem) return

    if (direction === 'vertical') {
      const itemTop = focusedItem.offsetTop
      const containerHeight = container.clientHeight
      const itemHeight = focusedItem.clientHeight

      if (center) {
        container.scrollTop = itemTop - (containerHeight / 2) + (itemHeight / 2)
      } else {
        const itemBottom = itemTop + itemHeight
        const scrollTop = container.scrollTop
        const scrollBottom = scrollTop + containerHeight

        if (itemTop < scrollTop) {
          container.scrollTop = itemTop
        } else if (itemBottom > scrollBottom) {
          container.scrollTop = itemBottom - containerHeight
        }
      }
    } else {
      const itemLeft = focusedItem.offsetLeft
      const containerWidth = container.clientWidth
      const itemWidth = focusedItem.clientWidth

      if (center) {
        container.scrollLeft = itemLeft - (containerWidth / 2) + (itemWidth / 2)
      } else {
        const itemRight = itemLeft + itemWidth
        const scrollLeft = container.scrollLeft
        const scrollRight = scrollLeft + containerWidth

        if (itemLeft < scrollLeft) {
          container.scrollLeft = itemLeft
        } else if (itemRight > scrollRight) {
          container.scrollLeft = itemRight - containerWidth
        }
      }
    }
  }, [containerRef, focusedIndex, itemSelector, direction, center])
}
