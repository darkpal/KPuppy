import { useState, useEffect, useCallback } from 'preact/hooks'

const DEFAULT_ITEMS_PER_ROW = 8
const DEFAULT_GAP = 32
const CALCULATION_DELAY = 100

export function useItemsPerRow(
  gridSelector: string = '.category-grid',
  triggerDeps: unknown[] = []
): number {
  const [itemsPerRow, setItemsPerRow] = useState(DEFAULT_ITEMS_PER_ROW)

  const updateItemsPerRow = useCallback(() => {
    const grid = document.querySelector(gridSelector)
    if (grid && grid.children.length > 0) {
      const firstChild = grid.children[0] as HTMLElement
      const gridWidth = grid.clientWidth
      const itemWidth = firstChild.offsetWidth
      const count = Math.floor((gridWidth + DEFAULT_GAP) / (itemWidth + DEFAULT_GAP))
      setItemsPerRow(Math.max(1, count))
    }
  }, [gridSelector])

  useEffect(() => {
    const timer = setTimeout(updateItemsPerRow, CALCULATION_DELAY)
    window.addEventListener('resize', updateItemsPerRow)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateItemsPerRow)
    }
  }, [updateItemsPerRow, ...triggerDeps])

  return itemsPerRow
}
