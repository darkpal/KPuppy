import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/preact'
import { useNavigation } from '../../src/hooks/useNavigation'

function fireKeyDown(keyCode: number) {
  const event = new KeyboardEvent('keydown', {
    keyCode,
    bubbles: true,
    cancelable: true
  })
  document.dispatchEvent(event)
}

const KEY_LEFT = 37
const KEY_UP = 38
const KEY_RIGHT = 39
const KEY_DOWN = 40
const KEY_ENTER = 13
const KEY_BACK = 461

describe('useNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initial focus is index 0', () => {
    const { result } = renderHook(() =>
      useNavigation({ itemCount: 10, columns: 5 })
    )

    expect(result.current.focusedIndex).toBe(0)
  })

  describe('arrow key navigation', () => {
    it('moves right', () => {
      const { result } = renderHook(() =>
        useNavigation({ itemCount: 10, columns: 5 })
      )

      act(() => fireKeyDown(KEY_RIGHT))
      expect(result.current.focusedIndex).toBe(1)

      act(() => fireKeyDown(KEY_RIGHT))
      expect(result.current.focusedIndex).toBe(2)
    })

    it('moves left', () => {
      const { result } = renderHook(() =>
        useNavigation({ itemCount: 10, columns: 5 })
      )

      act(() => {
        result.current.setFocusedIndex(2)
      })

      act(() => fireKeyDown(KEY_LEFT))
      expect(result.current.focusedIndex).toBe(1)
    })

    it('moves down to next row', () => {
      const { result } = renderHook(() =>
        useNavigation({ itemCount: 10, columns: 5 })
      )

      act(() => fireKeyDown(KEY_DOWN))
      expect(result.current.focusedIndex).toBe(5)
    })

    it('moves up to previous row', () => {
      const { result } = renderHook(() =>
        useNavigation({ itemCount: 10, columns: 5 })
      )

      act(() => {
        result.current.setFocusedIndex(5)
      })

      act(() => fireKeyDown(KEY_UP))
      expect(result.current.focusedIndex).toBe(0)
    })

    it('does not move left at first column', () => {
      const { result } = renderHook(() =>
        useNavigation({ itemCount: 10, columns: 5 })
      )

      act(() => fireKeyDown(KEY_LEFT))
      expect(result.current.focusedIndex).toBe(0)
    })

    it('does not move right at last column', () => {
      const { result } = renderHook(() =>
        useNavigation({ itemCount: 10, columns: 5 })
      )

      act(() => {
        result.current.setFocusedIndex(4)
      })

      act(() => fireKeyDown(KEY_RIGHT))
      expect(result.current.focusedIndex).toBe(4)
    })

    it('does not move up at first row', () => {
      const { result } = renderHook(() =>
        useNavigation({ itemCount: 10, columns: 5 })
      )

      act(() => fireKeyDown(KEY_UP))
      expect(result.current.focusedIndex).toBe(0)
    })

    it('does not move down past last row', () => {
      const { result } = renderHook(() =>
        useNavigation({ itemCount: 10, columns: 5 })
      )

      act(() => {
        result.current.setFocusedIndex(5)
      })

      act(() => fireKeyDown(KEY_DOWN))
      expect(result.current.focusedIndex).toBe(5)
    })

    it('clamps to last item when moving down on incomplete row', () => {
      const { result } = renderHook(() =>
        useNavigation({ itemCount: 8, columns: 5 })
      )

      act(() => {
        result.current.setFocusedIndex(4)
      })

      act(() => fireKeyDown(KEY_DOWN))
      expect(result.current.focusedIndex).toBe(7)
    })
  })

  describe('selection', () => {
    it('calls onSelect with current index on Enter', () => {
      const onSelect = vi.fn()
      const { result } = renderHook(() =>
        useNavigation({ itemCount: 10, columns: 5, onSelect })
      )

      act(() => {
        result.current.setFocusedIndex(3)
      })

      act(() => fireKeyDown(KEY_ENTER))
      expect(onSelect).toHaveBeenCalledWith(3)
    })

    it('calls onBack on Back key', () => {
      const onBack = vi.fn()
      renderHook(() =>
        useNavigation({ itemCount: 10, columns: 5, onBack })
      )

      act(() => fireKeyDown(KEY_BACK))
      expect(onBack).toHaveBeenCalled()
    })
  })

  describe('enabled state', () => {
    it('does not respond to keys when disabled', () => {
      const onSelect = vi.fn()
      const { result } = renderHook(() =>
        useNavigation({ itemCount: 10, columns: 5, onSelect, enabled: false })
      )

      act(() => fireKeyDown(KEY_RIGHT))
      expect(result.current.focusedIndex).toBe(0)

      act(() => fireKeyDown(KEY_ENTER))
      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('item count changes', () => {
    it('adjusts focus when item count decreases', () => {
      const { result, rerender } = renderHook(
        ({ itemCount }) => useNavigation({ itemCount, columns: 5 }),
        { initialProps: { itemCount: 10 } }
      )

      act(() => {
        result.current.setFocusedIndex(8)
      })

      rerender({ itemCount: 5 })

      expect(result.current.focusedIndex).toBe(4)
    })
  })
})
