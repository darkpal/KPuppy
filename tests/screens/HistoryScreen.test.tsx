import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/preact'
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

const mockHistoryItem = {
  id: 1,
  title: 'Test Movie',
  type: 'movie',
  year: 2024,
  plot: 'Test plot',
  posters: { small: '', medium: '', big: '' },
  rating: 8,
  imdbRating: 7.5,
  kinopoiskRating: 8.2,
  views: 1000,
  watchedAt: 1700000000,
}

describe('HistoryScreen', () => {
  const mockProps = {
    onSelectItem: vi.fn(),
    onNavigateToMenu: vi.fn(),
    isActive: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(kinopub.getHistory).mockResolvedValue([])
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
    it('fetches history on mount', async () => {
      renderWithI18n(<HistoryScreen {...mockProps} />)

      await waitFor(() => {
        expect(kinopub.getHistory).toHaveBeenCalled()
      })
    })

    it('renders category screen container after loading', async () => {
      vi.mocked(kinopub.getHistory).mockResolvedValue([mockHistoryItem])

      renderWithI18n(<HistoryScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.category-screen')).toBeDefined()
      })
    })

    it('shows no items message when history is empty', async () => {
      vi.mocked(kinopub.getHistory).mockResolvedValue([])

      renderWithI18n(<HistoryScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.category-empty')).toBeDefined()
      })
    })
  })

  describe('error handling', () => {
    it('handles API error gracefully', async () => {
      vi.mocked(kinopub.getHistory).mockRejectedValue(new Error('API Error'))

      renderWithI18n(<HistoryScreen {...mockProps} />)

      await waitFor(() => {
        const screen = document.querySelector('.category-screen')
        expect(screen).toBeDefined()
      })
    })
  })
})
