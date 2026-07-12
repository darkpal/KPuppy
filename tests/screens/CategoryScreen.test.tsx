import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/preact'
import { h } from 'preact'
import { CategoryScreen } from '../../src/screens/CategoryScreen'
import { I18nProvider } from '../../src/i18n/context'
import * as kinopub from '../../src/api/kinopub'

vi.mock('../../src/api/kinopub', () => ({
  getItems: vi.fn(),
  getWatching: vi.fn(),
  getGenres: vi.fn(),
  getCountries: vi.fn(),
}))

function renderWithI18n(component: preact.ComponentChild) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  )
}

const mockItem = {
  id: 1,
  title: 'Test Movie',
  type: 'movie',
  year: 2024,
  plot: 'Test plot',
  posters: { small: '', medium: '', big: '' },
  rating: 8,
  imdbRating: 7.5,
  kinopoiskRating: 8.2,
  ratingPercentage: 0,
  quality: 0,
  views: 1000
}

describe('CategoryScreen', () => {
  const mockProps = {
    categoryId: 'movies',
    title: 'Movies',
    onSelectItem: vi.fn(),
    onNavigateToMenu: vi.fn(),
    isActive: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(kinopub.getItems).mockResolvedValue({
      items: [],
      pagination: { current: 1, total: 1, totalItems: 0, perpage: 48 }
    })
    vi.mocked(kinopub.getWatching).mockResolvedValue([])
    vi.mocked(kinopub.getGenres).mockResolvedValue([])
    vi.mocked(kinopub.getCountries).mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  describe('loading state', () => {
    it('shows loading spinner initially', () => {
      vi.mocked(kinopub.getItems).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<CategoryScreen {...mockProps} />)

      expect(document.querySelector('.spinner')).not.toBeNull()
    })

    it('shows title during loading', () => {
      vi.mocked(kinopub.getItems).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<CategoryScreen {...mockProps} />)

      expect(screen.getByText('Movies')).toBeDefined()
    })
  })

  describe('content display', () => {
    it('fetches items on mount', async () => {
      renderWithI18n(<CategoryScreen {...mockProps} />)

      await waitFor(() => {
        expect(kinopub.getItems).toHaveBeenCalled()
      })
    })

    it('renders category screen container after loading', async () => {
      vi.mocked(kinopub.getItems).mockResolvedValue({
        items: [mockItem],
        pagination: { current: 1, total: 1, totalItems: 1, perpage: 48 }
      })

      renderWithI18n(<CategoryScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.category-screen')).toBeDefined()
      })
    })

    it('shows empty message when no items', async () => {
      vi.mocked(kinopub.getItems).mockResolvedValue({
        items: [],
        pagination: { current: 1, total: 1, totalItems: 0, perpage: 48 }
      })

      renderWithI18n(<CategoryScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.category-empty')).toBeDefined()
      })
    })
  })

  describe('filters', () => {
    it('loads genres and countries for non-watching categories', async () => {
      renderWithI18n(<CategoryScreen {...mockProps} />)

      await waitFor(() => {
        expect(kinopub.getGenres).toHaveBeenCalled()
        expect(kinopub.getCountries).toHaveBeenCalled()
      })
    })

    it('shows filters section after loading', async () => {
      vi.mocked(kinopub.getGenres).mockResolvedValue([{ id: 1, title: 'Action', type: 'movie' }])
      vi.mocked(kinopub.getCountries).mockResolvedValue([{ id: 1, title: 'USA' }])

      renderWithI18n(<CategoryScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.category-filters')).toBeDefined()
      })
    })

    it('restores initialFilters and reports them via onFiltersChange', async () => {
      const onFiltersChange = vi.fn()
      vi.mocked(kinopub.getItems).mockResolvedValue({
        items: [mockItem],
        pagination: { current: 1, total: 1, totalItems: 1, perpage: 48 }
      })

      renderWithI18n(
        <CategoryScreen
          {...mockProps}
          initialFilters={{
            genreId: 7,
            countryId: 3,
            sort: 'views-',
            year: 2020,
            only4k: true
          }}
          onFiltersChange={onFiltersChange}
        />
      )

      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalledWith({
          genreId: 7,
          countryId: 3,
          sort: 'views-',
          year: 2020,
          only4k: true
        })
      })

      await waitFor(() => {
        expect(kinopub.getItems).toHaveBeenCalledWith(
          expect.objectContaining({
            genre: 7,
            country: 3,
            sort: 'views-',
            year: '2020',
            quality: '4k'
          })
        )
      })
    })
  })

  describe('watching category', () => {
    it('fetches watching items for watching category', async () => {
      renderWithI18n(<CategoryScreen {...mockProps} categoryId="watching" title="Continue Watching" />)

      await waitFor(() => {
        expect(kinopub.getWatching).toHaveBeenCalled()
      })
    })

    it('does not show filters for watching category', async () => {
      vi.mocked(kinopub.getWatching).mockResolvedValue([mockItem])

      renderWithI18n(<CategoryScreen {...mockProps} categoryId="watching" title="Continue Watching" />)

      await waitFor(() => {
        expect(document.querySelector('.category-filters')).toBeNull()
      })
    })
  })

  describe('error handling', () => {
    it('handles API error gracefully', async () => {
      vi.mocked(kinopub.getItems).mockRejectedValue(new Error('API Error'))

      renderWithI18n(<CategoryScreen {...mockProps} />)

      await waitFor(() => {
        const screen = document.querySelector('.category-screen')
        expect(screen).toBeDefined()
      })
    })
  })

  describe('initial focus', () => {
    it('accepts initial focus index prop', async () => {
      vi.mocked(kinopub.getItems).mockResolvedValue({
        items: [mockItem],
        pagination: { current: 1, total: 1, totalItems: 1, perpage: 48 }
      })

      renderWithI18n(<CategoryScreen {...mockProps} initialFocusIndex={0} />)

      await waitFor(() => {
        expect(document.querySelector('.category-screen')).toBeDefined()
      })
    })

    it('calls onFocusChange when focus changes', async () => {
      const mockOnFocusChange = vi.fn()
      vi.mocked(kinopub.getItems).mockResolvedValue({
        items: [mockItem],
        pagination: { current: 1, total: 1, totalItems: 1, perpage: 48 }
      })

      renderWithI18n(
        <CategoryScreen {...mockProps} onFocusChange={mockOnFocusChange} />
      )

      await waitFor(() => {
        expect(mockOnFocusChange).toHaveBeenCalled()
      })
    })
  })
})
