import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/preact'
import { useDebounce } from '../../src/hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('does not update value before delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'updated' })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toBe('initial')
  })

  it('updates value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'updated' })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current).toBe('updated')
  })

  it('resets timer on value change', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'first' })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    rerender({ value: 'second' })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current).toBe('second')
  })

  it('uses custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 1000),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'updated' })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current).toBe('updated')
  })

  it('works with objects', () => {
    const obj1 = { foo: 'bar' }
    const obj2 = { foo: 'baz' }

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: obj1 } }
    )

    expect(result.current).toBe(obj1)

    rerender({ value: obj2 })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current).toBe(obj2)
  })
})
