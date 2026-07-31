import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/preact'
import { h } from 'preact'
import { ItemScreen } from '../../src/screens/ItemScreen'
import { I18nProvider } from '../../src/i18n/context'
import * as kinopub from '../../src/api/kinopub'
import * as storage from '../../src/storage'

vi.mock('../../src/api/kinopub', () => ({
  getItem: vi.fn(),
  getMediaLinks: vi.fn().mockResolvedValue({ files: [], subtitles: [] }),
  getSimilarItems: vi.fn(),
  getBookmarkFolders: vi.fn(),
  getItemFolders: vi.fn(),
  addToBookmark: vi.fn(),
  removeFromBookmark: vi.fn(),
  toggleWatchlist: vi.fn(),
  isItemInWatchlist: vi.fn(),
}))

vi.mock('../../src/storage', () => ({
  getLocalSettings: vi.fn(() => ({ defaultQuality: 'auto', playerType: 'native', language: 'en' })),
}))

function renderWithI18n(component: preact.ComponentChild) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  )
}

const mockMovieDetails = {
  id: 1,
  title: 'Test Movie',
  type: 'movie',
  year: 2024,
  plot: 'A test movie plot',
  posters: { small: '', medium: 'poster.jpg', big: '', wide: 'wide.jpg' },
  rating: 8,
  imdbRating: 7.5,
  kinopoiskRating: 8.2,
  ratingPercentage: 84,
  quality: 0,
  views: 1000,
  directors: [{ id: 1, name: 'Test Director' }],
  actors: [{ id: 1, name: 'Test Actor' }],
  countries: [{ id: 1, title: 'USA' }],
  genres: [{ id: 1, title: 'Action', type: 'movie' }],
  videos: [{
    number: 1,
    title: 'Main',
    files: [{ quality: '1080p', url: { hls: 'test.m3u8' } }],
    audios: [],
    subtitles: []
  }],
  duration: { average: 120, total: 120 },
}

const mockSeriesDetails = {
  ...mockMovieDetails,
  id: 2,
  title: 'Test Series',
  type: 'serial',
  seasons: [{
    number: 1,
    episodes: [{
      id: 1,
      number: 1,
      title: 'Episode 1',
      files: [{ quality: '1080p', url: { hls: 'test.m3u8' } }],
      audios: [],
      subtitles: [],
      watched: 0
    }]
  }]
}

