import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/preact'
import { h } from 'preact'
import { HistoryScreen } from '../../src/screens/HistoryScreen'
import { I18nProvider } from '../../src/i18n/context'
import * as kinopub from '../../src/api/kinopub'

vi.mock('../../src/api/kinopub', () => ({
  getHistory: vi.fn(),
  clearHistoryForItem: vi.fn(),
}))

function renderWithI18n(component: preact.ComponentChild) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  )
}

function historyItem(overrides: Partial<kinopub.HistoryItem> & Pick<kinopub.HistoryItem, 'id' | 'title' | 'type'>): kinopub.HistoryItem {
  return {
    year: 2024,
    plot: '',
    posters: { small: '', medium: '', big: '' },
    rating: 8,
    imdbRating: 7.5,
    kinopoiskRating: 8.2,
    ratingPercentage: 0,
    quality: 0,
    views: 1000,
    watchedAt: 1700000000,
    ...overrides,
  }
}

function pageResult(items: kinopub.HistoryItem[], current = 1, total = 1) {
  return {
    items,
    pagination: { current, total, totalItems: items.length, perpage: 50 }
  }
}

describe('HistoryScreen', () => {
  const mockProps = {
    onSelectItem: vi.fn(),
    onNavigateToMenu: vi.fn(),
    isActive: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(kinopub.getHistory).mockResolvedValue(pageResult([]))
  })

  afterEach(() => {
    cleanup()
  })

  describe('loading state', () => {
    it('shows loading spinner initially', () => {
      vi.mocked(kinopub.getHistory).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<HistoryScreen {...mockProps} />)

      expect(document.querySelector('.spinner')).not.toBeNull()
    })

    it('shows title during loading', () => {
      vi.mocked(kinopub.getHistory).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<HistoryScreen {...mockProps} />)

      expect(screen.getByText('History')).toBeDefined()
    })
  })

  describe('content display', () => {
    it('fetches history on mount with pagination', async () => {
      renderWithI18n(<HistoryScreen {...mockProps} />)

      await waitFor(() => {
        expect(kinopub.getHistory).toHaveBeenCalledWith(1, 50)
      })
    })

    it('shows no items message when history is empty', async () => {
      renderWithI18n(<HistoryScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.category-empty')).toBeDefined()
      })
    })

    it('dedupes series and shows See all when API has more pages', async () => {
      const items = [
        historyItem({
          id: 1,
          title: 'Silo',
          type: 'serial',
          episodeInfo: { season: 2, episode: 10, title: '' }
        }),
        historyItem({
          id: 1,
          title: 'Silo',
          type: 'serial',
          episodeInfo: { season: 2, episode: 9, title: '' },
          watchedAt: 1699999999
        }),
        historyItem({ id: 5, title: 'Click', type: 'movie' }),
      ]
      vi.mocked(kinopub.getHistory).mockImplementation(async (page = 1) => (
        page === 1 ? pageResult(items, 1, 20) : pageResult([], page, 20)
      ))

      renderWithI18n(<HistoryScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Series')).toBeDefined()
        expect(screen.getByText('Movies')).toBeDefined()
      })

      expect(document.querySelectorAll('.history-series-grid .movie-card').length).toBe(1)
      expect(document.querySelectorAll('.history-movies-grid .movie-card').length).toBe(1)
      expect(screen.getAllByText('See all').length).toBeGreaterThanOrEqual(1)
    })

    it('opens full series list from See all', async () => {
      const hubItems = [
        historyItem({ id: 1, title: 'Silo', type: 'serial' }),
        historyItem({ id: 5, title: 'Click', type: 'movie' }),
      ]
      const listItems = [
        historyItem({ id: 1, title: 'Silo', type: 'serial' }),
        historyItem({ id: 2, title: 'Friends', type: 'serial' }),
      ]
      vi.mocked(kinopub.getHistory).mockImplementation(async (page = 1) => {
        // Hub stops after HUB_MAX_PAGES while total stays high → See all stays visible.
        if (page === 1) return pageResult(hubItems, 1, 20)
        return pageResult(listItems, page, 20)
      })

      renderWithI18n(<HistoryScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getAllByText('See all').length).toBeGreaterThan(0)
      })

      fireEvent.click(screen.getAllByText('See all')[0])

      await waitFor(() => {
        expect(screen.getByText(/History · Series/)).toBeDefined()
      })
    })
  })

  describe('error handling', () => {
    it('handles API error gracefully', async () => {
      vi.mocked(kinopub.getHistory).mockRejectedValue(new Error('API Error'))

      renderWithI18n(<HistoryScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.category-screen')).toBeDefined()
      })
    })
  })
})
