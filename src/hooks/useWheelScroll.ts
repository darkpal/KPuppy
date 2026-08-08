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
    let animationStartPosition = targetPosition
    let animationDuration = 160
    let animationElapsed = 0
    let lastFrameTime = 0

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

    const stopAnimation = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      animationFrame = 0
      targetPosition = readPosition()
      container.classList.remove('kpuppy-wheel-scrolling')
    }

    const animate = (timestamp: number) => {
      // Content can resize while cards finish loading. Keep the target valid so
      // a browser-clamped scroll position cannot leave the RAF loop running.
      targetPosition = Math.max(0, Math.min(readMaxPosition(), targetPosition))
      // Use the browser's frame timestamp so a missed frame advances by its
      // real elapsed time instead of making the animation look half-speed.
      // Chrome 53 and test shims can occasionally repeat a timestamp, so a
      // nominal frame is the safe fallback rather than stalling the loop.
      const timestampDelta = timestamp - lastFrameTime
      const frameTime = lastFrameTime > 0 && Number.isFinite(timestampDelta) && timestampDelta >= 4
        ? Math.min(50, timestampDelta)
        : 1000 / 60
      lastFrameTime = timestamp
      animationElapsed += frameTime
      const progress = Math.min(1, animationElapsed / animationDuration)
      // Time-based quadratic ease-out avoids the repeated sub-pixel tail of an
      // exponential lerp, which old webOS Chromium can paint only every other
      // frame and make 60 Hz scrolling look closer to 30 Hz.
      const eased = 1 - (1 - progress) * (1 - progress)
      const next = animationStartPosition + (targetPosition - animationStartPosition) * eased

      if (progress >= 1 || Math.abs(targetPosition - next) < 0.5) {
        writePosition(targetPosition)
        animationFrame = 0
        container.classList.remove('kpuppy-wheel-scrolling')
        return
      }

      writePosition(next)
      animationFrame = window.requestAnimationFrame(animate)
    }

    const addDelta = (delta: number, max: number) => {
      const current = readPosition()
      if (!animationFrame) targetPosition = current
      targetPosition = Math.max(0, Math.min(max, targetPosition + delta))
      const distance = Math.abs(targetPosition - current)
      if (distance < 0.5) return false

      animationStartPosition = current
      animationDuration = Math.max(120, Math.min(220, 110 + distance * 0.45))
      animationElapsed = 0
      lastFrameTime = 0
      container.classList.add('kpuppy-wheel-scrolling')
      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(animate)
      }
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

    const onKeyDown = (event: KeyboardEvent) => {
      // D-pad navigation owns the next focus scroll. Stop any remaining wheel
      // ease-out first, otherwise its stale target can overwrite the position
      // selected by useScrollToFocused a frame later.
      if (event.keyCode >= 37 && event.keyCode <= 40) stopAnimation()
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      container.removeEventListener('wheel', onWheel)
      document.removeEventListener('keydown', onKeyDown, true)
      stopAnimation()
    }
  }, [containerRef, direction, ignoreSelector, enabled])
}
