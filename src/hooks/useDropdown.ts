import { useState, useCallback } from 'preact/hooks'

interface UseDropdownOptions {
  itemCount: number
  onSelect?: (index: number) => void
}

interface UseDropdownResult {
  isOpen: boolean
  focusedIndex: number
  open: () => void
  close: () => void
  toggle: () => void
  setFocusedIndex: (index: number) => void
  handleUp: () => void
  handleDown: () => void
  handleEnter: () => void
}

export function useDropdown({ itemCount, onSelect }: UseDropdownOptions): UseDropdownResult {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)

  const open = useCallback(() => {
    setIsOpen(true)
    setFocusedIndex(0)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggle = useCallback(() => {
    if (isOpen) {
      close()
    } else {
      open()
    }
  }, [isOpen, open, close])

  const handleUp = useCallback(() => {
    if (!isOpen || itemCount === 0) return
    setFocusedIndex(prev => Math.max(0, prev - 1))
  }, [isOpen, itemCount])

  const handleDown = useCallback(() => {
    if (!isOpen || itemCount === 0) return
    setFocusedIndex(prev => Math.min(itemCount - 1, prev + 1))
  }, [isOpen, itemCount])

  const handleEnter = useCallback(() => {
    if (!isOpen) return
    onSelect?.(focusedIndex)
    close()
  }, [isOpen, focusedIndex, onSelect, close])

  return {
    isOpen,
    focusedIndex,
    open,
    close,
    toggle,
    setFocusedIndex,
    handleUp,
    handleDown,
    handleEnter
  }
}
