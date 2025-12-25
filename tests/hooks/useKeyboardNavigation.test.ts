import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/preact'
import { useKeyboardNavigation, KEY_CODES } from '../../src/hooks/useKeyboardNavigation'

function fireKeyDown(keyCode: number) {
  const event = new KeyboardEvent('keydown', { keyCode, bubbles: true })
  document.dispatchEvent(event)
}

describe('useKeyboardNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls onUp when up arrow is pressed', () => {
    const onUp = vi.fn()
    renderHook(() => useKeyboardNavigation({ onUp }))

    fireKeyDown(KEY_CODES.UP)
    expect(onUp).toHaveBeenCalledTimes(1)
  })

  it('calls onDown when down arrow is pressed', () => {
    const onDown = vi.fn()
    renderHook(() => useKeyboardNavigation({ onDown }))

    fireKeyDown(KEY_CODES.DOWN)
    expect(onDown).toHaveBeenCalledTimes(1)
  })

  it('calls onLeft when left arrow is pressed', () => {
    const onLeft = vi.fn()
    renderHook(() => useKeyboardNavigation({ onLeft }))

    fireKeyDown(KEY_CODES.LEFT)
    expect(onLeft).toHaveBeenCalledTimes(1)
  })

  it('calls onRight when right arrow is pressed', () => {
    const onRight = vi.fn()
    renderHook(() => useKeyboardNavigation({ onRight }))

    fireKeyDown(KEY_CODES.RIGHT)
    expect(onRight).toHaveBeenCalledTimes(1)
  })

  it('calls onEnter when enter is pressed', () => {
    const onEnter = vi.fn()
    renderHook(() => useKeyboardNavigation({ onEnter }))

    fireKeyDown(KEY_CODES.ENTER)
    expect(onEnter).toHaveBeenCalledTimes(1)
  })

  it('calls onBack when back button is pressed', () => {
    const onBack = vi.fn()
    renderHook(() => useKeyboardNavigation({ onBack }))

    fireKeyDown(KEY_CODES.BACK)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('calls onBack when backspace is pressed', () => {
    const onBack = vi.fn()
    renderHook(() => useKeyboardNavigation({ onBack }))

    fireKeyDown(KEY_CODES.BACKSPACE)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('does not call handlers when disabled', () => {
    const onUp = vi.fn()
    const onDown = vi.fn()
    renderHook(() => useKeyboardNavigation({ onUp, onDown }, false))

    fireKeyDown(KEY_CODES.UP)
    fireKeyDown(KEY_CODES.DOWN)

    expect(onUp).not.toHaveBeenCalled()
    expect(onDown).not.toHaveBeenCalled()
  })

  it('does not call undefined handlers', () => {
    renderHook(() => useKeyboardNavigation({}))

    expect(() => {
      fireKeyDown(KEY_CODES.UP)
      fireKeyDown(KEY_CODES.DOWN)
      fireKeyDown(KEY_CODES.LEFT)
      fireKeyDown(KEY_CODES.RIGHT)
      fireKeyDown(KEY_CODES.ENTER)
      fireKeyDown(KEY_CODES.BACK)
    }).not.toThrow()
  })

  it('cleans up event listener on unmount', () => {
    const onUp = vi.fn()
    const { unmount } = renderHook(() => useKeyboardNavigation({ onUp }))

    unmount()

    fireKeyDown(KEY_CODES.UP)
    expect(onUp).not.toHaveBeenCalled()
  })
})