describe('ItemScreen', () => {
  const mockProps = {
    itemId: 1,
    onBack: vi.fn(),
    onPlay: vi.fn(),
    onPlayTrailer: vi.fn(),
    onSelectSeries: vi.fn(),
    onSelectItem: vi.fn(),
    onNavigateToMenu: vi.fn(),
    isActive: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(kinopub.getItem).mockResolvedValue(mockMovieDetails)
    vi.mocked(kinopub.getMediaLinks).mockResolvedValue({ files: [], subtitles: [] })
    vi.mocked(kinopub.getSimilarItems).mockResolvedValue([])
    vi.mocked(kinopub.isItemInWatchlist).mockResolvedValue(false)
  })

  afterEach(() => {
    cleanup()
  })

  describe('loading state', () => {
    it('shows loading spinner initially', () => {
      vi.mocked(kinopub.getItem).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<ItemScreen {...mockProps} />)

      expect(document.querySelector('.spinner')).not.toBeNull()
    })

    it('paints preview immediately without a full-screen spinner', () => {
      vi.mocked(kinopub.getItem).mockImplementation(() => new Promise(() => {}))
      const preview = {
        id: 1,
        title: 'Preview Movie',
        type: 'movie',
        year: 2024,
        plot: '',
        posters: { small: '', medium: 'preview.jpg', big: '', wide: '' },
        rating: 0,
        imdbRating: 0,
        kinopoiskRating: 0,
        ratingPercentage: 0,
        quality: 0,
        views: 0,
        genres: []
      }

      renderWithI18n(<ItemScreen {...mockProps} preview={preview} />)

      expect(document.querySelector('.loading-container .spinner')).toBeNull()
      expect(screen.getAllByText('Preview Movie').length).toBeGreaterThan(0)
      expect(document.querySelector('.item-banner-image')).toBeNull()
      expect(document.querySelector('.item-banner-loading .spinner')).not.toBeNull()
    })

    it('renders the card without waiting for supplemental media links', async () => {
      vi.mocked(kinopub.getMediaLinks).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getAllByText('Test Movie')).toHaveLength(2)
      })
      expect(document.querySelector('.loading-container .spinner')).toBeNull()
    })
  })

  describe('movie display', () => {
    it('fetches item on mount', async () => {
      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        expect(kinopub.getItem).toHaveBeenCalledWith(1)
      })
    })

    it('renders item title', async () => {
      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getAllByText('Test Movie')).toHaveLength(2)
      })
    })

    it('renders item year', async () => {
      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('2024')).toBeDefined()
      })
    })

    it('renders item plot', async () => {
      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getAllByText('A test movie plot')).toHaveLength(2)
      })
    })

    it('localizes duration and item type', async () => {
      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('2 h')).toBeDefined()
        expect(screen.getByText('Movie')).toBeDefined()
      })
    })

    it('opens full information with Down and returns with Up', async () => {
      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => expect(screen.getByText('Full information')).toBeDefined())

      fireEvent.keyDown(document, { keyCode: 40 })
      expect(document.querySelector('.item-content')?.classList.contains('details-expanded')).toBe(true)
      expect(document.querySelector('.item-details-page')?.getAttribute('aria-hidden')).toBe('false')

      fireEvent.keyDown(document, { keyCode: 38 })
      expect(document.querySelector('.item-content')?.classList.contains('details-expanded')).toBe(false)
    })

    it('opens full information with the Magic Remote wheel', async () => {
      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => expect(screen.getByText('Full information')).toBeDefined())

      fireEvent.wheel(document, { deltaY: 120 })
      expect(document.querySelector('.item-content')?.classList.contains('details-expanded')).toBe(true)

      fireEvent.wheel(document, { deltaY: -120 })
      expect(document.querySelector('.item-content')?.classList.contains('details-expanded')).toBe(false)
    })

    it('loads the backdrop through the retryable poster image', async () => {
      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        const backdrop = document.querySelector('.item-banner-image') as HTMLImageElement
        expect(backdrop).not.toBeNull()
        expect(backdrop.getAttribute('src')).toBe('wide.jpg')
        expect(backdrop.getAttribute('loading')).toBe('eager')
      })
    })

    it('prefers the wide poster once the full item is loaded', async () => {
      vi.mocked(kinopub.getItem).mockResolvedValue({
        ...mockMovieDetails,
        posters: {
          small: 'small.jpg',
          medium: 'medium.jpg',
          big: 'big.jpg',
          wide: 'wide.jpg'
        }
      })

      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        const backdrop = document.querySelector('.item-banner-image') as HTMLImageElement
        expect(backdrop.getAttribute('src')).toBe('wide.jpg')
      })
    })

    it('keeps list preview posters out of the banner until wide arrives', async () => {
      let resolveItem!: (value: typeof mockMovieDetails) => void
      vi.mocked(kinopub.getItem).mockImplementation(
        () => new Promise(resolve => { resolveItem = resolve })
      )
      const preview = {
        id: 1,
        title: 'Preview Movie',
        type: 'movie',
        year: 2024,
        plot: '',
        posters: { small: '', medium: 'preview-medium.jpg', big: '', wide: '' },
        rating: 0,
        imdbRating: 0,
        kinopoiskRating: 0,
        ratingPercentage: 0,
        quality: 0,
        views: 0,
        genres: []
      }

      renderWithI18n(<ItemScreen {...mockProps} preview={preview} />)

      expect(document.querySelector('.item-banner-image')).toBeNull()
      expect(document.querySelector('.item-banner-loading .spinner')).not.toBeNull()

      resolveItem({
        ...mockMovieDetails,
        posters: {
          small: 'small.jpg',
          medium: 'medium.jpg',
          big: 'big.jpg',
          wide: 'wide.jpg'
        }
      })

      await waitFor(() => {
        expect(
          (document.querySelector('.item-banner-image') as HTMLImageElement).getAttribute('src')
        ).toBe('wide.jpg')
      })
      expect(document.querySelector('.item-banner-loading')).toBeNull()
    })

    it('does not fall back to medium when wide is missing', async () => {
      vi.mocked(kinopub.getItem).mockResolvedValue({
        ...mockMovieDetails,
        posters: {
          small: 'small.jpg',
          medium: 'medium.jpg',
          big: 'big.jpg',
          wide: ''
        }
      })

      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getAllByText('Test Movie').length).toBeGreaterThan(0)
      })
      expect(document.querySelector('.item-banner-image')).toBeNull()
    })

    it('renders play button for movies', async () => {
      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Play')).toBeDefined()
      })
    })

    it('renders bookmarks button', async () => {
      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Add to Bookmarks')).toBeDefined()
      })
    })

    it('renders genre tags', async () => {
      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Action')).toBeDefined()
      })
    })

    it('renders country, director, and cast in the main summary', async () => {
      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        const summaryDetails = document.querySelector('.item-summary-details')
        expect(summaryDetails?.textContent).toContain('Country:USA')
        expect(summaryDetails?.textContent).toContain('Director:Test Director')
        expect(summaryDetails?.textContent).toContain('Cast:Test Actor')
      })
    })

    it('uses a font-independent chevron for the full information indicator', async () => {
      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        const icon = document.querySelector('.item-scroll-hint-icon')
        expect(icon).not.toBeNull()
        expect(icon?.textContent).toBe('')
      })
    })
  })

  describe('series display', () => {
    it('renders seasons button for series', async () => {
      vi.mocked(kinopub.getItem).mockResolvedValue(mockSeriesDetails)

      renderWithI18n(<ItemScreen {...mockProps} itemId={2} />)

      await waitFor(() => {
        expect(screen.getByText(/Seasons/)).toBeDefined()
      })
    })

    it('checks watchlist status for series', async () => {
      vi.mocked(kinopub.getItem).mockResolvedValue(mockSeriesDetails)

      renderWithI18n(<ItemScreen {...mockProps} itemId={2} />)

      await waitFor(() => {
        expect(kinopub.isItemInWatchlist).toHaveBeenCalledWith(2)
      })
    })
  })

  describe('similar items', () => {
    it('fetches similar items', async () => {
      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        expect(kinopub.getSimilarItems).toHaveBeenCalledWith(1)
      })
    })
  })

  describe('error handling', () => {
    it('shows error message on API failure', async () => {
      vi.mocked(kinopub.getItem).mockRejectedValue(new Error('API Error'))

      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeDefined()
      })
    })
  })

  describe('ratings display', () => {
    it('shows KP rating when available', async () => {
      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        const ratingElement = document.querySelector('.item-rating-kp')
        expect(ratingElement).toBeDefined()
      })
    })

    it('shows IMDb rating when available', async () => {
      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        const ratingElement = document.querySelector('.item-rating-imdb')
        expect(ratingElement).toBeDefined()
      })
    })

    it('shows KinoPub rating from the same field as home cards', async () => {
      renderWithI18n(<ItemScreen {...mockProps} />)

      await waitFor(() => {
        const ratingElement = document.querySelector('.item-rating-kinopub')
        expect(ratingElement?.textContent).toContain('84%')
        expect(ratingElement?.querySelector('.item-rating-icon')).not.toBeNull()
      })
    })
  })
})
