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

    let animationFrame = 0
    let targetPosition = direction === 'horizontal'
      ? container.scrollLeft
      : container.scrollTop

    const readPosition = () => direction === 'horizontal'
      ? container.scrollLeft
      : container.scrollTop

    const readMaxPosition = () => direction === 'horizontal'
      ? container.scrollWidth - container.clientWidth
      : container.scrollHeight - container.clientHeight

    const writePosition = (value: number) => {
      if (direction === 'horizontal') {
        container.scrollLeft = value
      } else {
        container.scrollTop = value
      }
    }

    const animate = () => {
      // Content can resize while cards finish loading. Keep the target valid so
      // a browser-clamped scroll position cannot leave the RAF loop running.
      targetPosition = Math.max(0, Math.min(readMaxPosition(), targetPosition))
      const current = readPosition()
      const remaining = targetPosition - current
      if (Math.abs(remaining) < 0.5) {
        writePosition(targetPosition)
        animationFrame = 0
        return
      }

      // Accumulated ease-out keeps discrete Magic Remote wheel ticks smooth,
      // while a new tick simply extends the current animation target.
      writePosition(current + remaining * 0.32)
      animationFrame = window.requestAnimationFrame(animate)
    }

    const addDelta = (delta: number, max: number) => {
      if (!animationFrame) targetPosition = readPosition()
      targetPosition = Math.max(0, Math.min(max, targetPosition + delta))
      if (Math.abs(targetPosition - readPosition()) < 0.5) return false
      if (!animationFrame) animationFrame = window.requestAnimationFrame(animate)
      return true
    }

    const onWheel = (event: WheelEvent) => {
      if (ignoreSelector) {
        const target = event.target as Element | null
        if (target?.closest?.(ignoreSelector)) return
      }

      if (direction === 'horizontal') {
        // Only real horizontal gestures (trackpad swipe). Vertical mouse-wheel
        // must bubble so the parent page can scroll (home shelves).
        if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
        const delta = event.deltaX
        if (!delta) return
        const max = container.scrollWidth - container.clientWidth
        if (max <= 0) return
        if (!addDelta(delta, max)) return
        event.preventDefault()
        event.stopPropagation()
        return
      }

      const delta = event.deltaY
      if (!delta) return
      const max = container.scrollHeight - container.clientHeight
      if (max <= 0) return
      if (!addDelta(delta, max)) return
      event.preventDefault()
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', onWheel)
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
    }
  }, [containerRef, direction, ignoreSelector, enabled])
}
