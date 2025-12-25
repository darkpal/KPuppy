import { useState, useEffect, useMemo } from 'preact/hooks'
import { useKeyboardNavigation } from './useKeyboardNavigation'

export interface NavigationOptions {
  itemCount: number
  columns: number
  onSelect?: (index: number) => void
  onBack?: () => void
  onLeftEdge?: () => void
  enabled?: boolean
}

export interface UseNavigationResult {
  focusedIndex: number
  setFocusedIndex: (index: number) => void
}

export function useNavigation(options: NavigationOptions): UseNavigationResult {
  const { itemCount, columns, onSelect, onBack, onLeftEdge, enabled = true } = options
  const [focusedIndex, setFocusedIndex] = useState(0)

  const rows = Math.ceil(itemCount / columns)
  const currentRow = Math.floor(focusedIndex / columns)
  const currentCol = focusedIndex % columns

  const handlers = useMemo(() => ({
    onLeft: () => {
      if (currentCol > 0) {
        setFocusedIndex(prev => prev - 1)
      } else if (onLeftEdge) {
        onLeftEdge()
      }
    },
    onRight: () => {
      if (currentCol < columns - 1 && focusedIndex < itemCount - 1) {
        setFocusedIndex(prev => prev + 1)
      }
    },
    onUp: () => {
      if (currentRow > 0) {
        setFocusedIndex(prev => prev - columns)
      }
    },
    onDown: () => {
      if (currentRow < rows - 1) {
        const targetIndex = focusedIndex + columns
        if (targetIndex < itemCount) {
          setFocusedIndex(targetIndex)
        } else {
          setFocusedIndex(itemCount - 1)
        }
      }
    },
    onEnter: onSelect ? () => onSelect(focusedIndex) : undefined,
    onBack,
  }), [currentCol, currentRow, columns, rows, focusedIndex, itemCount, onSelect, onBack, onLeftEdge])

  useKeyboardNavigation(handlers, enabled && itemCount > 0)

  useEffect(() => {
    if (focusedIndex >= itemCount && itemCount > 0) {
      setFocusedIndex(itemCount - 1)
    }
  }, [itemCount, focusedIndex])

  return {
    focusedIndex,
    setFocusedIndex
  }
}
