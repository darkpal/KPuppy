import { KeyboardHandlers } from './useKeyboardNavigation'

export interface GridNavigationOptions {
  itemCount: number
  itemsPerRow: number
  focusedIndex: number
  setFocusedIndex: (index: number) => void
  onSelect?: (index: number) => void
  onLeftEdge?: () => void
  onTopEdge?: () => void
  onBottomEdge?: () => void
}

export function createGridNavigationHandlers({
  itemCount,
  itemsPerRow,
  focusedIndex,
  setFocusedIndex,
  onSelect,
  onLeftEdge,
  onTopEdge,
  onBottomEdge
}: GridNavigationOptions): KeyboardHandlers {
  return {
    onLeft: () => {
      if (focusedIndex % itemsPerRow === 0) {
        onLeftEdge?.()
      } else {
        setFocusedIndex(Math.max(0, focusedIndex - 1))
      }
    },
    onRight: () => setFocusedIndex(Math.min(itemCount - 1, focusedIndex + 1)),
    onUp: () => {
      if (focusedIndex < itemsPerRow && onTopEdge) {
        onTopEdge()
      } else {
        setFocusedIndex(Math.max(0, focusedIndex - itemsPerRow))
      }
    },
    onDown: () => {
      const newIndex = focusedIndex + itemsPerRow
      if (newIndex < itemCount) {
        setFocusedIndex(newIndex)
      } else {
        onBottomEdge?.()
      }
    },
    onEnter: () => onSelect?.(focusedIndex)
  }
}
