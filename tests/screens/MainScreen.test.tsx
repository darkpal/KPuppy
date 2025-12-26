import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/preact'
import { h } from 'preact'
import { MainScreen } from '../../src/screens/MainScreen'
import { I18nProvider } from '../../src/i18n/context'
import * as kinopub from '../../src/api/kinopub'

vi.mock('../../src/api/kinopub', () => ({
  getItems: vi.fn(),
  getWatching: vi.fn(),
}))

function renderWithI18n(component: preact.ComponentChild) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  )
}

const mockMovie = {
  id: 1,
  title: 'Test Movie',
  type: 'movie',
  year: 2024,
  plot: 'Test plot',
  posters: { small: '', medium: '', big: '' },
  rating: 8,
  imdbRating: 7.5,
  kinopoiskRating: 8.2,
  views: 1000
}

describe('MainScreen', () => {
  const mockProps = {
    onLogout: vi.fn(),
    onSelectItem: vi.fn(),
    onNavigateToMenu: vi.fn(),
    isActive: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(kinopub.getWatching).mockResolvedValue([])
    vi.mocked(kinopub.getItems).mockResolvedValue({
      items: [],
      pagination: { current: 1, total: 1, totalItems: 0, perpage: 10 }
    })
  })

  afterEach(() => {
    cleanup()
  })

  describe('loading state', () => {
    it('shows loading spinner initially', async () => {
      vi.mocked(kinopub.getWatching).mockImplementation(() => new Promise(() => {}))
      vi.mocked(kinopub.getItems).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<MainScreen {...mockProps} />)

      expect(document.querySelector('.main-spinner')).toBeDefined()
      expect(screen.getByText('Loading content...')).toBeDefined()
    })
  })

  describe('content display', () => {
    it('renders rows container after loading', async () => {
      vi.mocked(kinopub.getWatching).mockResolvedValue([mockMovie])
      vi.mocked(kinopub.getItems).mockResolvedValue({
        items: [mockMovie],
        pagination: { current: 1, total: 1, totalItems: 1, perpage: 10 }
      })

      renderWithI18n(<MainScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.rows-container')).toBeDefined()
      })
    })

    it('fetches watching items on mount', async () => {
      vi.mocked(kinopub.getWatching).mockResolvedValue([mockMovie])

      renderWithI18n(<MainScreen {...mockProps} />)

      await waitFor(() => {
        expect(kinopub.getWatching).toHaveBeenCalled()
      })
    })

    it('fetches category items on mount', async () => {
      renderWithI18n(<MainScreen {...mockProps} />)

      await waitFor(() => {
        expect(kinopub.getItems).toHaveBeenCalled()
      })
    })
  })

  describe('error handling', () => {
    it('handles API error gracefully', async () => {
      vi.mocked(kinopub.getWatching).mockRejectedValue(new Error('API Error'))
      vi.mocked(kinopub.getItems).mockRejectedValue(new Error('API Error'))

      renderWithI18n(<MainScreen {...mockProps} />)

      await waitFor(() => {
        const mainScreen = document.querySelector('.main-screen')
        expect(mainScreen).toBeDefined()
      })
    })
  })

  describe('initial focus', () => {
    it('accepts initial focus row prop', async () => {
      vi.mocked(kinopub.getWatching).mockResolvedValue([mockMovie])
      vi.mocked(kinopub.getItems).mockResolvedValue({
        items: [mockMovie],
        pagination: { current: 1, total: 1, totalItems: 1, perpage: 10 }
      })

      renderWithI18n(<MainScreen {...mockProps} initialFocusRow={1} initialFocusCol={0} />)

      await waitFor(() => {
        expect(document.querySelector('.rows-container')).toBeDefined()
      })
    })

    it('calls onFocusChange when focus changes', async () => {
      const mockOnFocusChange = vi.fn()
      vi.mocked(kinopub.getWatching).mockResolvedValue([mockMovie])
      vi.mocked(kinopub.getItems).mockResolvedValue({
        items: [mockMovie],
        pagination: { current: 1, total: 1, totalItems: 1, perpage: 10 }
      })

      renderWithI18n(
        <MainScreen {...mockProps} onFocusChange={mockOnFocusChange} />
      )

      await waitFor(() => {
        expect(mockOnFocusChange).toHaveBeenCalled()
      })
    })
  })
})
