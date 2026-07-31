import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/preact'
import { useDecodedImage } from '../../src/hooks/useDecodedImage'

class FakeImage {
  static behavior: 'load' | 'error' | 'hang' = 'load'
  static instances: FakeImage[] = []
  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  decode() {
    return Promise.resolve()
  }

  set src(_value: string) {
    FakeImage.instances.push(this)
    if (FakeImage.behavior === 'load') {
      setTimeout(() => this.onload?.(), 10)
    } else if (FakeImage.behavior === 'error') {
      setTimeout(() => this.onerror?.(), 10)
    }
  }
}

describe('useDecodedImage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    FakeImage.behavior = 'load'
    FakeImage.instances = []
    vi.stubGlobal('Image', FakeImage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('stays not ready without a url', () => {
    const { result } = renderHook(() => useDecodedImage(null))
    expect(result.current).toBe(false)
  })

  it('becomes ready after the image loads and decodes', async () => {
    const { result } = renderHook(() => useDecodedImage('https://example.com/wide.jpg'))
    expect(result.current).toBe(false)

    await act(async () => {
      vi.advanceTimersByTime(50)
    })

    expect(result.current).toBe(true)
  })

  it('resets when the url changes', async () => {
    const { result, rerender } = renderHook(
      ({ url }) => useDecodedImage(url),
      { initialProps: { url: 'https://example.com/a.jpg' } }
    )
    await act(async () => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBe(true)

    rerender({ url: 'https://example.com/b.jpg' })
    expect(result.current).toBe(false)

    await act(async () => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBe(true)
  })

  it('retries failed loads before giving up', () => {
    FakeImage.behavior = 'error'
    const { result } = renderHook(() => useDecodedImage('https://example.com/broken.jpg'))

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    // Original attempt + 2 retries, then reveal anyway.
    expect(FakeImage.instances.length).toBe(3)
    expect(result.current).toBe(true)
  })

  it('reveals via the safety timeout when the load hangs', () => {
    FakeImage.behavior = 'hang'
    const { result } = renderHook(() => useDecodedImage('https://example.com/slow.jpg'))

    act(() => {
      vi.advanceTimersByTime(14000)
    })
    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current).toBe(true)
  })
})
