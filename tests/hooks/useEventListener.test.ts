import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/preact'
import { useEventListener } from '../../src/hooks/useEventListener'

describe('useEventListener', () => {
  it('adds event listener on mount', () => {
    const handler = vi.fn()
    renderHook(() => useEventListener('keydown', handler))

    document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13 }))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('removes event listener on unmount', () => {
    const handler = vi.fn()
    const { unmount } = renderHook(() => useEventListener('keydown', handler))

    unmount()

    document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13 }))
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not add listener when disabled', () => {
    const handler = vi.fn()
    renderHook(() => useEventListener('keydown', handler, false))

    document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13 }))
    expect(handler).not.toHaveBeenCalled()
  })

  it('updates handler without re-registering listener', () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    const { rerender } = renderHook(
      ({ handler }) => useEventListener('keydown', handler),
      { initialProps: { handler: handler1 } }
    )

    document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13 }))
    expect(handler1).toHaveBeenCalledTimes(1)

    rerender({ handler: handler2 })

    document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13 }))
    expect(handler1).toHaveBeenCalledTimes(1)
    expect(handler2).toHaveBeenCalledTimes(1)
  })

  it('re-registers when enabled changes', () => {
    const handler = vi.fn()

    const { rerender } = renderHook(
      ({ enabled }) => useEventListener('keydown', handler, enabled),
      { initialProps: { enabled: false } }
    )

    document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13 }))
    expect(handler).not.toHaveBeenCalled()

    rerender({ enabled: true })

    document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13 }))
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
