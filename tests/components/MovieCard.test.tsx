import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { h } from 'preact'
import { MovieCard } from '../../src/components/MovieCard'
import { MovieItem } from '../../src/api/kinopub'

function createMockMovie(overrides?: Partial<MovieItem>): MovieItem {
  return {
    id: 1,
    title: 'Test Movie',
    type: 'movie',
    year: 2023,
    plot: 'A test movie plot',
    posters: {
      small: 'http://example.com/small.jpg',
      medium: 'http://example.com/medium.jpg',
      big: 'http://example.com/big.jpg'
    },
    rating: 8,
    imdbRating: 7.5,
    kinopoiskRating: 8,
    views: 1000,
    ...overrides
  }
}

describe('MovieCard', () => {
  describe('rendering', () => {
    it('renders movie title', () => {
      const movie = createMockMovie({ title: 'Inception' })

      render(<MovieCard movie={movie} focused={false} />)

      expect(screen.getByText('Inception')).toBeDefined()
    })

    it('renders movie year', () => {
      const movie = createMockMovie({ year: 2010 })

      render(<MovieCard movie={movie} focused={false} />)

      expect(screen.getByText('2010')).toBeDefined()
    })

    it('renders poster image with medium size priority', () => {
      const movie = createMockMovie({
        posters: {
          small: 'small.jpg',
          medium: 'medium.jpg',
          big: 'big.jpg'
        }
      })

      render(<MovieCard movie={movie} focused={false} />)

      const img = screen.getByRole('img')
      expect(img.getAttribute('src')).toBe('medium.jpg')
    })

    it('falls back to big poster if medium not available', () => {
      const movie = createMockMovie({
        posters: {
          small: 'small.jpg',
          big: 'big.jpg'
        }
      })

      render(<MovieCard movie={movie} focused={false} />)

      const img = screen.getByRole('img')
      expect(img.getAttribute('src')).toBe('big.jpg')
    })

    it('falls back to small poster if others not available', () => {
      const movie = createMockMovie({
        posters: {
          small: 'small.jpg'
        }
      })

      render(<MovieCard movie={movie} focused={false} />)

      const img = screen.getByRole('img')
      expect(img.getAttribute('src')).toBe('small.jpg')
    })
  })

  describe('split title', () => {
    it('splits title with / separator', () => {
      const movie = createMockMovie({ title: 'Интерстеллар / Interstellar' })

      render(<MovieCard movie={movie} focused={false} />)

      expect(screen.getByText('Интерстеллар')).toBeDefined()
      expect(screen.getByText('Interstellar')).toBeDefined()
    })

    it('handles title without separator', () => {
      const movie = createMockMovie({ title: 'Simple Title' })

      render(<MovieCard movie={movie} focused={false} />)

      expect(screen.getByText('Simple Title')).toBeDefined()
    })
  })

  describe('episode info', () => {
    it('shows episode badge when episodeInfo provided', () => {
      const movie = createMockMovie()
      const episodeInfo = { season: 2, episode: 5, title: 'Episode Title' }

      render(<MovieCard movie={movie} focused={false} episodeInfo={episodeInfo} />)

      expect(screen.getByText('S2E5')).toBeDefined()
    })

    it('does not show badge without episodeInfo', () => {
      const movie = createMockMovie()

      render(<MovieCard movie={movie} focused={false} />)

      expect(screen.queryByText(/S\d+E\d+/)).toBeNull()
    })
  })

  describe('interactions', () => {
    it('calls onSelect when clicked', () => {
      const movie = createMockMovie()
      const onSelect = vi.fn()

      render(<MovieCard movie={movie} focused={false} onSelect={onSelect} />)

      fireEvent.click(screen.getByRole('img').parentElement!)

      expect(onSelect).toHaveBeenCalledTimes(1)
    })

    it('does not throw when clicked without onSelect', () => {
      const movie = createMockMovie()

      render(<MovieCard movie={movie} focused={false} />)

      expect(() => {
        fireEvent.click(screen.getByRole('img').parentElement!)
      }).not.toThrow()
    })
  })

  describe('focus state', () => {
    it('applies focused styles when focused', () => {
      const movie = createMockMovie()

      const { container } = render(<MovieCard movie={movie} focused={true} />)

      const card = container.firstChild as HTMLElement
      expect(card.style.border).toContain('rgb(229, 9, 20)')
    })

    it('does not apply focused styles when not focused', () => {
      const movie = createMockMovie()

      const { container } = render(<MovieCard movie={movie} focused={false} />)

      const card = container.firstChild as HTMLElement
      expect(card.style.border).toContain('transparent')
    })
  })
})
