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

    expect(img.getAttribute('src')).toContain('https://example.com/p.jpg?_kpuppy_retry=')
  })

  it('retries a stalled load up to the retry limit', () => {
    const { container } = render(<PosterImage src="https://example.com/slow.jpg" alt="Poster" />)
    const img = container.querySelector('img') as HTMLImageElement
    Object.defineProperty(img, 'complete', { configurable: true, get: () => false })
    Object.defineProperty(img, 'naturalWidth', { configurable: true, get: () => 0 })

    const removeSpy = vi.spyOn(img, 'removeAttribute')
    act(() => {
      vi.advanceTimersByTime(7000)
    })

    expect(removeSpy).toHaveBeenCalledTimes(2)
    expect(img.getAttribute('src')).toContain('https://example.com/slow.jpg?_kpuppy_retry=')

    act(() => {
      vi.advanceTimersByTime(3500)
    })

    expect(removeSpy).toHaveBeenCalledTimes(3)

    act(() => {
      vi.advanceTimersByTime(3500)
    })

    expect(removeSpy).toHaveBeenCalledTimes(3)
  })

  it('reveals hero art only after a complete decode', async () => {
    const { container } = render(
      <PosterImage
        src="https://example.com/hero.jpg"
        alt="Hero"
        class="hero"
        loading="eager"
        revealWhenDecoded
      />
    )
    const img = container.querySelector('img') as HTMLImageElement
    Object.defineProperty(img, 'naturalWidth', { configurable: true, get: () => 1920 })
    Object.defineProperty(img, 'naturalHeight', { configurable: true, get: () => 1080 })
    Object.defineProperty(img, 'decode', { configurable: true, value: vi.fn().mockResolvedValue(undefined) })

    expect(img.classList.contains('poster-image-loading')).toBe(true)
    expect(img.getAttribute('decoding')).toBe('sync')

    await act(async () => {
      fireEvent.load(img)
      await Promise.resolve()
    })

    expect(img.classList.contains('poster-image-ready')).toBe(true)
  })
})
