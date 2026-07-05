import { useState, useLayoutEffect, useCallback } from 'preact/hooks'

const GRID_GAP = 32
const GRID_PADDING = 32
const CARD_BORDER = 4
const SAFETY_PX = 4

export interface GridLayout {
  itemsPerRow: number
  cardWidth: number
}

export function useGridLayout(
  gridSelector: string,
  minCardWidth: number,
  triggerDeps: unknown[] = []
): GridLayout {
  const [layout, setLayout] = useState<GridLayout>({ itemsPerRow: 6, cardWidth: 0 })

  const updateLayout = useCallback(() => {
    const grid = document.querySelector(gridSelector) as HTMLElement | null
    if (!grid || grid.clientWidth === 0) return

    const contentWidth = grid.clientWidth - GRID_PADDING
    const minCellWidth = minCardWidth + CARD_BORDER + GRID_GAP
    const itemsPerRow = Math.max(1, Math.floor(contentWidth / minCellWidth))
    const cardWidth = Math.floor(contentWidth / itemsPerRow) - GRID_GAP - CARD_BORDER - SAFETY_PX

    setLayout(prev =>
      prev.itemsPerRow === itemsPerRow && prev.cardWidth === cardWidth
        ? prev
        : { itemsPerRow, cardWidth }
    )
  }, [gridSelector, minCardWidth])

  useLayoutEffect(() => {
    updateLayout()
    window.addEventListener('resize', updateLayout)
    return () => {
      window.removeEventListener('resize', updateLayout)
    }
  }, [updateLayout, ...triggerDeps])

  return layout
}
