import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/preact'
import { h } from 'preact'
import { ItemScreen } from '../../src/screens/ItemScreen'
import { I18nProvider } from '../../src/i18n/context'
import * as kinopub from '../../src/api/kinopub'
import * as storage from '../../src/storage'

vi.mock('../../src/api/kinopub', () => ({
  getItem: vi.fn(),
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
  posters: { small: '', medium: 'poster.jpg', big: '' },
  rating: 8,
  imdbRating: 7.5,
  kinopoiskRating: 8.2,
  ratingPercentage: 0,
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
        expect(screen.getByText('Test Movie')).toBeDefined()
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
        expect(screen.getByText('A test movie plot')).toBeDefined()
      })
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
  })
})
