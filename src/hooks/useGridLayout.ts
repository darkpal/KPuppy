import { useState, useLayoutEffect, useCallback, useRef } from 'preact/hooks'
import { RefObject } from 'preact'

const GRID_GAP = 32
const GRID_PADDING = 32
const CARD_BORDER = 4
const SAFETY_PX = 4

export interface GridLayout {
  itemsPerRow: number
  cardWidth: number
}

function computeLayout(clientWidth: number, minCardWidth: number): GridLayout {
  const contentWidth = Math.max(0, clientWidth - GRID_PADDING)
  const minCellWidth = minCardWidth + CARD_BORDER + GRID_GAP
  const itemsPerRow = Math.max(1, Math.floor(contentWidth / minCellWidth) || 1)
  const cardWidth = Math.floor(contentWidth / itemsPerRow) - GRID_GAP - CARD_BORDER - SAFETY_PX
  return { itemsPerRow, cardWidth }
}

export function useGridLayout(
  gridSelector: string,
  minCardWidth: number,
  triggerDeps: unknown[] = [],
  /** Prefer measuring this node (avoids missing/querySelector races). */
  containerRef?: RefObject<HTMLElement>
): GridLayout {
  const [layout, setLayout] = useState<GridLayout>({ itemsPerRow: 6, cardWidth: 0 })
  const minCardWidthRef = useRef(minCardWidth)
  minCardWidthRef.current = minCardWidth

  const updateLayout = useCallback(() => {
    const fromRef = containerRef?.current
    const grid = (fromRef
      || document.querySelector(gridSelector)) as HTMLElement | null
    if (!grid || grid.clientWidth === 0) return false

    const next = computeLayout(grid.clientWidth, minCardWidthRef.current)
    setLayout(prev =>
      prev.itemsPerRow === next.itemsPerRow && prev.cardWidth === next.cardWidth
        ? prev
        : next
    )
    return true
  }, [gridSelector, containerRef])

  useLayoutEffect(() => {
    updateLayout()
    let timeoutId = 0
    // Search grid mounts only after results arrive; measure again after paint.
    const raf = window.requestAnimationFrame(() => {
      if (!updateLayout()) {
        timeoutId = window.setTimeout(() => { updateLayout() }, 50)
      }
    })
    window.addEventListener('resize', updateLayout)
    window.addEventListener('kpuppy-content-resize', updateLayout)
    return () => {
      window.cancelAnimationFrame(raf)
      if (timeoutId) window.clearTimeout(timeoutId)
      window.removeEventListener('resize', updateLayout)
      window.removeEventListener('kpuppy-content-resize', updateLayout)
    }
  }, [updateLayout, ...triggerDeps])

  return layout
}
