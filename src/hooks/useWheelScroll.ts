import { useEffect } from 'preact/hooks'
import { RefObject } from 'preact'

interface UseWheelScrollOptions {
  containerRef: RefObject<HTMLElement>
  direction?: 'vertical' | 'horizontal'
  /** Skip wheel handling when event originates inside this selector */
  ignoreSelector?: string
  enabled?: boolean
}

/**
 * Manual wheel scrolling for overflow:hidden containers.
 * Disables webOS Magic Remote edge auto-scroll while keeping wheel + D-pad scrolling.
 */
export function useWheelScroll({
  containerRef,
  direction = 'vertical',
  ignoreSelector,
  enabled = true
}: UseWheelScrollOptions): void {
  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled) return

    const onWheel = (event: WheelEvent) => {
      if (ignoreSelector) {
        const target = event.target as Element | null
        if (target?.closest?.(ignoreSelector)) return
      }

      const delta = direction === 'horizontal'
        ? (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY)
        : event.deltaY

      if (!delta) return

      if (direction === 'horizontal') {
        const max = container.scrollWidth - container.clientWidth
        if (max <= 0) return
        const next = Math.max(0, Math.min(max, container.scrollLeft + delta))
        if (next === container.scrollLeft) return
        event.preventDefault()
        event.stopPropagation()
        container.scrollLeft = next
      } else {
        const max = container.scrollHeight - container.clientHeight
        if (max <= 0) return
        const next = Math.max(0, Math.min(max, container.scrollTop + delta))
        if (next === container.scrollTop) return
        event.preventDefault()
        container.scrollTop = next
      }
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [containerRef, direction, ignoreSelector, enabled])
}
