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

  it('retries after onError', () => {
    const { container } = render(<PosterImage src="https://example.com/p.jpg" alt="Poster" />)
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('https://example.com/p.jpg')

    fireEvent.error(img)

    expect(img.getAttribute('src')).toBe('https://example.com/p.jpg')
  })

  it('retries when load stalls', () => {
    const { container } = render(<PosterImage src="https://example.com/slow.jpg" alt="Poster" />)
    const img = container.querySelector('img') as HTMLImageElement
    Object.defineProperty(img, 'complete', { configurable: true, get: () => false })
    Object.defineProperty(img, 'naturalWidth', { configurable: true, get: () => 0 })

    const removeSpy = vi.spyOn(img, 'removeAttribute')
    act(() => {
      vi.advanceTimersByTime(3500)
    })

    expect(removeSpy).toHaveBeenCalledWith('src')
    expect(img.getAttribute('src')).toBe('https://example.com/slow.jpg')
  })
})
