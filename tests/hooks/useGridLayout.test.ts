import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/preact'
import { useGridLayout } from '../../src/hooks/useGridLayout'

function mockGrid(clientWidth: number) {
  vi.spyOn(document, 'querySelector').mockReturnValue({ clientWidth } as unknown as Element)
}

describe('useGridLayout', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps default layout when no grid element exists', () => {
    vi.spyOn(document, 'querySelector').mockReturnValue(null)

    const { result } = renderHook(() => useGridLayout('.category-grid', 240))

    expect(result.current.itemsPerRow).toBe(6)
    expect(result.current.cardWidth).toBe(0)
  })

  it('computes count from min card width and stretches cards to fill the row', () => {
    mockGrid(1490)

    const { result } = renderHook(() => useGridLayout('.category-grid', 240))

    expect(result.current.itemsPerRow).toBe(5)
    expect(result.current.cardWidth).toBe(Math.floor((1490 - 32) / 5) - 32 - 4 - 4)
  })

  it('fits more cards on wider containers', () => {
    mockGrid(1870)

    const { result } = renderHook(() => useGridLayout('.category-grid', 240))

    expect(result.current.itemsPerRow).toBe(6)
  })

  it('rows always fit inside the grid content box so cards never wrap', () => {
    mockGrid(1490)

    const { result } = renderHook(() => useGridLayout('.category-grid', 240))

    const { itemsPerRow, cardWidth } = result.current
    const rowWidth = itemsPerRow * (cardWidth + 4 + 32)
    expect(rowWidth).toBeLessThanOrEqual(1490 - 32)
  })

  it('ensures minimum of 1 item per row', () => {
    mockGrid(100)

    const { result } = renderHook(() => useGridLayout('.category-grid', 240))

    expect(result.current.itemsPerRow).toBe(1)
  })

  it('uses custom grid selector', () => {
    const querySelectorSpy = vi.spyOn(document, 'querySelector').mockReturnValue(null)

    renderHook(() => useGridLayout('.custom-grid', 240))

    expect(querySelectorSpy).toHaveBeenCalledWith('.custom-grid')
  })

  it('adds and removes resize event listener', () => {
    vi.spyOn(document, 'querySelector').mockReturnValue(null)
    const addEventSpy = vi.spyOn(window, 'addEventListener')
    const removeEventSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useGridLayout('.category-grid', 240))

    expect(addEventSpy).toHaveBeenCalledWith('resize', expect.any(Function))

    unmount()

    expect(removeEventSpy).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('recalculates when dependencies change', () => {
    const querySelectorSpy = vi.spyOn(document, 'querySelector').mockReturnValue(null)

    const { rerender } = renderHook(
      ({ deps }) => useGridLayout('.category-grid', 240, deps),
      { initialProps: { deps: [0] } }
    )

    const callCount = querySelectorSpy.mock.calls.length

    rerender({ deps: [5] })

    expect(querySelectorSpy.mock.calls.length).toBeGreaterThan(callCount)
  })
})
