import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/preact'
import { useItemsPerRow } from '../../src/hooks/useItemsPerRow'

describe('useItemsPerRow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns default value (8) when no grid element exists', () => {
    vi.spyOn(document, 'querySelector').mockReturnValue(null)

    const { result } = renderHook(() => useItemsPerRow())

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current).toBe(8)
  })

  it('returns default value when grid has no children', () => {
    const mockGrid = {
      children: { length: 0 },
      clientWidth: 800
    }
    vi.spyOn(document, 'querySelector').mockReturnValue(mockGrid as unknown as Element)

    const { result } = renderHook(() => useItemsPerRow())

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current).toBe(8)
  })

  it('calculates items per row based on grid and item dimensions', () => {
    const mockFirstChild = {
      offsetWidth: 150
    }
    const mockGrid = {
      children: [mockFirstChild],
      clientWidth: 800
    }
    Object.defineProperty(mockGrid.children, 'length', { value: 1 })

    vi.spyOn(document, 'querySelector').mockReturnValue(mockGrid as unknown as Element)

    const { result } = renderHook(() => useItemsPerRow())

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current).toBe(4)
  })

  it('uses custom grid selector', () => {
    const querySelectorSpy = vi.spyOn(document, 'querySelector').mockReturnValue(null)

    renderHook(() => useItemsPerRow('.custom-grid'))

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(querySelectorSpy).toHaveBeenCalledWith('.custom-grid')
  })

  it('adds and removes resize event listener', () => {
    vi.spyOn(document, 'querySelector').mockReturnValue(null)
    const addEventSpy = vi.spyOn(window, 'addEventListener')
    const removeEventSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useItemsPerRow())

    expect(addEventSpy).toHaveBeenCalledWith('resize', expect.any(Function))

    unmount()

    expect(removeEventSpy).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('recalculates when dependencies change', () => {
    const querySelectorSpy = vi.spyOn(document, 'querySelector').mockReturnValue(null)

    const { rerender } = renderHook(
      ({ deps }) => useItemsPerRow('.category-grid', deps),
      { initialProps: { deps: [0] } }
    )

    act(() => {
      vi.advanceTimersByTime(100)
    })

    const callCount = querySelectorSpy.mock.calls.length

    rerender({ deps: [5] })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(querySelectorSpy.mock.calls.length).toBeGreaterThan(callCount)
  })

  it('ensures minimum of 1 item per row', () => {
    const mockFirstChild = {
      offsetWidth: 1000
    }
    const mockGrid = {
      children: [mockFirstChild],
      clientWidth: 100
    }
    Object.defineProperty(mockGrid.children, 'length', { value: 1 })

    vi.spyOn(document, 'querySelector').mockReturnValue(mockGrid as unknown as Element)

    const { result } = renderHook(() => useItemsPerRow())

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current).toBe(1)
  })
})
