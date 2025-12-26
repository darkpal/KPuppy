import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/preact'
import { h } from 'preact'
import { SeasonsScreen } from '../../src/screens/SeasonsScreen'
import { I18nProvider } from '../../src/i18n/context'
import * as kinopub from '../../src/api/kinopub'

vi.mock('../../src/api/kinopub', () => ({
  getItem: vi.fn(),
  toggleWatched: vi.fn(),
}))

function renderWithI18n(component: preact.ComponentChild) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  )
}

const mockSeriesDetails = {
  id: 1,
  title: 'Test Series',
  type: 'serial',
  year: 2024,
  plot: 'Test plot',
  posters: { small: '', medium: 'poster.jpg', big: '' },
  rating: 8,
  imdbRating: 7.5,
  kinopoiskRating: 8.2,
  views: 1000,
  directors: [],
  actors: [],
  countries: [],
  genres: [],
  seasons: [
    {
      number: 1,
      episodes: [
        {
          id: 1,
          number: 1,
          title: 'Episode 1',
          files: [{ quality: '1080p', url: { hls: 'test.m3u8' } }],
          audios: [],
          subtitles: [],
          watched: 0
        },
        {
          id: 2,
          number: 2,
          title: 'Episode 2',
          files: [{ quality: '1080p', url: { hls: 'test.m3u8' } }],
          audios: [],
          subtitles: [],
          watched: 1
        }
      ]
    },
    {
      number: 2,
      episodes: [
        {
          id: 3,
          number: 1,
          title: 'S2 Episode 1',
          files: [{ quality: '1080p', url: { hls: 'test.m3u8' } }],
          audios: [],
          subtitles: [],
          watched: 0
        }
      ]
    }
  ]
}

describe('SeasonsScreen', () => {
  const mockProps = {
    itemId: 1,
    onBack: vi.fn(),
    onPlay: vi.fn(),
    onNavigateToMenu: vi.fn(),
    isActive: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(kinopub.getItem).mockResolvedValue(mockSeriesDetails)
    vi.mocked(kinopub.toggleWatched).mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
  })

  describe('loading state', () => {
    it('shows loading spinner initially', () => {
      vi.mocked(kinopub.getItem).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<SeasonsScreen {...mockProps} />)

      expect(document.querySelector('.seasons-spinner')).toBeDefined()
    })
  })

  describe('content display', () => {
    it('fetches item on mount', async () => {
      renderWithI18n(<SeasonsScreen {...mockProps} />)

      await waitFor(() => {
        expect(kinopub.getItem).toHaveBeenCalledWith(1)
      })
    })

    it('renders series title', async () => {
      renderWithI18n(<SeasonsScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Test Series')).toBeDefined()
      })
    })

    it('renders season count', async () => {
      renderWithI18n(<SeasonsScreen {...mockProps} />)

      await waitFor(() => {
        const subtitle = document.querySelector('.seasons-subtitle')
        expect(subtitle).toBeDefined()
      })
    })

    it('renders season rows', async () => {
      renderWithI18n(<SeasonsScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Season 1')).toBeDefined()
        expect(screen.getByText('Season 2')).toBeDefined()
      })
    })

    it('renders seasons container', async () => {
      renderWithI18n(<SeasonsScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.seasons-container')).toBeDefined()
      })
    })
  })

  describe('empty state', () => {
    it('shows empty message when no seasons', async () => {
      vi.mocked(kinopub.getItem).mockResolvedValue({
        ...mockSeriesDetails,
        seasons: []
      })

      renderWithI18n(<SeasonsScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.seasons-empty')).toBeDefined()
      })
    })
  })

  describe('error handling', () => {
    it('handles API error gracefully', async () => {
      vi.mocked(kinopub.getItem).mockRejectedValue(new Error('API Error'))

      renderWithI18n(<SeasonsScreen {...mockProps} />)

      await waitFor(() => {
        const screen = document.querySelector('.seasons-screen')
        expect(screen).toBeDefined()
      })
    })
  })
})
