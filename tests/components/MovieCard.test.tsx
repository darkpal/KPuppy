import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { h } from 'preact'
import { MovieCard, cardTitleForLanguage } from '../../src/components/MovieCard'
import { MovieItem } from '../../src/api/kinopub'
import { I18nProvider } from '../../src/i18n/context'

function renderCard(ui: preact.VNode) {
  return render(<I18nProvider>{ui}</I18nProvider>)
}

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
    ratingPercentage: 82,
    quality: 0,
    views: 1000,
    ...overrides
  }
}

describe('MovieCard', () => {
  beforeEach(() => {
    localStorage.setItem('kpuppy_language', 'ru')
  })

  describe('rendering', () => {
    it('renders movie title', () => {
      const movie = createMockMovie({ title: 'Inception' })

      renderCard(<MovieCard movie={movie} focused={false} />)

      expect(screen.getByText('Inception')).toBeDefined()
    })

    it('renders movie year', () => {
      const movie = createMockMovie({ year: 2010 })

      renderCard(<MovieCard movie={movie} focused={false} />)

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

      renderCard(<MovieCard movie={movie} focused={false} />)

      const img = screen.getByAltText(movie.title)
      expect(img.getAttribute('src')).toBe('medium.jpg')
    })

    it('falls back to big poster if medium not available', () => {
      const movie = createMockMovie({
        posters: {
          small: 'small.jpg',
          big: 'big.jpg'
        }
      })

      renderCard(<MovieCard movie={movie} focused={false} />)

      const img = screen.getByAltText(movie.title)
      expect(img.getAttribute('src')).toBe('big.jpg')
    })

    it('falls back to small poster if others not available', () => {
      const movie = createMockMovie({
        posters: {
          small: 'small.jpg'
        }
      })

      renderCard(<MovieCard movie={movie} focused={false} />)

      const img = screen.getByAltText(movie.title)
      expect(img.getAttribute('src')).toBe('small.jpg')
    })
  })

  describe('ratings', () => {
    it('renders IMDb rating when present', () => {
      const movie = createMockMovie({ imdbRating: 8.0, kinopoiskRating: 7.3, ratingPercentage: 82 })

      renderCard(<MovieCard movie={movie} focused={false} />)

      expect(screen.getByText('8.0')).toBeDefined()
      expect(screen.getByText('7.3')).toBeDefined()
      expect(screen.getByText('82%')).toBeDefined()
    })

    it('hides ratings bar when all ratings are zero', () => {
      const movie = createMockMovie({ imdbRating: 0, kinopoiskRating: 0, ratingPercentage: 0 })

      const { container } = renderCard(<MovieCard movie={movie} focused={false} />)

      expect(container.querySelector('.movie-card-ratings')).toBeNull()
    })
  })

  describe('title', () => {
    it('picks localized title for Russian UI', () => {
      expect(cardTitleForLanguage('Интерстеллар / Interstellar', 'ru')).toBe('Интерстеллар')
      expect(cardTitleForLanguage('Валериан/Valerian', 'ru')).toBe('Валериан')
    })

    it('picks original title for English and German UI', () => {
      expect(cardTitleForLanguage('Интерстеллар / Interstellar', 'en')).toBe('Interstellar')
      expect(cardTitleForLanguage('Интерстеллар / Interstellar', 'de')).toBe('Interstellar')
      expect(cardTitleForLanguage('Валериан/Valerian', 'en')).toBe('Valerian')
    })

    it('handles title without separator', () => {
      expect(cardTitleForLanguage('Simple Title', 'en')).toBe('Simple Title')
      expect(cardTitleForLanguage('Simple Title', 'ru')).toBe('Simple Title')
    })

    it('renders localized title when app language is Russian', () => {
      localStorage.setItem('kpuppy_language', 'ru')
      const movie = createMockMovie({ title: 'Интерстеллар / Interstellar' })

      renderCard(<MovieCard movie={movie} focused={false} />)

      expect(screen.getByText('Интерстеллар')).toBeDefined()
      expect(screen.queryByText('Interstellar')).toBeNull()
    })

    it('renders original title when app language is English', () => {
      localStorage.setItem('kpuppy_language', 'en')
      const movie = createMockMovie({ title: 'Интерстеллар / Interstellar' })

      renderCard(<MovieCard movie={movie} focused={false} />)

      expect(screen.getByText('Interstellar')).toBeDefined()
      expect(screen.queryByText('Интерстеллар')).toBeNull()
    })
  })

  describe('poster badges', () => {
    it('shows HD badge for 1080p quality', () => {
      const movie = createMockMovie({ quality: 1080 })
      renderCard(<MovieCard movie={movie} focused={false} />)
      expect(screen.getByText('HD')).toBeDefined()
    })

    it('shows 4K badge for 2160p quality', () => {
      const movie = createMockMovie({ quality: 2160 })
      renderCard(<MovieCard movie={movie} focused={false} />)
      expect(screen.getByText('4K')).toBeDefined()
    })

    it('shows year on poster', () => {
      const movie = createMockMovie({ year: 2010 })
      renderCard(<MovieCard movie={movie} focused={false} />)
      expect(screen.getByText('2010')).toBeDefined()
    })
  })

  describe('episode info', () => {
    it('shows episode badge when episodeInfo provided', () => {
      const movie = createMockMovie()
      const episodeInfo = { season: 2, episode: 5, title: 'Episode Title' }

      renderCard(<MovieCard movie={movie} focused={false} episodeInfo={episodeInfo} />)

      expect(screen.getByText('S2E5')).toBeDefined()
    })

    it('does not show badge without episodeInfo', () => {
      const movie = createMockMovie()

      renderCard(<MovieCard movie={movie} focused={false} />)

      expect(screen.queryByText(/S\d+E\d+/)).toBeNull()
    })

    it('prefers episode thumbnail over poster when provided', () => {
      const movie = createMockMovie()
      const episodeInfo = { season: 1, episode: 3, title: 'Episode Title', thumbnail: 'episode-thumb.jpg' }

      renderCard(<MovieCard movie={movie} focused={false} episodeInfo={episodeInfo} />)

      const img = screen.getByAltText(movie.title)
      expect(img.getAttribute('src')).toBe('episode-thumb.jpg')
    })

    it('falls back to poster when episodeInfo has no thumbnail', () => {
      const movie = createMockMovie()
      const episodeInfo = { season: 1, episode: 3, title: 'Episode Title' }

      renderCard(<MovieCard movie={movie} focused={false} episodeInfo={episodeInfo} />)

      const img = screen.getByAltText(movie.title)
      expect(img.getAttribute('src')).toBe('http://example.com/medium.jpg')
    })
  })

  describe('interactions', () => {
    it('calls onSelect when clicked', () => {
      const movie = createMockMovie()
      const onSelect = vi.fn()

      renderCard(<MovieCard movie={movie} focused={false} onSelect={onSelect} />)

      fireEvent.click(screen.getByText('Test Movie').closest('.movie-card')!)

      expect(onSelect).toHaveBeenCalledTimes(1)
    })

    it('does not throw when clicked without onSelect', () => {
      const movie = createMockMovie()

      renderCard(<MovieCard movie={movie} focused={false} />)

      expect(() => {
        fireEvent.click(screen.getByText('Test Movie').closest('.movie-card')!)
      }).not.toThrow()
    })
  })

  describe('focus state', () => {
    it('applies focused class when focused', () => {
      const movie = createMockMovie()

      const { container } = renderCard(<MovieCard movie={movie} focused={true} />)

      const card = container.firstChild as HTMLElement
      expect(card.classList.contains('focused')).toBe(true)
    })

    it('does not apply focused class when not focused', () => {
      const movie = createMockMovie()

      const { container } = renderCard(<MovieCard movie={movie} focused={false} />)

      const card = container.firstChild as HTMLElement
      expect(card.classList.contains('focused')).toBe(false)
    })
  })
})
