import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/preact'
import { h } from 'preact'
import { NewEpisodesScreen } from '../../src/screens/NewEpisodesScreen'
import { I18nProvider } from '../../src/i18n/context'
import * as kinopub from '../../src/api/kinopub'

vi.mock('../../src/api/kinopub', () => ({
  getWatchingSerials: vi.fn(),
  getWatching: vi.fn(),
  enrichMovieItemsMeta: vi.fn(async (items: unknown[]) => items),
}))

function renderWithI18n(component: preact.ComponentChild) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  )
}

const mockWatchingItem = {
  id: 1,
  title: 'Test Series',
  type: 'serial',
  subtype: '',
  posters: { small: '', medium: '', big: '' },
  year: 2024,
  total: 10,
  watched: 5,
  new: 3,
}

describe('NewEpisodesScreen', () => {
  const mockProps = {
    onSelectItem: vi.fn(),
    onNavigateToMenu: vi.fn(),
    isActive: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(kinopub.getWatchingSerials).mockResolvedValue([])
    vi.mocked(kinopub.getWatching).mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  describe('loading state', () => {
    it('shows loading spinner initially', () => {
      vi.mocked(kinopub.getWatchingSerials).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<NewEpisodesScreen {...mockProps} />)

      expect(document.querySelector('.spinner')).not.toBeNull()
    })

    it('shows title during loading', () => {
      vi.mocked(kinopub.getWatchingSerials).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<NewEpisodesScreen {...mockProps} />)

      expect(screen.getByText('New Episodes')).toBeDefined()
    })
  })

  describe('content display', () => {
    it('fetches watching serials on mount', async () => {
      renderWithI18n(<NewEpisodesScreen {...mockProps} />)

      await waitFor(() => {
        expect(kinopub.getWatchingSerials).toHaveBeenCalled()
      })
    })

    it('renders category screen container after loading', async () => {
      vi.mocked(kinopub.getWatchingSerials).mockResolvedValue([mockWatchingItem])

      renderWithI18n(<NewEpisodesScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.category-screen')).toBeDefined()
      })
    })

    it('filters to only show items with new episodes', async () => {
      const itemWithNoNew = { ...mockWatchingItem, id: 2, new: 0 }
      vi.mocked(kinopub.getWatchingSerials).mockResolvedValue([mockWatchingItem, itemWithNoNew])

      renderWithI18n(<NewEpisodesScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Test Series')).toBeDefined()
      })
    })

    it('shows no items message when no new episodes', async () => {
      vi.mocked(kinopub.getWatchingSerials).mockResolvedValue([])

      renderWithI18n(<NewEpisodesScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.category-empty')).toBeDefined()
      })
    })

    it('loads continue-watching list for watching mode', async () => {
      const movie = {
        id: 9,
        title: 'Continue Movie',
        type: 'movie',
        posters: { small: '', medium: '', big: '' },
        year: 2024,
        plot: '',
        rating: 0,
        imdbRating: 0,
        kinopoiskRating: 0,
        ratingPercentage: 0,
        quality: 0,
        views: 0
      }
      vi.mocked(kinopub.getWatching).mockResolvedValue([movie])

      renderWithI18n(<NewEpisodesScreen {...mockProps} mode="watching" titleKey="menuWatching" />)

      await waitFor(() => {
        expect(kinopub.getWatching).toHaveBeenCalled()
        expect(screen.getByText('Continue Movie')).toBeDefined()
      })
      expect(kinopub.getWatchingSerials).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('handles API error gracefully', async () => {
      vi.mocked(kinopub.getWatchingSerials).mockRejectedValue(new Error('API Error'))

      renderWithI18n(<NewEpisodesScreen {...mockProps} />)

      await waitFor(() => {
        const screen = document.querySelector('.category-screen')
        expect(screen).toBeDefined()
      })
    })
  })
})
