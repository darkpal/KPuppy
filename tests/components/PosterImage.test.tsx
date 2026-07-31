import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/preact'
import { PosterImage } from '../../src/components/PosterImage'

describe('PosterImage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing without src', () => {
    const { container } = render(<PosterImage src="" alt="x" />)
    expect(container.querySelector('img')).toBeNull()
  })

  it('keeps the clean URL on first paint', () => {
    const { container } = render(<PosterImage src="https://example.com/p.jpg" alt="Poster" />)
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('https://example.com/p.jpg')
  })

  it('retries after onError with a cache-busting query', () => {
    const { container } = render(<PosterImage src="https://example.com/p.jpg" alt="Poster" />)
    const img = container.querySelector('img') as HTMLImageElement

    fireEvent.error(img)

    expect(img.getAttribute('src')).toContain('https://example.com/p.jpg?_kpuppy_retry=')
  })

  it('does not stall-retry a successfully loaded image', () => {
    const { container } = render(<PosterImage src="https://example.com/ok.jpg" alt="Poster" />)
    const img = container.querySelector('img') as HTMLImageElement
    Object.defineProperty(img, 'complete', { configurable: true, get: () => true })
    Object.defineProperty(img, 'naturalWidth', { configurable: true, get: () => 200 })

    const removeSpy = vi.spyOn(img, 'removeAttribute')
    act(() => {
      vi.advanceTimersByTime(6000)
    })

    expect(removeSpy).not.toHaveBeenCalled()
    expect(img.getAttribute('src')).toBe('https://example.com/ok.jpg')
  })

  it('retries a stalled empty load up to the retry limit', () => {
    const { container } = render(<PosterImage src="https://example.com/slow.jpg" alt="Poster" />)
    const img = container.querySelector('img') as HTMLImageElement
    Object.defineProperty(img, 'complete', { configurable: true, get: () => false })
    Object.defineProperty(img, 'naturalWidth', { configurable: true, get: () => 0 })

    const removeSpy = vi.spyOn(img, 'removeAttribute')
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(removeSpy).toHaveBeenCalled()
    expect(img.getAttribute('src')).toContain('_kpuppy_retry=')
  })
})
